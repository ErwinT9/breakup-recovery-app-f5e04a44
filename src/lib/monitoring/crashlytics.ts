import type { FirebaseCrashlyticsPlugin as CrashlyticsPlugin } from "@capacitor-firebase/crashlytics";
import { registerPlugin } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { App } from "@capacitor/app";

import { isNative, platformName } from "../native/platform";
import { isOnline, subscribeNetwork } from "../offline/network";

// Registered directly instead of importing the package: its web implementation
// pulls in the optional `firebase` JS SDK, which breaks the bundle. The native
// bridge is all we need — on web every call below is skipped by isNative().
const crashlytics = registerPlugin<CrashlyticsPlugin>("FirebaseCrashlytics");

// When the native plugin is not compiled into the shell, Capacitor throws
// "plugin is not implemented on android" SYNCHRONOUSLY from the proxy — not as
// a rejected promise. Left unguarded that throw reaches window.onerror, which
// reports it back into Crashlytics, which throws again: an infinite loop that
// freezes the WebView (white screen, then ANR). One failure disables the sink.
let unavailable = false;

type Props = Record<string, string | number | boolean | null | undefined>;

let started = false;

/** Fire-and-forget: monitoring must never break a user flow. */
function call(fn: (p: CrashlyticsPlugin) => Promise<unknown>): void {
  if (!isNative() || unavailable) return;
  try {
    void Promise.resolve(fn(crashlytics)).catch(() => {
      unavailable = true;
    });
  } catch {
    unavailable = true;
  }
}

function setKey(key: string, value: string | number | boolean): void {
  const type = typeof value === "number" ? "float" : typeof value === "boolean" ? "boolean" : "string";
  call((p) =>
    p.setCustomKey({ key, value, type } as Parameters<CrashlyticsPlugin["setCustomKey"]>[0]),
  );
}

/**
 * Turns on Crashlytics collection and attaches the static device/app context
 * every report should carry. Native only — no-ops on web and during SSR.
 */
export async function initCrashlytics(): Promise<void> {
  if (started || !isNative()) return;
  started = true;

  call((p) => p.setEnabled({ enabled: true }));
  setKey("platform", platformName());
  setKey("network_status", isOnline() ? "online" : "offline");
  subscribeNetwork((online) => setKey("network_status", online ? "online" : "offline"));

  try {
    const [info, device, os] = await Promise.all([
      App.getInfo(),
      Device.getInfo(),
      Device.getId(),
    ]);
    setKey("app_version", info.version);
    setKey("app_build", info.build);
    setKey("device_model", `${device.manufacturer ?? ""} ${device.model}`.trim());
    setKey("os_version", device.osVersion);
    setKey("install_id", os.identifier);
  } catch {
    // Plugin unavailable (e.g. older shell) — reports still work without these.
  }
}

/** Anonymous Supabase user id only — never email or display name. */
export function setCrashUser(userId: string): void {
  call((p) => p.setUserId({ userId }));
}

export function clearCrashUser(): void {
  call((p) => p.setUserId({ userId: "" }));
}

/** Current route + high-level feature area, so a crash says where it happened. */
export function setScreen(route: string, feature: string): void {
  setKey("current_screen", route);
  setKey("current_feature", feature);
  logBreadcrumb("screen_view", { route, feature });
}

export function logBreadcrumb(name: string, props?: Props): void {
  const suffix = props && Object.keys(props).length ? ` ${safeJson(props)}` : "";
  call((p) => p.log({ message: `${name}${suffix}` }));
}

/** JS exceptions from the WebView land in Crashlytics as non-fatals. */
export function recordNonFatal(error: unknown, context?: Props): void {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const keysAndValues = toKeysAndValues(context);
  call((p) =>
    p.recordException({
      message: stack ? `${message}\n${stack}` : message,
      ...(keysAndValues ? { keysAndValues } : {}),
    }),
  );
}

function toKeysAndValues(props?: Props) {
  if (!props) return undefined;
  return Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({ key, value: String(value), type: "string" as const }));
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

/** Maps a router pathname to the product feature shown in crash reports. */
export function featureForPath(pathname: string): string {
  if (pathname.startsWith("/home")) return "Home";
  if (pathname.startsWith("/flags")) return "Flags";
  if (pathname.startsWith("/wins")) return "Wins";
  if (pathname.startsWith("/badges")) return "Badges";
  if (pathname.startsWith("/letters")) return "Unsent Letter";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/activity")) return "Activity";
  if (pathname.startsWith("/journal")) return "Journal";
  if (pathname.startsWith("/pictures")) return "Pictures";
  if (pathname.startsWith("/triggers")) return "Triggers";
  if (pathname.startsWith("/rituals")) return "Rituals";
  if (pathname.startsWith("/affirmations")) return "Affirmations";
  if (pathname.startsWith("/questionnaire")) return "Onboarding";
  if (pathname.startsWith("/paywall")) return "Paywall";
  if (pathname.startsWith("/auth") || pathname.startsWith("/reset-password")) return "Auth";
  return "Other";
}