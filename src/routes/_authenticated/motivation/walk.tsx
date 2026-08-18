import { createFileRoute } from "@tanstack/react-router";
import { Flag, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SubScreen } from "@/components/SubScreen";
import { WalkingHeart } from "@/components/WalkingHeart";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { formatClock } from "@/lib/meditation";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/motivation/walk")({
  head: () => ({
    meta: [
      { title: "Outdoor walk | No Contact Tracker" },
      {
        name: "description",
        content: "A simple timed outdoor walk for your body and mind — no GPS, no tracking.",
      },
      { property: "og:title", content: "Outdoor walk | No Contact Tracker" },
      {
        property: "og:description",
        content: "Step outside, start the timer, and notice the beauty of nature as you walk.",
      },
    ],
  }),
  component: WalkScreen,
});

function WalkScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [session, setSession] = useState<number | null>(null);

  if (session) {
    return <WalkSession minutes={session} onExit={() => setSession(null)} />;
  }

  return (
    <SubScreen
      title="Outdoor Walk"
      description="Step outside and bring the full benefits of outdoor walks for your body and mind. Notice and capture the beauty of nature as you walk."
      headerClassName="bg-mint/40"
    >
      <NatureScene />

      <Button
        className="press mt-6 h-12 w-full rounded-2xl"
        onClick={() => {
          haptic.select();
          setSheetOpen(true);
        }}
      >
        Begin Walk
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[2rem] px-5 pb-8">
          <SheetHeader className="px-0">
            <SheetTitle>Play My Walk</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground">Choose how long you want to walk.</p>
          <p className="mt-5 text-center text-4xl font-semibold tabular-nums">
            {minutes}
            <span className="ml-1 text-base font-normal text-muted-foreground">min</span>
          </p>
          <Slider
            className="mt-5"
            min={1}
            max={90}
            step={1}
            value={[minutes]}
            onValueChange={([value]) => setMinutes(value ?? 1)}
            aria-label="Walk duration in minutes"
          />
          <div className="mt-7 flex gap-3">
            <Button
              variant="secondary"
              className="press h-12 flex-1 rounded-2xl"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="press h-12 flex-1 rounded-2xl"
              onClick={() => {
                haptic.success();
                setSheetOpen(false);
                setSession(minutes);
              }}
            >
              Start
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </SubScreen>
  );
}

function NatureScene({ walking = false }: { walking?: boolean }) {
  return (
    <div className="soft-card relative overflow-hidden rounded-[2rem] bg-sky p-6">
      <span className="absolute -right-6 -top-6 size-24 rounded-full bg-[#F7CE68]/70" aria-hidden />
      <span className="absolute -bottom-10 -left-8 size-36 rounded-full bg-[#7FD98A]/50" aria-hidden />
      <span className="absolute -bottom-14 right-0 size-40 rounded-full bg-[#4FB064]/40" aria-hidden />
      <WalkingHeart walking={walking} className="relative" />
    </div>
  );
}

function WalkSession({ minutes, onExit }: { minutes: number; onExit: () => void }) {
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(true);
  const [complete, setComplete] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Single interval, always cleared before a new one starts and on unmount.
  useEffect(() => {
    if (!running || complete) return;
    intervalRef.current = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          setComplete(true);
          haptic.success();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running, complete]);

  const progress = ((total - remaining) / total) * 100;

  return (
    <SubScreen
      title={complete ? "Walk Complete!" : "Outdoor Walk"}
      description={complete ? "Nicely done — that was time spent on you." : `${minutes} minute walk`}
      headerClassName="bg-mint/40"
    >
      {complete ? null : (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            className="press h-10 rounded-2xl"
            onClick={() => {
              haptic.light();
              setRemaining(total);
              setRunning(true);
            }}
          >
            <RotateCcw className="size-4" aria-hidden /> Restart
          </Button>
        </div>
      )}

      <div className="mt-4">
        <NatureScene walking={running && !complete} />
      </div>

      <p className="mt-6 text-center text-5xl font-semibold tabular-nums">{formatClock(remaining)}</p>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${complete ? 100 : progress}%` }}
        />
      </div>

      {complete ? (
        <Button className="press mt-8 h-12 w-full rounded-2xl" onClick={onExit}>
          Done
        </Button>
      ) : (
        <div className="mt-8 space-y-3">
          <div className="flex gap-3">
            <Button
              className="press h-12 flex-1 rounded-2xl"
              onClick={() => {
                haptic.select();
                setRunning((value) => !value);
              }}
            >
              {running ? (
                <>
                  <Pause className="size-4" aria-hidden /> Pause
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden /> Keep Walking
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              className="press h-12 flex-1 rounded-2xl"
              onClick={() => {
                haptic.light();
                setRunning(false);
                setConfirmFinish(true);
              }}
            >
              <Flag className="size-4" aria-hidden /> Finish Walking
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Finish this walk?</AlertDialogTitle>
            <AlertDialogDescription>
              Your timer will stop and the session will end.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRunning(true)}>Keep walking</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Finish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SubScreen>
  );
}