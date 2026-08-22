import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Lock } from "lucide-react";
import type * as React from "react";
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
import {
  JourneyAffirmationActivity,
  JourneyJournalActivity,
  LetGoActivity,
  PrepareRestActivity,
  SleepRoutineActivity,
} from "@/components/journey/level2";
import { journeyRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { celebrate } from "@/lib/celebrate";
import {
  activityState,
  completedCount,
  daysDone,
  LEVELS,
  levelState,
  type JourneyActivityId,
  type JourneyLevelDef,
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
        content: "Level 1: Find Your Calm and Level 2: Rest & Recharge — gentle guided activities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyScreen,
});

const COMPONENTS: Record<JourneyActivityId, (props: ActivityProps) => React.ReactElement> = {
  "l1-feelings": FeelingsActivity,
  "l1-breathing": BreathingActivity,
  "l1-grounding": GroundingActivity,
  "l1-meditation": MeditationActivity,
  "l1-reflection": ReflectionActivity,
  "l2-journal": JourneyJournalActivity,
  "l2-prepare-rest": PrepareRestActivity,
  "l2-let-go": LetGoActivity,
  "l2-affirmation": JourneyAffirmationActivity,
  "l2-sleep-routine": SleepRoutineActivity,
};

const LEVEL_STATE_LABEL = {
  completed: "Completed",
  in_progress: "In Progress",
  available: "Available",
  locked: "Locked",
} as const;

function JourneyScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [levelIndex, setLevelIndex] = useState<number | null>(null);
  const [open, setOpen] = useState<JourneyActivityId | null>(null);

  const progress = useQuery({
    queryKey: ["journey", userId],
    queryFn: () => journeyRepo.list(userId),
    enabled: Boolean(userId),
  });
  const rows = progress.data ?? [];
  const level: JourneyLevelDef | null = levelIndex === null ? null : (LEVELS[levelIndex] ?? null);

  const markDay = useMutation({
    mutationFn: (activityId: string) =>
      journeyRepo.markDay(userId, level?.id ?? "level-1", activityId),
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
      const levelId = level?.id ?? "level-1";
      const next = await journeyRepo.complete(userId, levelId, activityId, data);
      const isLast = level ? level.activities.at(-1)?.id === activityId : false;
      if (isLast) await journeyRepo.completeLevel(userId, levelId);
      return { next, isLast };
    },
    onSuccess: ({ next, isLast }) => {
      queryClient.setQueryData(["journey", userId], next);
      if (isLast) void celebrate();
    },
  });

  const busy = complete.isPending || markDay.isPending;

  if (open && level) {
    const Activity = COMPONENTS[open];
    return (
      <Activity
        progress={rows.find((row) => row.activity_id === open)}
        busy={busy}
        onMarkDay={async () => {
          await markDay.mutateAsync(open);
        }}
        onComplete={async (data) => {
          await complete.mutateAsync(data ? { activityId: open, data } : { activityId: open });
        }}
        onExit={() => setOpen(null)}
      />
    );
  }

  if (level) {
    const doneCount = completedCount(level, rows);
    return (
      <SubScreen title={level.title} description={level.description}>
        <section className="soft-card rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">{level.objective}</p>
          <p className="mt-4 text-sm font-medium">
            {doneCount} of {level.activities.length} activities completed
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${(doneCount / level.activities.length) * 100}%` }}
            />
          </div>
        </section>

        <ul className="mt-4 space-y-3">
          {level.activities.map((activity, index) => {
            const state = activityState(level, index, rows);
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
                      state === "completed"
                        ? "bg-mint text-on-tint"
                        : locked
                          ? "bg-muted"
                          : "bg-sky text-on-tint",
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
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {activity.description}
                    </span>
                    {activity.requiredDays > 1 && state !== "completed" ? (
                      <span className="mt-2 block text-xs font-medium text-primary">
                        {Math.min(days.length, activity.requiredDays)} of {activity.requiredDays}{" "}
                        days practised
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

        <button
          type="button"
          onClick={() => setLevelIndex(null)}
          className="press mt-6 w-full rounded-2xl border border-border py-3 text-sm font-medium"
        >
          Back to all levels
        </button>
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Journey"
      description="Small steps to help you heal, grow, and reconnect with yourself."
    >
      <ul className="space-y-3">
        {LEVELS.map((item, index) => {
          const state = levelState(index, rows);
          const locked = state === "locked";
          const doneCount = completedCount(item, rows);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  haptic.select();
                  setLevelIndex(index);
                }}
                className={cn(
                  "press soft-card w-full rounded-3xl p-5 text-left",
                  locked && "opacity-55",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.title}</span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                      state === "completed"
                        ? "bg-mint text-on-tint"
                        : locked
                          ? "bg-muted text-muted-foreground"
                          : "bg-sky text-on-tint",
                    )}
                  >
                    {LEVEL_STATE_LABEL[state]}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium">
                  {doneCount} of {item.activities.length} activities completed
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${(doneCount / item.activities.length) * 100}%` }}
                  />
                </div>
                {locked ? (
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="size-3.5" aria-hidden /> Complete the previous level to unlock
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 px-1 text-center text-xs text-muted-foreground">
        Level 3 arrives after you complete Level 2.
      </p>
    </SubScreen>
  );
}
