import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";

import { SubScreen } from "@/components/SubScreen";
import { MOTIVATION_TOPICS } from "@/lib/motivation";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/motivation/guide")({
  head: () => ({
    meta: [
      { title: "Motivational guide | No Contact Tracker" },
      {
        name: "description",
        content: "Short motivational guides for the moments the urge to reach out feels loudest.",
      },
      { property: "og:title", content: "Motivational guide | No Contact Tracker" },
      {
        property: "og:description",
        content: "Pick a topic and read a calm, supportive guide written for right now.",
      },
    ],
  }),
  component: MotivationGuideScreen,
});

function MotivationGuideScreen() {
  return (
    <SubScreen
      title="Motivational Guide"
      description="Short guides written for the moments the urge feels loudest."
    >
      <h2 className="px-1 text-sm font-medium text-muted-foreground">Topics</h2>
      <ul className="mt-3 space-y-3">
        {MOTIVATION_TOPICS.map((topic) => (
          <li key={topic.id}>
            <Link
              to="/motivation/$topicId"
              params={{ topicId: topic.id }}
              onClick={() => haptic.select()}
              className="press soft-card flex items-center gap-3 rounded-3xl p-4"
            >
              <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 text-sm font-medium">{topic.title}</span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </SubScreen>
  );
}