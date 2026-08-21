/**
 * Local persistence for the 7-Day Streak Unlock screen.
 *
 * Stores the last streak day the user has seen on the progress screen and
 * whether the day-7 coloring page reward has ever been unlocked. Kept in
 * localStorage so it works offline and identically inside the Android WebView.
 */
const KEY = "nc:streak-unlock-v1";

export const STREAK_UNLOCK_TARGET = 7;

type State = { lastSeenDay: number; unlocked: boolean };

const EMPTY: State = { lastSeenDay: 0, unlocked: false };

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    return EMPTY;
  }
}

function write(next: State): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — state simply isn't remembered */
  }
}

export function getStreakUnlockState(): State {
  return read();
}

/** True once the user has ever reached a 7-day streak. */
export function isColoringPageUnlocked(currentDay: number): boolean {
  return read().unlocked || currentDay >= STREAK_UNLOCK_TARGET;
}

/** Show the screen automatically only when the streak day has changed. */
export function shouldAutoShowStreakUnlock(currentDay: number): boolean {
  return currentDay >= 1 && read().lastSeenDay !== currentDay;
}

export function markStreakUnlockSeen(currentDay: number): void {
  const state = read();
  write({
    lastSeenDay: currentDay,
    unlocked: state.unlocked || currentDay >= STREAK_UNLOCK_TARGET,
  });
}
