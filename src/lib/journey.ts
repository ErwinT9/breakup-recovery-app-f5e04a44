import type { JourneyProgress } from "@/data/types";

export const JOURNEY_LEVEL_1 = "level-1";

export type JourneyActivityId =
  | "l1-feelings"
  | "l1-breathing"
  | "l1-grounding"
  | "l1-meditation"
  | "l1-reflection";

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

export type ActivityState = "completed" | "available" | "locked";

export function progressByActivity(rows: JourneyProgress[]) {
  const map = new Map<string, JourneyProgress>();
  rows.forEach((row) => map.set(row.activity_id, row));
  return map;
}

/**
 * Sequential unlocking: the first activity is always available, and every other
 * activity unlocks only once the one directly before it is genuinely completed.
 */
export function activityState(
  index: number,
  rows: JourneyProgress[],
): ActivityState {
  const map = progressByActivity(rows);
  const self = map.get(LEVEL_1.activities[index]!.id);
  if (self?.completed) return "completed";
  if (index === 0) return "available";
  const previous = map.get(LEVEL_1.activities[index - 1]!.id);
  return previous?.completed ? "available" : "locked";
}

export function completedCount(rows: JourneyProgress[]): number {
  return LEVEL_1.activities.filter((activity) =>
    rows.some((row) => row.activity_id === activity.id && row.completed),
  ).length;
}

/** Unique practice days already recorded for a multi-day activity. */
export function daysDone(rows: JourneyProgress[], activityId: string): string[] {
  return rows.find((row) => row.activity_id === activityId)?.day_dates ?? [];
}
