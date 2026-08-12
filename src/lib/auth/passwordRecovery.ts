import { isNative, platformName } from "@/lib/native/platform";

/** Custom-scheme deep link the Supabase recovery email returns to on Android. */
export const NATIVE_RECOVERY_URL = "com.nocontacttracker.app://reset-password";

/**
 * Multi-signal native detection. Any single signal is enough, because a false
 * negative here silently sends the user to the website instead of the app.
 *
 * 1. Capacitor bridge (may report late on cold start)
 * 2. window.Capacitor injected object (present before the ESM wrapper resolves)
 * 3. Android WebView UA marker injected by Capacitor
 * 4. The WebView origin: Capacitor serves the bundle from https://localhost
 *    (androidScheme "https") or capacitor://localhost — never a public host.
 * 5. The compiled mobile build flag.
 */
export function detectRecoveryPlatform(): { native: boolean; reason: string } {
  if (typeof window === "undefined") return { native: false, reason: "ssr" };
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };

  if (isNative()) return { native: true, reason: "Capacitor.isNativePlatform" };
  if (platformName() === "android" || platformName() === "ios") return { native: true, reason: "Capacitor.getPlatform" };
  try {
    if (w.Capacitor?.isNativePlatform?.()) return { native: true, reason: "window.Capacitor.isNativePlatform" };
    if (w.Capacitor?.getPlatform?.() && w.Capacitor.getPlatform() !== "web")
      return { native: true, reason: "window.Capacitor.getPlatform" };
  } catch {
    /* ignore */
  }

  const ua = window.navigator?.userAgent ?? "";
  if (/CapacitorHttp|com\.nocontacttracker\.app/i.test(ua)) return { native: true, reason: "userAgent" };

  const origin = window.location.origin;
  if (/^capacitor:\/\//i.test(origin)) return { native: true, reason: "capacitor origin" };
  if (!import.meta.env.DEV && /^https?:\/\/localhost(:\d+)?$/i.test(origin))
    return { native: true, reason: "webview localhost origin" };

  if (import.meta.env["VITE_CAPACITOR_BUILD"] === "true") return { native: true, reason: "mobile build flag" };

  return { native: false, reason: `web origin ${origin}` };
}

/**
 * Where Supabase should send the user after they tap the reset link.
 * Native builds return into the app via the custom scheme; web returns to /reset-password.
 * NOTE: both URLs must be allow-listed in Supabase Auth → URL Configuration.
 */
export function passwordResetRedirectUrl(): string {
  const { native, reason } = detectRecoveryPlatform();
  const url = native ? NATIVE_RECOVERY_URL : `${window.location.origin}/reset-password`;
  console.info(`[auth] recovery redirect: ${url} (native=${native}, via ${reason})`);
  return url;
}

let recoveryActive = false;

/** True while a password-recovery session is being handled. */
export function isRecoveryActive() {
  return recoveryActive;
}

export function setRecoveryActive(next: boolean) {
  recoveryActive = next;
}

let navigator: ((path: string) => void) | null = null;

/** Root route registers a router-aware navigator for recovery deep links. */
export function setRecoveryNavigator(next: ((path: string) => void) | null) {
  navigator = next;
}

export function goToResetPassword() {
  recoveryActive = true;
  if (navigator) navigator("/reset-password");
  else if (typeof window !== "undefined") window.location.assign("/reset-password");
}

/** True when a deep link / URL carries a Supabase password-recovery payload. */
export function isRecoveryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const query = parsed.searchParams;
    const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    return (
      parsed.host === "reset-password" ||
      parsed.pathname.includes("reset-password") ||
      query.get("type") === "recovery" ||
      fragment.get("type") === "recovery"
    );
  } catch {
    return false;
  }
}
