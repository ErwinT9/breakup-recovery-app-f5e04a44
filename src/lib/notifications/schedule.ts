import scheduleJson from "@/data/notifications/30DayPushNotifications.json";

import type { NotificationCategory } from "./categories";

/** One entry of the 30-day (120 notification) cycle. */
export type ScheduledNotification = {
  day: number;
  time: string;
  category: "Morning" | "Evening" | "Reminder" | "Motivation";
  title: string;
  description: string;
  feature: string;
};

export const CYCLE_DAYS: number = (scheduleJson as { cycle_days: number }).cycle_days || 30;

export const SCHEDULE: ScheduledNotification[] = (
  scheduleJson as { notifications: ScheduledNotification[] }
).notifications;

/** Distinct send times, ordered — used to derive a stable slot index. */
export const SLOT_TIMES: string[] = Array.from(new Set(SCHEDULE.map((n) => n.time))).sort();

/** Stable, collision-free id for a notification: day * 10 + slot index. */
export function notificationId(entry: ScheduledNotification): number {
  const slot = SLOT_TIMES.indexOf(entry.time);
  return entry.day * 10 + (slot < 0 ? 9 : slot);
}

/** Which user-facing preference toggle governs this notification. */
export function preferenceKey(category: ScheduledNotification["category"]): NotificationCategory {
  if (category === "Morning") return "morning";
  if (category === "Evening") return "evening";
  return "daily_motivation";
}

const FEATURE_LINKS: Record<string, string> = {
  "Daily Check-in": "/check-in",
  "Mood Tracker": "/check-in",
  "Add a Picture": "/pictures",
  Journal: "/journal",
  Reflection: "/journal",
  "Log a Trigger": "/triggers",
  "Set Ritual": "/rituals",
  "Write an Affirmation": "/affirmations",
  "Unsent Letter": "/letters",
  Wins: "/wins",
  Milestones: "/badges",
  "30-Day Milestone": "/badges",
  "30-Day Progress": "/badges",
  "30-Day Reset": "/home",
  "No-Contact Streak": "/home",
  "Recovery Insights": "/mood-analytics",
  "Recovery Tools": "/activity",
  "Habit Challenge": "/activity",
  "Motivation Guide": "/motivation/guide",
  "Mindful Meditation": "/motivation/meditation",
  "Outdoor Walk": "/motivation/walk",
};

export function deepLinkFor(feature: string): string {
  return FEATURE_LINKS[feature] ?? "/home";
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** The user's local calendar date and minutes-since-midnight for an instant. */
export function localNow(
  timezone: string,
  at: Date = new Date(),
): { date: string; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(at);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const hour = get("hour") === "24" ? "00" : get("hour");
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    if (date.includes("NaN") || date.length !== 10) return null;
    return { date, minutes: Number(hour) * 60 + Number(get("minute")) };
  } catch {
    return null;
  }
}

/** Local calendar date (YYYY-MM-DD) of an ISO instant in a timezone. */
export function localDateOf(iso: string, timezone: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return localNow(timezone, parsed)?.date ?? null;
}

function daysBetween(fromDate: string, toDate: string): number {
  const a = Date.parse(`${fromDate}T00:00:00Z`);
  const b = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** 1-based cycle day, repeating automatically after day 30. */
export function cycleDay(startLocalDate: string, todayLocalDate: string): number {
  const elapsed = daysBetween(startLocalDate, todayLocalDate);
  const safe = elapsed < 0 ? 0 : elapsed;
  return (safe % CYCLE_DAYS) + 1;
}

/**
 * Notifications whose local send time has just passed (within `windowMinutes`)
 * for this user. Duplicate protection is handled by notification_history.
 */
export function dueNotifications(params: {
  timezone: string;
  startedAtIso: string;
  now?: Date;
  windowMinutes?: number;
}): { entry: ScheduledNotification; localDate: string; day: number }[] {
  const { timezone, startedAtIso } = params;
  const window = params.windowMinutes ?? 10;
  const now = localNow(timezone, params.now ?? new Date());
  const start = localDateOf(startedAtIso, timezone);
  if (!now || !start) return [];
  const day = cycleDay(start, now.date);
  return SCHEDULE.filter((entry) => entry.day === day)
    .filter((entry) => {
      const diff = now.minutes - minutesOf(entry.time);
      return diff >= 0 && diff < window;
    })
    .map((entry) => ({ entry, localDate: now.date, day }));
}
