import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SoftCard } from "@/components/SoftCard";
import { MarkdownContent } from "@/components/MarkdownContent";
import { fetchMotivationGuides, MOTIVATION_TOPICS } from "@/lib/motivation";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/motivation/$topicId")({
  head: () => ({
    meta: [
      { title: "Motivational guide | No Contact Tracker" },
      {
        name: "description",
        content: "Read a full motivational guide to help you stay on your no contact path.",
      },
      { property: "og:title", content: "Motivational guide | No Contact Tracker" },
      {
        property: "og:description",
        content: "A calm, supportive read for the moments you need encouragement.",
      },
    ],
  }),
  component: MotivationTopicScreen,
});

/** Remove a leading Markdown heading prefix (e.g. "# ") so the title shows as plain text. */
function stripMarkdownPrefix(value: string): string {
  return value.replace(/^\s*#{1,6}\s+/, "").trim();
}

function MotivationTopicScreen() {
  const { topicId } = Route.useParams();
  const router = useRouter();
  const { data: topics = MOTIVATION_TOPICS } = useQuery({
    queryKey: ["motivation-guides"],
    queryFn: fetchMotivationGuides,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
  const topic = topics.find((t) => t.id === topicId) ?? null;

  return (
    <div className="animate-in slide-in-from-right-6 fade-in mx-auto flex min-h-screen w-full max-w-md flex-col duration-300">
      <header className="rounded-b-[2rem] bg-muted/60 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => {
            haptic.light();
            router.history.back();
          }}
          className="press flex size-10 items-center justify-center rounded-full bg-background"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="mt-4 text-[1.75rem] font-semibold leading-tight tracking-tight">
          {topic ? stripMarkdownPrefix(topic.title) : "Guide unavailable"}
        </h1>
      </header>

      <main className="flex-1 px-5 py-6 pb-20">
        <SoftCard className="p-6">
          {topic ? (
            <div className="space-y-4">
              <MarkdownContent content={topic.guide} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This guide could not be found. Go back and pick another topic.
            </p>
          )}
        </SoftCard>
      </main>
    </div>
  );
}
