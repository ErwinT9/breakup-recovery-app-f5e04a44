import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { checkPermission } from "@/lib/native/permissions";

/** The device's IANA timezone, e.g. "Asia/Kolkata". Null when unavailable. */
export function deviceTimezone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone.includes("/") ? zone : (zone ?? null);
  } catch {
    return null;
  }
}

/**
 * Single place that keeps the server's view of this device honest: IANA
 * timezone, the real OS notification permission and the saved category
 * preferences. Called on sign-in, app start and every resume.
 *
 * It never flips the user's saved master preference — only the permission
 * mirror, which the scheduler ANDs with the preference.
 */
export async function syncNotificationDeviceState(userId: string | null): Promise<void> {
  if (!userId) return;
  try {
    const timezone = deviceTimezone();
    const state = await checkPermission("notifications");
    const patch: Record<string, unknown> = {};
    if (timezone) patch['timezone'] = timezone;

    // Only persist a permission value when Android returned a definitive OS
    // state. A temporarily unavailable native bridge/plugin reports
    // "unsupported"; treating that as denied used to overwrite a valid true
    // value on app launch/resume. "prompt" is also not a denial.
    if (state === "granted" || state === "denied" || state === "blocked") {
      patch['notifications_permission_granted'] = state === "granted";
      patch['permission_synced_at'] = new Date().toISOString();
    }

    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", userId);
    if (error) throw error;
  } catch (error) {
    analytics.error(error, { stage: "notification_device_sync" });
  }
}
