import { isNative, safeNative } from "@/lib/native/platform";
import { storage } from "@/lib/native/storage";

/**
 * Runtime permission handling.
 *
 * Android best practice: ask only for what a feature needs, ask at most once
 * up-front, never nag afterwards, and send the user to system settings when
 * the OS reports a permanent denial ("Don't ask again").
 *
 * The app must keep working in every denied state — every helper here resolves
 * to a boolean and never throws.
 */

export type PermissionKey = "notifications" | "camera" | "photos";

export type PermissionState = "granted" | "prompt" | "denied" | "blocked" | "unsupported";

export const PERMISSION_COPY: Record<
  PermissionKey,
  { title: string; why: string; settingsHint: string }
> = {
  notifications: {
    title: "Notifications",
    why: "Gentle daily reminders, streak nudges and milestone celebrations. Nothing noisy.",
    settingsHint: "Turn on Notifications for No Contact Tracker to receive reminders.",
  },
  camera: {
    title: "Camera",
    why: "Take a photo for your profile or your memories board, right inside the app.",
    settingsHint: "Allow Camera access so you can take photos in the app.",
  },
  photos: {
    title: "Photos",
    why: "Pick pictures from your gallery for your profile and memories board.",
    settingsHint: "Allow Photos access so you can choose images from your gallery.",
  },
};

const askedKey = (key: PermissionKey) => `nc:perm-asked:${key}`;
export const PERMISSION_ONBOARDED_KEY = "nc:perm-onboarded";

async function wasAsked(key: PermissionKey): Promise<boolean> {
  return Boolean(await storage.get<boolean>(askedKey(key), false));
}

async function markAsked(key: PermissionKey): Promise<void> {
  await storage.set(askedKey(key), true);
}

type CameraPermission = "camera" | "photos";

/**
 * Gallery access goes through the Android Photo Picker / system document
 * intent, which grants temporary read access to the picked item only. Google
 * Play best practice (and Android 13+ behaviour) is therefore to request NO
 * storage or media runtime permission for that path — the app declares none
 * in the manifest either.
 */
export function galleryUsesSystemPicker(): boolean {
  return isNative();
}

async function cameraState(which: CameraPermission): Promise<PermissionState> {
  if (which === "photos" && galleryUsesSystemPicker()) return "unsupported";
  const state = await safeNative<PermissionState>(async () => {
    const { Camera } = await import("@capacitor/camera");
    const status = await Camera.checkPermissions();
    const value = which === "camera" ? status.camera : status.photos;
    if (value === "granted" || value === "limited") return "granted";
    if (value === "denied") return "denied";
    return "prompt";
  }, "unsupported");
  return state ?? "unsupported";
}

async function notificationState(): Promise<PermissionState> {
  if (!isNative()) {
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "granted") return "granted";
    return Notification.permission === "denied" ? "denied" : "prompt";
  }
  const state = await safeNative<PermissionState>(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.checkPermissions();
    if (status.receive === "granted") return "granted";
    if (status.receive === "denied") return "denied";
    return "prompt";
  }, "unsupported");
  return state ?? "unsupported";
}

/** Current OS state, upgrading a repeat denial to "blocked". */
export async function checkPermission(key: PermissionKey): Promise<PermissionState> {
  const state =
    key === "notifications" ? await notificationState() : await cameraState(key as CameraPermission);
  if (state === "denied" && (await wasAsked(key))) return "blocked";
  return state;
}

/**
 * Shows the OS prompt when it can still appear. Returns the resulting state;
 * "blocked" means Android will no longer show a dialog for this permission.
 */
export async function requestPermission(key: PermissionKey): Promise<PermissionState> {
  const current = await checkPermission(key);
  if (current === "granted" || current === "blocked" || current === "unsupported") return current;

  await markAsked(key);

  if (key === "notifications") {
    if (!isNative()) {
      if (typeof Notification === "undefined") return "unsupported";
      try {
        const result = await Notification.requestPermission();
        return result === "granted" ? "granted" : "denied";
      } catch {
        return "unsupported";
      }
    }
    const result = await safeNative<PermissionState>(async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const status = await PushNotifications.requestPermissions();
      return status.receive === "granted" ? "granted" : "denied";
    }, "unsupported");
    return result ?? "unsupported";
  }

  const result = await safeNative<PermissionState>(async () => {
    const { Camera } = await import("@capacitor/camera");
    const status = await Camera.requestPermissions({ permissions: [key as CameraPermission] });
    const value = key === "camera" ? status.camera : status.photos;
    return value === "granted" || value === "limited" ? "granted" : "denied";
  }, "unsupported");
  return result ?? "unsupported";
}

/** Opens this app's system settings page so a blocked permission can be enabled. */
export async function openAppSettings(): Promise<void> {
  await safeNative(async () => {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import(
      "capacitor-native-settings"
    );
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
  });
}

/**
 * Opens the Android "App notifications" screen for this app (the master
 * notification switch), falling back to the app details page on platforms
 * where that screen doesn't exist.
 */
export async function openNotificationSettings(): Promise<void> {
  const opened = await safeNative(async () => {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import(
      "capacitor-native-settings"
    );
    await NativeSettings.open({
      optionAndroid: AndroidSettings.AppNotification,
      optionIOS: IOSSettings.App,
    });
    return true;
  }, false);
  if (!opened) await openAppSettings();
}

/**
 * Global hook so library code (image picker, notifications) can surface the
 * "open settings" dialog without importing React UI.
 */
type BlockedHandler = (key: PermissionKey) => void;
let blockedHandler: BlockedHandler | null = null;
export function setPermissionBlockedHandler(handler: BlockedHandler | null): void {
  blockedHandler = handler;
}
export function notifyPermissionBlocked(key: PermissionKey): void {
  blockedHandler?.(key);
}

/**
 * Feature-time gate: request if we still can, explain + offer settings when the
 * OS has permanently denied. Resolves to whether the feature may proceed.
 */
export async function ensurePermission(key: PermissionKey): Promise<boolean> {
  const state = await requestPermission(key);
  if (state === "granted" || state === "unsupported") return true;
  if (state === "blocked") notifyPermissionBlocked(key);
  return false;
}
