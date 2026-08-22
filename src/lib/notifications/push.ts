import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { activity } from "@/lib/badgeActivity";
import { isNative, platformName, safeNative } from "@/lib/native/platform";
import { storage } from "@/lib/native/storage";

/**
 * Firebase Cloud Messaging registration.
 *
 * Runs only on native builds. Every failure path (denied permission, missing
 * google-services.json, offline Supabase) is swallowed so notifications can
 * never crash the app.
 */

const DEVICE_KEY = "nc:device-id";
const TOKEN_KEY = "nc:push-token";

let listenersWired = false;
let navigate: ((path: string) => void) | null = null;

/** Lets the router handle notification taps (deep links) without importing it here. */
export function setPushNavigator(fn: ((path: string) => void) | null): void {
  navigate = fn;
}

/** Navigates to an in-app path when a notification (push or local) is tapped. */
export function notificationNavigate(path: string | undefined | null): void {
  if (path && path.startsWith("/")) navigate?.(path);
}
let currentUserId: string | null = null;

/**
 * Android 8+ drops any notification whose channel does not exist. This is the
 * ONE channel used for remote FCM pushes: the AndroidManifest default channel
 * meta-data, the FCM payload's android.notification.channel_id and the
 * foreground re-post below all use this exact id, at HIGH importance.
 * Local reminders deliberately use a separate channel (see ./index.ts).
 */
export const PUSH_CHANNEL_ID = "push-alerts";

export async function ensurePushChannel(): Promise<void> {
  await safeNative(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: "Push alerts",
      description: "Daily support messages sent from the server",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
  });
  // The same channel must exist for the LocalNotifications plugin so
  // foreground pushes can be re-posted on it.
  await safeNative(async () => {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: "Push alerts",
      description: "Daily support messages sent from the server",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
  });
}

async function deviceId(): Promise<string> {
  const existing = await storage.get<string | null>(DEVICE_KEY, null);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await storage.set(DEVICE_KEY, generated);
  return generated;
}

/** Upserts the token for this user+device, reactivating an existing row. */
async function saveToken(userId: string, token: string): Promise<void> {
  try {
    const device = await deviceId();
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform: platformName(),
        device_id: device,
        is_active: true,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,token" },
    );
    if (error) throw error;
    // Any other token previously stored for this device is stale.
    await supabase
      .from("push_tokens")
      .update({ is_active: false } as never)
      .eq("user_id", userId)
      .eq("device_id", device)
      .neq("token", token);
    await storage.set(TOKEN_KEY, token);
  } catch (error) {
    analytics.error(error, { stage: "push_token_save" });
  }
}

async function wireListeners(): Promise<void> {
  if (listenersWired) return;
  listenersWired = true;
  await safeNative(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    // A fresh set of listeners only — repeated registration attempts must not
    // stack duplicates (that caused ghost/duplicate handling).
    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", (value) => {
      if (import.meta.env.DEV) console.info("[push] FCM token", value.value);
      if (currentUserId) void saveToken(currentUserId, value.value);
    });
    await PushNotifications.addListener("registrationError", (error) => {
      analytics.error(error, { stage: "push_registration" });
    });
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      analytics.track("push_received", { title: notification.title ?? "" });
      // Android does not render a push while the app is in the foreground, so
      // re-post it as a local notification on the same push channel.
      void showForegroundPush(notification);
    });
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      analytics.track("push_opened");
      activity.notificationReturn();
      const data = (action.notification?.data ?? {}) as Record<string, string>;
      const target = data['deep_link'] || data['deepLink'];
      if (target && target.startsWith("/")) navigate?.(target);
    });
  });
}

/**
 * Requests permission (Android 13+ POST_NOTIFICATIONS), registers with FCM and
 * stores the resulting token against the signed-in user.
 * Returns the token, or null when unsupported/denied/failed.
 */
export async function registerPush(userId: string): Promise<string | null> {
  if (!isNative() || !userId) return null;
  currentUserId = userId;
  await ensurePushChannel();
  await wireListeners();

  const token = await safeNative<string | null>(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== "granted") return null;

    return new Promise<string | null>((resolve) => {
      // The persistent listeners above already save the token; these are
      // one-shot and removed as soon as they fire so nothing accumulates.
      let settled = false;
      const handles: { remove: () => Promise<void> }[] = [];
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        handles.forEach((handle) => void handle.remove());
        resolve(value);
      };
      const timeout = setTimeout(() => finish(null), 15_000);
      void PushNotifications.addListener("registration", (value) => finish(value.value)).then(
        (handle) => handles.push(handle),
      );
      void PushNotifications.addListener("registrationError", (error) => {
        analytics.error(error, { stage: "push_registration" });
        finish(null);
      }).then((handle) => handles.push(handle));
      void PushNotifications.register();
    });
  }, null);

  if (token) await saveToken(userId, token);
  return token ?? null;
}

/**
 * Called on sign-in / app start with an existing session. Never throws.
 * Registration is retried on every launch so a user who granted permission
 * after the initial sign-in still ends up with a stored token.
 */
export async function syncPushRegistration(userId: string): Promise<void> {
  try {
    await registerPush(userId);
  } catch (error) {
    analytics.error(error, { stage: "push_sync" });
  }
}

/** True when the OS has already granted push permission for this app. */
export async function hasPushPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const granted = await safeNative(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permission = await PushNotifications.checkPermissions();
    return permission.receive === "granted";
  }, false);
  return Boolean(granted);
}

/** The FCM token stored for this device, if registration has succeeded. */
export async function currentPushToken(): Promise<string | null> {
  return storage.get<string | null>(TOKEN_KEY, null);
}

/** Marks this device's token inactive so logged-out devices stop receiving pushes. */
export async function deactivatePushToken(userId: string | null): Promise<void> {
  currentUserId = null;
  try {
    const token = await storage.get<string | null>(TOKEN_KEY, null);
    if (userId && token) {
      await supabase
        .from("push_tokens")
        .update({ is_active: false } as never)
        .eq("user_id", userId)
        .eq("token", token);
    }
    await storage.remove(TOKEN_KEY);
    await safeNative(async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
      listenersWired = false;
    });
  } catch (error) {
    analytics.error(error, { stage: "push_deactivate" });
  }
}
