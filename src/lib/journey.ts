import type { JourneyProgress } from "@/data/types";

export const JOURNEY_LEVEL_1 = "level-1";
export const JOURNEY_LEVEL_2 = "level-2";

export type JourneyActivityId =
  | "l1-feelings"
  | "l1-breathing"
  | "l1-grounding"
  | "l1-meditation"
  | "l1-reflection"
  | "l2-journal"
  | "l2-prepare-rest"
  | "l2-let-go"
  | "l2-affirmation"
  | "l2-sleep-routine";

export type JourneyActivityDef = {
  id: JourneyActivityId;
  title: string;
  description: string;
  /** Unique calendar days of practice required before it can be completed. */
  requiredDays: number;
};

export const LEVEL_1 = {
  id: JOURNEY_LEVEL_1,
  title: "Level 1: Find Your Calm",
  description:
    "Your first steps toward finding calm. Take time to understand your emotions, slow down your thoughts, and create space for peace.",
  objective:
    "Understand and manage stress, anxiety, and overwhelming emotions after a breakup.",
  activities: [
    {
      id: "l1-feelings",
      title: "Understand Your Feelings",
      description:
        "Take a moment to check in with yourself and better understand what you are feeling right now.",
      requiredDays: 1,
    },
    {
      id: "l1-breathing",
      title: "2-Minute Breathing Exercise",
      description: "Slow down, focus on your breathing, and give your mind a moment of calm.",
      requiredDays: 2,
    },
    {
      id: "l1-grounding",
      title: "Ground Yourself",
      description:
        "When your thoughts feel overwhelming, bring your attention back to the present moment.",
      requiredDays: 1,
    },
    {
      id: "l1-meditation",
      title: "Mindful Meditation",
      description:
        "Take a few quiet minutes to slow down, relax, and create space for calmness and clarity.",
      requiredDays: 4,
    },
    {
      id: "l1-reflection",
      title: "Calm Reflection",
      description:
        "Take a quiet moment to reflect on what helped you feel calmer and what you want to carry forward.",
      requiredDays: 1,
    },
  ] satisfies JourneyActivityDef[],
} as const;

export const LEVEL_2 = {
  id: JOURNEY_LEVEL_2,
  title: "Level 2: Rest & Recharge",
  description:
    "Give your mind space to slow down, release the weight of the day, and build small habits that support better rest.",
  objective:
    "Slow down, release stressful thoughts, build positive self-talk, and develop healthier habits for better rest.",
  activities: [
    {
      id: "l2-journal",
      title: "Daily Journal",
      description: "Take a few moments to reflect on your day, thoughts, and feelings.",
      requiredDays: 2,
    },
    {
      id: "l2-prepare-rest",
      title: "Prepare Your Mind for Rest",
      description:
        "Create a gentle transition between your busy day and a more peaceful state of rest.",
      requiredDays: 1,
    },
    {
      id: "l2-let-go",
      title: "Let Go of Today's Thoughts",
      description:
        "Put down the thoughts still following you from today and give your mind permission to rest.",
      requiredDays: 1,
    },
    {
      id: "l2-affirmation",
      title: "Write an Affirmation",
      description:
        "Create a supportive message for yourself and return to it over several different days.",
      requiredDays: 4,
    },
    {
      id: "l2-sleep-routine",
      title: "Build Your Sleep Routine",
      description:
        "Create a simple and realistic routine that helps your mind and body prepare for better rest.",
      requiredDays: 1,
    },
  ] satisfies JourneyActivityDef[],
} as const;

export type JourneyLevelDef = {
  id: string;
  title: string;
  description: string;
  objective: string;
  activities: readonly JourneyActivityDef[];
};

export const LEVELS: readonly JourneyLevelDef[] = [LEVEL_1, LEVEL_2];

export type ActivityState = "completed" | "available" | "locked";
export type LevelState = "completed" | "in_progress" | "available" | "locked";

export function progressByActivity(rows: JourneyProgress[]) {
  const map = new Map<string, JourneyProgress>();
  rows.forEach((row) => map.set(row.activity_id, row));
  return map;
}

/**
 * Sequential unlocking inside a level: the first activity is always available,
 * every other one unlocks once the activity directly before it is completed.
 */
export function activityState(
  level: JourneyLevelDef,
  index: number,
  rows: JourneyProgress[],
): ActivityState {
  const map = progressByActivity(rows);
  const self = map.get(level.activities[index]!.id);
  if (self?.completed) return "completed";
  if (index === 0) return "available";
  const previous = map.get(level.activities[index - 1]!.id);
  return previous?.completed ? "available" : "locked";
}

export function completedCount(level: JourneyLevelDef, rows: JourneyProgress[]): number {
  return level.activities.filter((activity) =>
    rows.some((row) => row.activity_id === activity.id && row.completed),
  ).length;
}

export function isLevelComplete(level: JourneyLevelDef, rows: JourneyProgress[]): boolean {
  return completedCount(level, rows) === level.activities.length;
}

/** A level unlocks only once every activity of the previous level is completed. */
export function levelState(
  index: number,
  rows: JourneyProgress[],
): LevelState {
  const level = LEVELS[index]!;
  const done = completedCount(level, rows);
  if (done === level.activities.length) return "completed";
  const previous = LEVELS[index - 1];
  const unlocked = index === 0 || (previous ? isLevelComplete(previous, rows) : false);
  if (!unlocked) return "locked";
  return done > 0 ? "in_progress" : "available";
}

/** Unique practice days already recorded for a multi-day activity. */
export function daysDone(rows: JourneyProgress[], activityId: string): string[] {
  return rows.find((row) => row.activity_id === activityId)?.day_dates ?? [];
}
