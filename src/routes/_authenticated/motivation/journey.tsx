import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Lock } from "lucide-react";
import { useState } from "react";

import { SubScreen } from "@/components/SubScreen";
import {
  BreathingActivity,
  FeelingsActivity,
  GroundingActivity,
  MeditationActivity,
  ReflectionActivity,
  type ActivityProps,
} from "@/components/journey/activities";
import { journeyRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { celebrate } from "@/lib/celebrate";
import {
  activityState,
  completedCount,
  daysDone,
  JOURNEY_LEVEL_1,
  LEVEL_1,
  type JourneyActivityId,
} from "@/lib/journey";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/motivation/journey")({
  head: () => ({
    meta: [
      { title: "Journey | No Contact Tracker" },
      {
        name: "description",
        content:
          "Small guided steps to help you heal, grow, and reconnect with yourself after a breakup.",
      },
      { property: "og:title", content: "Journey | No Contact Tracker" },
      {
        property: "og:description",
        content: "Level 1: Find Your Calm — five gentle activities for stress, anxiety and rest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyScreen,
});

const COMPONENTS: Record<JourneyActivityId, (props: ActivityProps) => JSX.Element> = {
  "l1-feelings": FeelingsActivity,
  "l1-breathing": BreathingActivity,
  "l1-grounding": GroundingActivity,
  "l1-meditation": MeditationActivity,
  "l1-reflection": ReflectionActivity,
};

function JourneyScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<JourneyActivityId | null>(null);

  const progress = useQuery({
    queryKey: ["journey", userId],
    queryFn: () => journeyRepo.list(userId),
    enabled: Boolean(userId),
  });
  const rows = progress.data ?? [];

  const markDay = useMutation({
    mutationFn: (activityId: string) => journeyRepo.markDay(userId, JOURNEY_LEVEL_1, activityId),
    onSuccess: (next) => queryClient.setQueryData(["journey", userId], next),
  });

  const complete = useMutation({
    mutationFn: async ({
      activityId,
      data,
    }: {
      activityId: JourneyActivityId;
      data?: Record<string, unknown>;
    }) => {
      const next = await journeyRepo.complete(userId, JOURNEY_LEVEL_1, activityId, data);
      if (activityId === "l1-reflection") await journeyRepo.completeLevel(userId, JOURNEY_LEVEL_1);
      return { next, activityId };
    },
    onSuccess: ({ next, activityId }) => {
      queryClient.setQueryData(["journey", userId], next);
      if (activityId === "l1-reflection") void celebrate();
    },
  });

  const busy = complete.isPending || markDay.isPending;

  if (open) {
    const Activity = COMPONENTS[open];
    return (
      <Activity
        progress={rows.find((row) => row.activity_id === open)}
        busy={busy}
        onMarkDay={async () => {
          await markDay.mutateAsync(open);
        }}
        onComplete={async (data) => {
          await complete.mutateAsync({ activityId: open, data });
        }}
        onExit={() => setOpen(null)}
      />
    );
  }

  const doneCount = completedCount(rows);

  return (
    <SubScreen title="Journey" description="Small steps to help you heal, grow, and reconnect with yourself.">
      <section className="soft-card rounded-3xl p-5">
        <h2 className="font-semibold">{LEVEL_1.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{LEVEL_1.description}</p>
        <p className="mt-4 text-sm font-medium">
          {doneCount} of {LEVEL_1.activities.length} activities completed
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700"
            style={{ width: `${(doneCount / LEVEL_1.activities.length) * 100}%` }}
          />
        </div>
      </section>

      <ul className="mt-4 space-y-3">
        {LEVEL_1.activities.map((activity, index) => {
          const state = activityState(index, rows);
          const locked = state === "locked";
          const days = daysDone(rows, activity.id);
          return (
            <li key={activity.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  haptic.select();
                  setOpen(activity.id as JourneyActivityId);
                }}
                className={cn(
                  "press soft-card flex w-full items-center gap-4 rounded-3xl p-5 text-left",
                  locked && "opacity-55",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold",
                    state === "completed" ? "bg-mint text-on-tint" : locked ? "bg-muted" : "bg-sky text-on-tint",
                  )}
                >
                  {state === "completed" ? (
                    <Check className="size-5" aria-hidden />
                  ) : locked ? (
                    <Lock className="size-4 text-muted-foreground" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{activity.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{activity.description}</span>
                  {activity.requiredDays > 1 && state !== "completed" ? (
                    <span className="mt-2 block text-xs font-medium text-primary">
                      {Math.min(days.length, activity.requiredDays)} of {activity.requiredDays} days
                      practised
                    </span>
                  ) : null}
                </span>
                {locked ? null : (
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 px-1 text-center text-xs text-muted-foreground">
        Level 2 arrives after you complete Level 1.
      </p>
    </SubScreen>
  );
}
