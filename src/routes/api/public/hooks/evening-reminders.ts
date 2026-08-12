import { createFileRoute } from "@tanstack/react-router";

import eveningContent from "@/data/notifications/eveningCheckins.json";
import { localClock } from "@/lib/notifications/fcm.server";

/**
 * Evening Reminder dispatcher (category: evening_reminder, 16:30 local).
 *
 * Called every 15 minutes by pg_cron. For each eligible user it works out the
 * local clock from their stored IANA timezone, sends only inside the 16:30
 * window, and writes a notification_history row first so a repeated or retried
 * run can never send twice for the same local date.
 */

type EveningItem = {
  id: number;
  day: number;
  title: string;
  description: string;
  deep_link: string;
  enabled: boolean;
};

const ITEMS = (eveningContent as { notifications: EveningItem[] }).notifications;
const CATEGORY = "evening_reminder";
// Production default. A profile may carry a temporary
// `evening_reminder_time_override` ("HH:MM") used for testing only; when it is
// null every user follows this default.
const SCHEDULED_LOCAL_TIME = "16:30";
// The cron runs every 15 minutes; every IANA offset is a multiple of 15 min,
// so a 15-minute window catches each timezone exactly once per day.
const WINDOW_MINUTES = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** "HH:MM" the given profile should be sent at (override wins, else 16:30). */
function sendTimeFor(override: unknown): string {
  return typeof override === "string" && /^\d{2}:\d{2}$/.test(override)
    ? override
    : SCHEDULED_LOCAL_TIME;
}

/** Same recovery-day counter the app uses: days since streak start, 1-based. */
function recoveryDay(startedAt: string | null, now: Date): number {
  if (!startedAt) return 1;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 1;
  return Math.max(0, Math.floor((now.getTime() - start) / DAY_MS)) + 1;
}

function itemForDay(day: number): EveningItem | null {
  if (ITEMS.length === 0) return null;
  const item = ITEMS[(day - 1) % ITEMS.length] ?? ITEMS[0]!;
  return item.enabled ? item : null;
}

export const Route = createFileRoute("/api/public/hooks/evening-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anonKey = process.env['SUPABASE_ANON_KEY'] ?? process.env['SUPABASE_PUBLISHABLE_KEY'];
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!anonKey || provided !== anonKey) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // The Firebase service account lives only in the Supabase secret store,
        // so the actual FCM delivery is delegated to the deployed
        // `send-push-notification` Edge Function (service-role call).
        const supabaseUrl = process.env['SUPABASE_URL'];
        const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
        if (!supabaseUrl || !serviceRoleKey) {
          // Environments without the service-role key (local dev / preview) must
          // not 500 the cron caller — report and no-op instead.
          console.warn("[evening-reminders] missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY; skipping run");
          return Response.json({ skippedRun: "server credentials unavailable", sent: 0 });
        }
        const pushEndpoint = `${supabaseUrl}/functions/v1/send-push-notification`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();

        // Only users who opted in at every level and whose device confirmed the
        // Android permission are candidates.
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id, timezone, notifications_enabled, evening_reminder, notification_prefs, notifications_permission_granted, evening_reminder_time_override")
          .eq("notifications_enabled", true)
          .eq("evening_reminder", true)
          .eq("notifications_permission_granted", true)
          .not("timezone", "is", null);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const due = (profiles ?? []).filter((profile) => {
          const prefs = (profile.notification_prefs ?? {}) as Record<string, boolean>;
          if (prefs['evening'] === false) return false;
          const clock = localClock(profile.timezone as string, now);
          if (!clock) return false;
          const start = minutesOfDay(sendTimeFor(profile.evening_reminder_time_override));
          const minutes = minutesOfDay(clock.time);
          return minutes >= start && minutes <= start + WINDOW_MINUTES;
        });

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const profile of due) {
          const clock = localClock(profile.timezone as string, now)!;
          const { data: streak } = await supabaseAdmin
            .from("streaks")
            .select("started_at")
            .eq("user_id", profile.id)
            .maybeSingle();
          const day = recoveryDay(streak?.started_at ?? null, now);
          const item = itemForDay(day);
          if (!item) {
            skipped += 1;
            continue;
          }

          // Idempotency: the unique (user_id, category, local_date) index makes
          // a second insert fail, so a repeated cron run sends nothing.
          const { error: claimError } = await supabaseAdmin.from("notification_history").insert({
            user_id: profile.id,
            category: CATEGORY,
            notification_id: item.id,
            local_date: clock.date,
            scheduled_local_time: sendTimeFor(profile.evening_reminder_time_override),
            status: "pending",
          } as never);
          if (claimError) {
            skipped += 1;
            continue;
          }

          const { data: tokens } = await supabaseAdmin
            .from("push_tokens")
            .select("id, device_id")
            .eq("user_id", profile.id)
            .eq("is_active", true);

          if (!tokens || tokens.length === 0) {
            await supabaseAdmin
              .from("notification_history")
              .update({ status: "failed", error: "no active device token" } as never)
              .eq("user_id", profile.id)
              .eq("category", CATEGORY)
              .eq("local_date", clock.date);
            failed += 1;
            continue;
          }

          // The Edge Function fans out to every active device of the user and
          // deactivates tokens that FCM reports as unregistered/invalid.
          let anyOk = false;
          let lastError = "";
          try {
            const response = await fetch(pushEndpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_id: profile.id,
                title: item.title,
                body: item.description,
                data: {
                  deep_link: item.deep_link,
                  category: CATEGORY,
                  notification_id: String(item.id),
                },
              }),
            });
            const result = (await response.json().catch(() => ({}))) as {
              sent?: number;
              error?: string;
            };
            anyOk = response.ok && (result.sent ?? 0) > 0;
            if (!anyOk) {
              lastError = `${response.status} ${result.error ?? JSON.stringify(result)}`.slice(0, 500);
            }
          } catch (sendError) {
            lastError = String((sendError as Error).message ?? sendError).slice(0, 500);
          }

          await supabaseAdmin
            .from("notification_history")
            .update({
              status: anyOk ? "sent" : "failed",
              error: anyOk ? null : lastError || "send failed",
              device_id: (tokens[0]?.device_id as string | null) ?? null,
              sent_at: new Date().toISOString(),
            } as never)
            .eq("user_id", profile.id)
            .eq("category", CATEGORY)
            .eq("local_date", clock.date);

          if (anyOk) sent += 1;
          else failed += 1;
        }

        return Response.json({ candidates: due.length, sent, skipped, failed });
      },
    },
  },
});
