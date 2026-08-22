/**
 * 7-Day Streak Unlock state.
 *
 * This streak is deliberately INDEPENDENT of the no-contact / breakup date.
 * It starts on the day the user first uses the app (first authenticated open
 * after sign-up / onboarding) and counts consecutive calendar days of app
 * usage — so every user starts at Day 1 no matter how old their breakup is.
 *
 * Source of truth is Supabase (`public.app_streaks`) so reinstalling the app
 * or signing in on another device keeps the streak. A localStorage mirror
 * keeps it working offline.
 */
import { supabase } from "@/integrations/supabase/client";

export const STREAK_UNLOCK_TARGET = 7;

const MIRROR_KEY = "nc:app-streak-v2";

export type AppStreak = {
  /** Calendar day of the current run, 1-based (can exceed 7). */
  day: number;
  /** True when the streak screen was already shown/counted today. */
  seenToday: boolean;
  /** True once a full 7-day run has ever been completed. */
  unlocked: boolean;
};

type Row = {
  user_id: string;
  start_date: string;
  last_active_date: string;
  current_day: number;
  best_day: number;
  coloring_unlocked: boolean;
};

/* ------------------------------------------------------------------ dates */

function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's date in the device's local calendar (YYYY-MM-DD). */
export function todayLocal(): string {
  return toLocalDate(new Date());
}

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDate(d);
}

/* ----------------------------------------------------------------- mirror */

function readMirror(userId: string): Row | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${MIRROR_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as Row) : null;
  } catch {
    return null;
  }
}

function writeMirror(userId: string, row: Row): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${MIRROR_KEY}:${userId}`, JSON.stringify(row));
  } catch {
    /* storage unavailable — remote row still holds the truth */
  }
}

/* ------------------------------------------------------------------- data */

// The generated Supabase types may not include this table yet; the query
// shape below is exact, so a narrow cast keeps things type-safe enough.
const table = () => (supabase as unknown as {
  from: (name: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Row | null; error: unknown }>;
      };
    };
    upsert: (
      values: Row,
      options: { onConflict: string },
    ) => Promise<{ error: unknown }>;
  };
}).from("app_streaks");

async function fetchRow(userId: string): Promise<Row | null> {
  try {
    const { data, error } = await table().select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (data) writeMirror(userId, data);
    return data ?? readMirror(userId);
  } catch {
    return readMirror(userId);
  }
}

async function persist(userId: string, row: Row): Promise<void> {
  writeMirror(userId, row);
  try {
    await table().upsert(row, { onConflict: "user_id" });
  } catch {
    /* offline — mirror keeps the streak until the next successful write */
  }
}

function project(row: Row | null): { day: number; seenToday: boolean; unlocked: boolean; startDate: string; bestDay: number } {
  const today = todayLocal();
  if (!row) {
    return { day: 1, seenToday: false, unlocked: false, startDate: today, bestDay: 1 };
  }
  if (row.last_active_date === today) {
    return {
      day: row.current_day,
      seenToday: true,
      unlocked: row.coloring_unlocked || row.current_day >= STREAK_UNLOCK_TARGET,
      startDate: row.start_date,
      bestDay: row.best_day,
    };
  }
  const consecutive = row.last_active_date === yesterdayLocal();
  const day = consecutive ? row.current_day + 1 : 1; // a missed day restarts at Day 1
  return {
    day,
    seenToday: false,
    unlocked: row.coloring_unlocked || day >= STREAK_UNLOCK_TARGET,
    startDate: consecutive ? row.start_date : today,
    bestDay: Math.max(row.best_day, day),
  };
}

/** Read-only look at where the user stands today. Never mutates. */
export async function peekAppStreak(userId: string): Promise<AppStreak> {
  const { day, seenToday, unlocked } = project(await fetchRow(userId));
  return { day, seenToday, unlocked };
}

/**
 * Records today's usage (idempotent per calendar day) and returns the state
 * the screen should display.
 */
export async function registerAppStreakVisit(userId: string): Promise<AppStreak> {
  const row = await fetchRow(userId);
  const next = project(row);
  if (next.seenToday) {
    return { day: next.day, seenToday: true, unlocked: next.unlocked };
  }
  const updated: Row = {
    user_id: userId,
    start_date: next.startDate,
    last_active_date: todayLocal(),
    current_day: next.day,
    best_day: Math.max(next.bestDay, next.day),
    coloring_unlocked: (row?.coloring_unlocked ?? false) || next.day >= STREAK_UNLOCK_TARGET,
  };
  await persist(userId, updated);
  return { day: updated.current_day, seenToday: false, unlocked: updated.coloring_unlocked };
}
