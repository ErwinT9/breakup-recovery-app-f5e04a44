import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Flame, Sparkles } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { MOTIVATION_TOPICS } from "@/lib/motivation";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/motivation/")({
  head: () => ({
    meta: [
      { title: "Motivation | No Contact Tracker" },
      {
        name: "description",
        content: "Short motivational guides to help you keep choosing yourself during no contact.",
      },
      { property: "og:title", content: "Motivation | No Contact Tracker" },
      {
        property: "og:description",
        content: "Open the motivational guide for gentle reminders that keep your streak alive.",
      },
    ],
  }),
  component: MotivationScreen,
});

function MotivationScreen() {
  const [open, setOpen] = useState(true);

  return (
    <AppShell
      title="Motivation"
      subtitle="A little reminder to keep choosing yourself."
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          haptic.select();
          setOpen((value) => !value);
        }}
        className="press soft-card block w-full rounded-3xl bg-mint p-5 text-left"
      >
        <span className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background/40">
            <Flame className="size-5 text-on-tint" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold text-on-tint">Motivational Guide</span>
            <span className="mt-1 block text-sm text-on-tint/80">
              Tap to open short guides written for the moments the urge feels loudest.
            </span>
          </span>
        </span>
      </button>

      {open ? (
        <section aria-label="Motivational topics" className="mt-5">
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
        </section>
      ) : null}
    </AppShell>
  );
}
