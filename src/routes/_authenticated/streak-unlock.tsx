import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Download, Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppLogo } from "@/components/AppLogo";
import { ColoringGarden } from "@/components/illustrations/ColoringGarden";
import { Button } from "@/components/ui/button";
import { profileRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";
import { downloadColoringPage } from "@/lib/coloringPage";
import { haptic } from "@/lib/native/haptics";
import {
  STREAK_UNLOCK_TARGET,
  peekAppStreak,
  registerAppStreakVisit,
} from "@/lib/streakUnlock";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/streak-unlock")({
  head: () => ({
    meta: [
      { title: "7-Day Streak Unlock | No Contact Tracker" },
      {
        name: "description",
        content:
          "Watch your garden gain colour with every no contact day and unlock a printable coloring page at day 7.",
      },
      { property: "og:title", content: "7-Day Streak Unlock | No Contact Tracker" },
      {
        property: "og:description",
        content: "Every streak day adds a splash of colour to your garden.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { auto?: boolean } =>
    search["auto"] === true || search["auto"] === "1" ? { auto: true } : {},
  component: StreakUnlockScreen,
});

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function StreakUnlockScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const { auto } = Route.useSearch();
  const printRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState(false);

  const streak = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.ensure(userId),
    enabled: Boolean(userId),
  });

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileRepo.get(userId),
    enabled: Boolean(userId) && Boolean(auto),
  });

  const startedAt = streak.data?.started_at ?? null;
  const totalDays = startedAt ? daysSince(startedAt) + 1 : 1;
  const stage = Math.min(STREAK_UNLOCK_TARGET, Math.max(1, totalDays));
  const unlocked = getStreakUnlockState().unlocked || totalDays >= STREAK_UNLOCK_TARGET;
  const ready = Boolean(startedAt);

  useEffect(() => {
    analytics.screen("streak_unlock");
  }, []);

  // Auto entry from the splash: only stay here when the streak day changed and
  // onboarding is done — otherwise slip straight through to Home.
  useEffect(() => {
    if (!auto || !ready || profile.isLoading) return;
    const onboarded = profile.data?.questionnaire_completed !== false;
    if (!onboarded || !shouldAutoShowStreakUnlock(totalDays)) {
      void navigate({ to: "/home", replace: true });
    }
  }, [auto, ready, profile.isLoading, profile.data, totalDays, navigate]);

  useEffect(() => {
    if (!ready) return;
    markStreakUnlockSeen(totalDays);
    if (totalDays >= STREAK_UNLOCK_TARGET) void celebrate();
  }, [ready, totalDays]);

  const dismiss = () => {
    haptic.light();
    void navigate({ to: "/home", replace: true });
  };

  return (
    <div className="animate-in fade-in mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] duration-500">
      <p className="text-center text-sm text-muted-foreground">{formatToday()}</p>

      <AppLogo className="mx-auto mt-3 size-10" />

      <h1 className="animate-rise mt-2 text-center text-[2rem] font-semibold tracking-tight">
        Day {totalDays}
      </h1>

      <ol className="mt-5 flex items-center justify-center gap-2">
        {Array.from({ length: STREAK_UNLOCK_TARGET }, (_, index) => index + 1).map((day) => {
          const done = day < stage || (day === STREAK_UNLOCK_TARGET && totalDays >= STREAK_UNLOCK_TARGET);
          const current = day === stage && !done;
          return (
            <li
              key={day}
              aria-label={`Day ${day}${done ? " complete" : current ? " today" : " locked"}`}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-500",
                done && "border-transparent bg-primary text-primary-foreground",
                current && "border-primary bg-primary-soft text-foreground ring-4 ring-primary/15",
                !done && !current && "border-border text-muted-foreground/70",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : day}
            </li>
          );
        })}
      </ol>

      <div className="soft-card animate-rise mt-6 overflow-hidden rounded-3xl p-3">
        <ColoringGarden stage={stage} className="text-foreground/70" />
      </div>

      <p className="mt-5 text-center text-sm leading-relaxed text-muted-foreground">
        {unlocked
          ? "Your garden is fully in bloom — the downloadable coloring page is unlocked. Enjoy it, then keep the streak going."
          : "Every streak day adds a splash of color. Complete a 7-day streak to unlock a downloadable coloring page."}
      </p>

      {unlocked ? (
        <p className="animate-scale-in mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-xs font-semibold text-on-tint">
          <Check className="size-3.5" aria-hidden /> Reward unlocked
        </p>
      ) : (
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3.5" aria-hidden /> Unlocks on day {STREAK_UNLOCK_TARGET}
        </p>
      )}

      <div className="mt-auto space-y-3 pt-8">
        {unlocked ? (
          <Button
            className="h-12 w-full rounded-2xl"
            disabled={downloading}
            onClick={async () => {
              haptic.medium();
              setDownloading(true);
              await downloadColoringPage(printRef.current);
              setDownloading(false);
            }}
          >
            <Download className="mr-2 size-4" aria-hidden />
            {downloading ? "Preparing…" : "Download Coloring Page"}
          </Button>
        ) : null}
        <Button
          variant={unlocked ? "secondary" : "default"}
          className="h-12 w-full rounded-2xl"
          onClick={dismiss}
        >
          Continue
        </Button>
      </div>

      {/* Hidden printable line-art version used for the download. */}
      <div className="pointer-events-none absolute -z-10 size-0 overflow-hidden" aria-hidden>
        <ColoringGarden ref={printRef} stage={0} monochrome />
      </div>
    </div>
  );
}
