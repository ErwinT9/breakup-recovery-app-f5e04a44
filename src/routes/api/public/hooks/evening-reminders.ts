import { createFileRoute } from "@tanstack/react-router";

import eveningContent from "@/data/notifications/eveningCheckins.json";
import {
  getAccessToken,
  loadServiceAccount,
  localClock,
  sendToToken,
} from "@/lib/notifications/fcm.server";

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
const SCHEDULED_LOCAL_TIME = "16:30";
// The cron runs every 15 minutes; every IANA offset is a multiple of 15 min,
// so 16:30–16:44 catches each timezone exactly once per day.
const WINDOW_START = 16 * 60 + 30;
const WINDOW_END = 16 * 60 + 44;

const DAY_MS = 24 * 60 * 60 * 1000;

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
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

        const serviceAccount = loadServiceAccount();
        if (!serviceAccount) {
          return Response.json({ error: "FIREBASE_SERVICE_ACCOUNT is not configured" }, { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();

        // Only users who opted in at every level and whose device confirmed the
        // Android permission are candidates.
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id, timezone, notifications_enabled, evening_reminder, notification_prefs, notifications_permission_granted")
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
          const minutes = minutesOfDay(clock.time);
          return minutes >= WINDOW_START && minutes <= WINDOW_END;
        });

        let sent = 0;
        let skipped = 0;
        let failed = 0;
        let accessToken: string | null = null;

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
            scheduled_local_time: SCHEDULED_LOCAL_TIME,
            status: "pending",
          } as never);
          if (claimError) {
            skipped += 1;
            continue;
          }

          const { data: tokens } = await supabaseAdmin
            .from("push_tokens")
            .select("id, token, device_id")
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

          if (!accessToken) accessToken = await getAccessToken(serviceAccount);

          let anyOk = false;
          let lastError = "";
          const invalid: string[] = [];
          // One send per device; the same device is never targeted twice.
          const seen = new Set<string>();
          for (const row of tokens) {
            if (seen.has(row.token)) continue;
            seen.add(row.token);
            const result = await sendToToken(
              accessToken,
              serviceAccount.project_id,
              row.token,
              item.title,
              item.description,
              { deep_link: item.deep_link, category: CATEGORY, notification_id: String(item.id) },
            );
            if (result.ok) anyOk = true;
            else {
              lastError = `${result.status} ${result.detail}`.slice(0, 500);
              if (result.invalid) invalid.push(row.id as string);
            }
          }

          if (invalid.length > 0) {
            await supabaseAdmin
              .from("push_tokens")
              .update({ is_active: false } as never)
              .in("id", invalid);
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
