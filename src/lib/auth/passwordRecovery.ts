import { isNative } from "@/lib/native/platform";

/** Custom-scheme deep link the Supabase recovery email returns to on Android. */
export const NATIVE_RECOVERY_URL = "com.nocontacttracker.app://reset-password";

/**
 * Where Supabase should send the user after they tap the reset link.
 * Native builds return into the app via the custom scheme; web returns to /reset-password.
 * NOTE: both URLs must be allow-listed in Supabase Auth → URL Configuration.
 */
export function passwordResetRedirectUrl(): string {
  if (isNative()) return NATIVE_RECOVERY_URL;
  return `${window.location.origin}/reset-password`;
}

let navigator: ((path: string) => void) | null = null;

/** Root route registers a router-aware navigator for recovery deep links. */
export function setRecoveryNavigator(next: ((path: string) => void) | null) {
  navigator = next;
}

export function goToResetPassword() {
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
