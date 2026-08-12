import raw from "@/data/notifications/eveningCheckins.json";

export type EveningNotification = {
  id: number;
  day: number;
  category: string;
  scheduled_local_time: string;
  title: string;
  description: string;
  cta: string;
  deep_link: string;
  enabled: boolean;
};

export const EVENING_SCHEDULE_TIME = (raw as { schedule: { local_time: string } }).schedule
  .local_time; // "16:30"

export const EVENING_NOTIFICATIONS = (raw as { notifications: EveningNotification[] })
  .notifications;

export const EVENING_ROTATION_DAYS = EVENING_NOTIFICATIONS.length;

/**
 * Deterministic 30-day rotation keyed off the same recovery-day counter the
 * rest of the app uses (days since the streak start, 1-based).
 */
export function eveningNotificationForDay(recoveryDay: number): EveningNotification {
  const day = Number.isFinite(recoveryDay) && recoveryDay > 0 ? Math.floor(recoveryDay) : 1;
  const index = (day - 1) % EVENING_ROTATION_DAYS;
  return EVENING_NOTIFICATIONS[index] ?? EVENING_NOTIFICATIONS[0]!;
}
