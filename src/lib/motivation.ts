import { supabase } from "@/integrations/supabase/client";

export type MotivationTopic = {
  id: string;
  title: string;
  guide: string;
};

export const MOTIVATION_TOPICS: MotivationTopic[] = [
  {
    id: "remember-why-you-started",
    title: "Remember Why You Started",
    guide:
      "When the urge to contact your ex appears, remind yourself why you chose no contact. Think about the moments that hurt, the boundaries you needed, and the person you want to become. You are not walking away because you do not care. You are walking forward because you care about yourself.",
  },
  {
    id: "the-urge-will-pass",
    title: "The Urge Will Pass",
    guide:
      "An urge can feel powerful, but it is temporary. Give yourself time before making any decision. Take a breath, put your phone down, walk around, or do something that keeps your attention busy. You do not have to act on every feeling. Sometimes the strongest move is simply waiting.",
  },
  {
    id: "choose-yourself-today",
    title: "Choose Yourself Today",
    guide:
      "Healing often happens through small choices repeated every day. Choosing yourself can mean protecting your peace, respecting your boundaries, and refusing to reopen an old wound. You do not need to prove anything to your ex. Your progress belongs to you, and every day of no contact strengthens your future.",
  },
  {
    id: "missing-them-is-not-a-sign",
    title: "Missing Them Is Not a Sign",
    guide:
      "Missing someone does not automatically mean you should return to them. It simply means they were important to you. Let the feeling exist without allowing it to control your actions. Memories can be real while still belonging to the past. You can miss someone and continue moving forward.",
  },
  {
    id: "build-the-life-ahead",
    title: "Build the Life Ahead",
    guide:
      "Your story did not end with the relationship. There are friendships, goals, experiences, and new versions of yourself waiting ahead. Instead of constantly asking what your ex is doing, ask what you can build next. Every day you protect your progress is another day spent creating a life that feels yours again.",
  },
];

export function motivationTopicById(id: string) {
  return MOTIVATION_TOPICS.find((topic) => topic.id === id) ?? null;
}
