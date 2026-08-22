import { createFileRoute } from "@tanstack/react-router";

import { normalizeNotificationPrefs } from "@/lib/notifications/categories";
import {
  cycleDay,
  deepLinkFor,
  dueNotifications,
  localDateOf,
  localNow,
  notificationId,
  preferenceKey,
  SCHEDULE,
} from "@/lib/notifications/schedule";

/**
 * The single scheduler for the 30-day push cycle (120 notifications).
 *
 * pg_cron calls this every 5 minutes. For each eligible user we compute their
 * local time from profiles.timezone, pick the notifications whose local send
 * time has just passed, claim them through a unique row in
 * notification_history (that row is the duplicate guard) and hand delivery to
 * the existing send-push-notification Edge Function — the only FCM sender.
 */

type ProfileRow = {
  id: string;
  timezone: string | null;
  recovery_started_at: string;
  notifications_enabled: boolean;
  notifications_permission_granted: boolean;
  notification_prefs: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function run(dryRun: boolean, onlyUserId?: string, force = false) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;

  let query = supabaseAdmin
    .from("profiles")
    .select(
      "id, timezone, recovery_started_at, notifications_enabled, notifications_permission_granted, notification_prefs",
    )
    // No master switch any more: delivery is decided per category by
    // notification_prefs AND the Android permission mirror below.
    .not("timezone", "is", null);
  if (onlyUserId) query = query.eq("id", onlyUserId);

  const { data, error } = await query.limit(1000);
  if (error) return json({ error: error.message }, 500);

  const profiles = (data ?? []) as unknown as ProfileRow[];
  const results: Record<string, unknown>[] = [];
  let sent = 0;
  let skipped = 0;

  for (const profile of profiles) {
    if (!profile.timezone) continue;
    if (!profile.notifications_permission_granted) {
      skipped += 1;
      continue;
    }
    const prefs = normalizeNotificationPrefs(profile.notification_prefs);
    let due = dueNotifications({
      timezone: profile.timezone,
      startedAtIso: profile.recovery_started_at,
    });
    // Verification hook (service-role only): dispatch today's first entry now,
    // ignoring the clock but still honouring preferences and duplicate checks.
    if (force && due.length === 0) {
      const local = localNow(profile.timezone);
      const start = localDateOf(profile.recovery_started_at, profile.timezone);
      if (local && start) {
        const day = cycleDay(start, local.date);
        const entry = SCHEDULE.find((item) => item.day === day);
        if (entry) due = [{ entry, localDate: local.date, day }];
      }
    }

    for (const { entry, localDate } of due) {
      if (!prefs[preferenceKey(entry.category)]) {
        skipped += 1;
        continue;
      }

      const { count } = await supabaseAdmin
        .from("push_tokens")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_active", true);
      if (!count) {
        skipped += 1;
        continue;
      }

      const id = notificationId(entry);
      if (dryRun) {
        results.push({ user_id: profile.id, notification_id: id, title: entry.title, dry_run: true });
        continue;
      }

      // Claim the slot first: the unique index makes a second attempt fail,
      // so a notification can never be dispatched twice.
      const { error: claimError } = await supabaseAdmin.from("notification_history").insert({
        user_id: profile.id,
        category: entry.category.toLowerCase(),
        notification_id: id,
        local_date: localDate,
        scheduled_local_time: entry.time,
        status: "pending",
      } as never);
      if (claimError) {
        skipped += 1;
        continue;
      }

      let status = "sent";
      let errorText: string | null = null;
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: profile.id,
            title: entry.title,
            body: entry.description,
            data: {
              deep_link: deepLinkFor(entry.feature),
              category: entry.category,
              day: String(entry.day),
            },
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          sent?: number;
          error?: string;
          message?: string;
        };
        if (!response.ok || !payload.sent) {
          status = "failed";
          errorText = payload.error ?? payload.message ?? `HTTP ${response.status}`;
        }
      } catch (err) {
        status = "failed";
        errorText = (err as Error).message;
      }

      await supabaseAdmin
        .from("notification_history")
        .update({ status, error: errorText, sent_at: new Date().toISOString() } as never)
        .eq("user_id", profile.id)
        .eq("notification_id", id)
        .eq("local_date", localDate);

      if (status === "sent") sent += 1;
      results.push({ user_id: profile.id, notification_id: id, title: entry.title, status, error: errorText });
    }
  }

  return json({ ok: true, checked: profiles.length, sent, skipped, results });
}

export const Route = createFileRoute("/api/public/hooks/push-scheduler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = (request.headers.get("apikey") ?? "").trim();
        const bearer = (request.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
        const credential = key || bearer;
        const allowed =
          credential &&
          (credential === process.env["SUPABASE_ANON_KEY"] ||
            credential === process.env["SUPABASE_PUBLISHABLE_KEY"] ||
            credential === process.env["SUPABASE_SERVICE_ROLE_KEY"]);
        if (!allowed) return json({ error: "Unauthorized" }, 401);

        const body = (await request.json().catch(() => ({}))) as {
          dry_run?: boolean;
          user_id?: string;
          force?: boolean;
        };
        const isServiceCall = credential === process.env["SUPABASE_SERVICE_ROLE_KEY"];
        return run(Boolean(body.dry_run), body.user_id, Boolean(body.force) && isServiceCall);
      },
    },
  },
});
