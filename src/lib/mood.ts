import { MOODS } from "@/lib/content";

export type MoodCategory = "bright" | "balanced" | "bitter";

/** Max mood entries a user may log per local calendar day. */
export const DAILY_MOOD_LIMIT = 24;

const CATEGORY_BY_MOOD: Record<string, MoodCategory> = {
  peaceful: "bright",
  hopeful: "bright",
  strong: "bright",
  okay: "balanced",
  numb: "balanced",
  anxious: "bitter",
  sad: "bitter",
  heavy: "bitter",
  tired: "bitter",
  restless: "bitter",
};

export const MOOD_CATEGORIES: {
  key: MoodCategory;
  label: string;
  /** Solid fill for chart segments. */
  bar: string;
  /** Soft tint for chips and cards. */
  chip: string;
  dot: string;
}[] = [
  { key: "bright", label: "Bright", bar: "bg-mood-bright", chip: "bg-mood-bright-soft", dot: "bg-mood-bright" },
  { key: "balanced", label: "Balanced", bar: "bg-mood-balanced", chip: "bg-mood-balanced-soft", dot: "bg-mood-balanced" },
  { key: "bitter", label: "Bitter", bar: "bg-mood-bitter", chip: "bg-mood-bitter-soft", dot: "bg-mood-bitter" },
];

export function moodCategory(moodKey: string | null | undefined): MoodCategory {
  return CATEGORY_BY_MOOD[moodKey ?? ""] ?? "balanced";
}

export function categoryMeta(category: MoodCategory) {
  return MOOD_CATEGORIES.find((item) => item.key === category) ?? MOOD_CATEGORIES[1]!;
}

export function moodLabel(moodKey: string): string {
  return MOODS.find((mood) => mood.key === moodKey)?.label ?? moodKey;
}

export function moodEmoji(moodKey: string): string {
  return MOODS.find((mood) => mood.key === moodKey)?.emoji ?? "🫶";
}