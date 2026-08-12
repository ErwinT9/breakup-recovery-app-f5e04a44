import { storage } from "@/lib/native/storage";

/** Every notification category the user can control individually. */
export type NotificationCategory =
  | "daily_motivation"
  | "morning"
  | "evening"
  | "milestone"
  | "streak"
  | "sos"
  | "inactivity";

export type NotificationPrefs = Record<NotificationCategory, boolean>;

export const NOTIFICATION_CATEGORIES: {
  key: NotificationCategory;
  label: string;
  labelKey: string;
}[] = [
  { key: "daily_motivation", label: "Daily motivation", labelKey: "notif.daily_motivation" },
  { key: "morning", label: "Morning reminder (9:00)", labelKey: "notif.morning" },
  { key: "evening", label: "Evening reminder (16:30)", labelKey: "notif.evening" },
  { key: "milestone", label: "No contact milestone", labelKey: "notif.milestone" },
  { key: "streak", label: "Streak reminder", labelKey: "notif.streak" },
  { key: "sos", label: "SOS encouragement", labelKey: "notif.sos" },
  { key: "inactivity", label: "Inactivity reminder", labelKey: "notif.inactivity" },
];

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  daily_motivation: true,
  morning: true,
  evening: true,
  milestone: true,
  streak: true,
  sos: true,
  inactivity: true,
};

const KEY = "nc:notif-prefs";

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const stored = await storage.get<Partial<NotificationPrefs>>(KEY, {});
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await storage.set(KEY, prefs);
}
