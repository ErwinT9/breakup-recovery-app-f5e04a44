import { storage } from "@/lib/native/storage";

/**
 * The four notification categories. These keys are the single source of truth
 * shared by the Settings UI, the local scheduler and the server-side 30-day
 * push scheduler (profiles.notification_prefs).
 */
export type NotificationCategory = "morning" | "evening" | "reminder" | "motivation";

export type NotificationPrefs = Record<NotificationCategory, boolean>;

export const NOTIFICATION_CATEGORIES: {
  key: NotificationCategory;
  label: string;
  labelKey: string;
}[] = [
  { key: "morning", label: "Morning", labelKey: "notif.morning" },
  { key: "evening", label: "Evening", labelKey: "notif.evening" },
  { key: "reminder", label: "Reminder", labelKey: "notif.reminder" },
  { key: "motivation", label: "Motivation", labelKey: "notif.motivation" },
];

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  morning: true,
  evening: true,
  reminder: true,
  motivation: true,
};

/** Keeps exactly the four supported keys, dropping any legacy ones. */
export function normalizeNotificationPrefs(raw: unknown): NotificationPrefs {
  const stored = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<string, unknown>
  >;
  const next = { ...DEFAULT_NOTIFICATION_PREFS };
  for (const { key } of NOTIFICATION_CATEGORIES) {
    if (typeof stored[key] === "boolean") next[key] = stored[key] as boolean;
  }
  return next;
}

const KEY = "nc:notif-prefs";

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const stored = await storage.get<unknown>(KEY, {});
  return normalizeNotificationPrefs(stored);
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await storage.set(KEY, normalizeNotificationPrefs(prefs));
}
