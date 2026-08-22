import { Check, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CalmOrb } from "@/components/CalmOrb";
import { MeditationSession } from "@/components/MeditationSession";
import { SubScreen } from "@/components/SubScreen";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { JourneyProgress } from "@/data/types";
import { MEDITATION_TRACKS, type MeditationTrack, formatClock } from "@/lib/meditation";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { MeditationPicker } from "@/routes/_authenticated/motivation/meditation";

export type ActivityProps = {
  progress: JourneyProgress | undefined;
  /** Records today's local calendar date once (multi-day activities). */
  onMarkDay: () => Promise<void>;
  onComplete: (data?: Record<string, unknown>) => Promise<void>;
  onExit: () => void;
  busy: boolean;
};

function daysCount(progress: JourneyProgress | undefined) {
  return progress?.day_dates?.length ?? 0;
}

/** Small calm "done" animation shared by every activity. */
function CompletionPanel({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center py-8 duration-500">
      <span className="flex size-20 items-center justify-center rounded-full bg-mint animate-[pulse_2.4s_ease-in-out_infinite]">
        <Check className="size-9 text-on-tint" aria-hidden />
      </span>
      <p className="mt-6 text-center text-base font-medium">{message}</p>
      <Button className="press mt-8 h-12 w-full rounded-2xl" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

/* ---------------- Activity 1 — Understand Your Feelings ---------------- */

const EMOTIONS = [
  { key: "sad", label: "Sad" },
  { key: "anxious", label: "Anxious" },
  { key: "angry", label: "Angry" },
  { key: "lonely", label: "Lonely" },
  { key: "confused", label: "Confused" },
  { key: "relieved", label: "Relieved" },
  { key: "hopeful", label: "Hopeful" },
  { key: "peaceful", label: "Peaceful" },
  { key: "other", label: "Other" },
] as const;

const HEAVY = new Set(["sad", "anxious", "angry", "lonely", "confused"]);
const LIGHT = new Set(["relieved", "hopeful", "peaceful"]);

function supportiveResponse(selected: string[]): string {
  const heavy = selected.filter((key) => HEAVY.has(key));
  const light = selected.filter((key) => LIGHT.has(key));
  const names = selected
    .map((key) => EMOTIONS.find((emotion) => emotion.key === key)?.label.toLowerCase())
    .filter(Boolean) as string[];
  const list =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "this");

  if (heavy.length && light.length) {
    return `Feeling ${list} at the same time makes sense — healing rarely moves in one direction. Both the heavy parts and the lighter ones belong to you right now.`;
  }
  if (light.length && !heavy.length) {
    return `Noticing ${list} is worth pausing on. These moments are quiet proof that something inside you is settling.`;
  }
  if (heavy.length) {
    return `Feeling ${list} today is not a setback — it's your mind processing something that mattered. You don't have to fix it right now; naming it is already the work.`;
  }
  return "Whatever you're carrying today, naming it is already a step toward understanding it.";
}

export function FeelingsActivity({ progress, onComplete, onExit, busy }: ActivityProps) {
  const [selected, setSelected] = useState<string[]>(
    (progress?.data?.['emotions'] as string[] | undefined) ?? [],
  );
  const [note, setNote] = useState((progress?.data?.['note'] as string | undefined) ?? "");
  const [done, setDone] = useState(false);

  const toggle = (key: string) => {
    haptic.select();
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  if (done) {
    return (
      <SubScreen title="Understand Your Feelings">
        <CompletionPanel
          message="You took the time to listen to yourself. Your next step is ready."
          actionLabel="Back to Journey"
          onAction={onExit}
        />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Understand Your Feelings"
      description="Take a moment to check in with yourself and better understand what you are feeling right now."
    >
      <p className="soft-card rounded-3xl p-5 text-sm text-muted-foreground">
        There is no right or wrong emotion here. Whatever comes up is simply information about where
        you are today.
      </p>

      <h2 className="mt-6 px-1 font-semibold">How are you feeling right now?</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {EMOTIONS.map((emotion) => {
          const active = selected.includes(emotion.key);
          return (
            <li key={emotion.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(emotion.key)}
                className={cn(
                  "press rounded-full border border-border px-4 py-2 text-sm",
                  active ? "bg-mint text-on-tint border-transparent" : "bg-background",
                )}
              >
                {emotion.label}
              </button>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 ? (
        <div className="animate-in fade-in mt-6 duration-300">
          <h2 className="px-1 font-semibold">What is contributing most to these feelings today?</h2>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional — write as much or as little as you like."
            className="mt-3 min-h-28 rounded-2xl"
          />
          <p className="soft-card mt-5 rounded-3xl p-5 text-sm">{supportiveResponse(selected)}</p>
        </div>
      ) : null}

      <Button
        className="press mt-8 h-12 w-full rounded-2xl"
        disabled={selected.length === 0 || busy}
        onClick={async () => {
          await onComplete({ emotions: selected, note });
          haptic.success();
          setDone(true);
        }}
      >
        Complete Activity
      </Button>
    </SubScreen>
  );
}

/* ---------------- Activity 2 — 2-Minute Breathing ---------------- */

const BREATH_PHASES = [
  { label: "Breathe In", seconds: 4, scale: 1 },
  { label: "Hold", seconds: 2, scale: 1 },
  { label: "Breathe Out", seconds: 6, scale: 0.62 },
] as const;

const BREATH_TOTAL = 120;

export function BreathingActivity({ progress, onMarkDay, onComplete, onExit, busy }: ActivityProps) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState<number>(BREATH_TOTAL);
  const [phase, setPhase] = useState(0);
  const [, setPhaseLeft] = useState<number>(BREATH_PHASES[0]!.seconds);
  const [sessionDone, setSessionDone] = useState(false);
  const [done, setDone] = useState(false);
  const markedRef = useRef(false);

  const days = daysCount(progress);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setLeft((value) => Math.max(0, value - 1));
      setPhaseLeft((value) => {
        if (value > 1) return value - 1;
        setPhase((index) => (index + 1) % BREATH_PHASES.length);
        return BREATH_PHASES[(phase + 1) % BREATH_PHASES.length]!.seconds;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, phase]);

  useEffect(() => {
    if (left > 0 || sessionDone) return;
    setRunning(false);
    setSessionDone(true);
    haptic.success();
    if (!markedRef.current) {
      markedRef.current = true;
      void onMarkDay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, sessionDone]);

  if (done) {
    return (
      <SubScreen title="2-Minute Breathing Exercise">
        <CompletionPanel
          message="Two moments of calm can make a difference. Keep going."
          actionLabel="Back to Journey"
          onAction={onExit}
        />
      </SubScreen>
    );
  }

  const current = BREATH_PHASES[phase]!;
  const daysAfterSession = sessionDone ? Math.max(days, 1) : days;

  return (
    <SubScreen
      title="2-Minute Breathing Exercise"
      description="Slow down, focus on your breathing, and give your mind a moment of calm."
    >
      <div className="relative mx-auto my-8 flex size-56 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-mint/40 blur-xl transition-transform ease-in-out"
          style={{
            transform: `scale(${running ? current.scale : 0.8})`,
            transitionDuration: `${current.seconds * 1000}ms`,
          }}
        />
        <span
          className="absolute inset-8 rounded-full bg-sky/60 transition-transform ease-in-out"
          style={{
            transform: `scale(${running ? current.scale : 0.8})`,
            transitionDuration: `${current.seconds * 1000}ms`,
          }}
        />
        <div className="relative text-center">
          <p className="text-lg font-semibold">{sessionDone ? "Complete" : current.label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{formatClock(left)}</p>
        </div>
      </div>

      {sessionDone ? (
        <>
          <p className="soft-card rounded-3xl p-5 text-center text-sm">
            {daysAfterSession >= 2
              ? "You've practised on two different days. You can finish this activity now."
              : "Day 1 of 2 complete. Come back another day to continue your practice."}
          </p>
          {daysAfterSession >= 2 ? (
            <Button
              className="press mt-6 h-12 w-full rounded-2xl"
              disabled={busy}
              onClick={async () => {
                await onComplete();
                haptic.success();
                setDone(true);
              }}
            >
              Complete Activity
            </Button>
          ) : (
            <Button variant="secondary" className="press mt-6 h-12 w-full rounded-2xl" onClick={onExit}>
              Back to Journey
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="text-center text-sm text-muted-foreground">
            {days >= 1 ? `Day ${Math.min(days + 1, 2)} of 2` : "Day 1 of 2"}
          </p>
          <div className="mt-6 flex gap-3">
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
                  <Play className="size-4" aria-hidden /> {left === BREATH_TOTAL ? "Start" : "Resume"}
                </>
              )}
            </Button>
            <Button variant="secondary" className="press h-12 flex-1 rounded-2xl" onClick={onExit}>
              Exit
            </Button>
          </div>
        </>
      )}
    </SubScreen>
  );
}

/* ---------------- Activity 3 — Ground Yourself ---------------- */

const GROUND_STEPS = [
  "Look around and notice 5 things you can see.",
  "Notice 4 things you can physically feel or touch.",
  "Listen for 3 sounds around you.",
  "Notice 2 things you can smell.",
  "Take a slow breath and notice 1 thing you appreciate in this moment.",
];

const GROUND_ANSWERS = ["More calm", "A little better", "About the same", "Still overwhelmed"];

export function GroundingActivity({ onComplete, onExit, busy }: ActivityProps) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const atEnd = step >= GROUND_STEPS.length;

  if (done) {
    return (
      <SubScreen title="Ground Yourself">
        <CompletionPanel
          message="You brought yourself back to the present moment."
          actionLabel="Back to Journey"
          onAction={onExit}
        />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Ground Yourself"
      description="When your thoughts feel overwhelming, bring your attention back to the present moment."
    >
      <CalmOrb className="my-4 scale-90" />

      {atEnd ? (
        <div className="animate-in fade-in duration-300">
          <h2 className="px-1 font-semibold">How do you feel now compared with before?</h2>
          <ul className="mt-3 space-y-2">
            {GROUND_ANSWERS.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  aria-pressed={answer === option}
                  onClick={() => {
                    haptic.select();
                    setAnswer(option);
                  }}
                  className={cn(
                    "press soft-card w-full rounded-2xl p-4 text-left text-sm",
                    answer === option && "bg-mint text-on-tint",
                  )}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            disabled={!answer || busy}
            onClick={async () => {
              await onComplete({ after_feeling: answer });
              haptic.success();
              setDone(true);
            }}
          >
            Complete Activity
          </Button>
        </div>
      ) : (
        <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="px-1 text-sm text-muted-foreground">
            Step {step + 1} of {GROUND_STEPS.length}
          </p>
          <p className="soft-card mt-3 rounded-3xl p-6 text-lg font-medium">{GROUND_STEPS[step]}</p>
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            onClick={() => {
              haptic.light();
              setStep((value) => value + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </SubScreen>
  );
}

/* ---------------- Activity 4 — Mindful Meditation (4 days) ---------------- */

export function MeditationActivity({ progress, onMarkDay, onComplete, onExit, busy }: ActivityProps) {
  const [selected, setSelected] = useState<MeditationTrack>(MEDITATION_TRACKS[0]!);
  const [session, setSession] = useState<MeditationTrack | null>(null);
  const [justFinished, setJustFinished] = useState(false);
  const [done, setDone] = useState(false);

  const days = daysCount(progress);
  const shownDays = Math.min(4, justFinished ? Math.max(days, 1) : days);
  const dayMessage = useMemo(() => {
    if (shownDays >= 4) return "Four days of practice complete. You can finish this activity now.";
    if (shownDays === 3) return "Day 3 of 4 complete. One more day remains in your mindfulness practice.";
    if (shownDays === 2) return "Day 2 of 4 complete. Come back another day to continue your mindfulness practice.";
    return "Day 1 of 4 complete. Come back another day to continue your mindfulness practice.";
  }, [shownDays]);

  if (done) {
    return (
      <SubScreen title="Mindful Meditation">
        <CompletionPanel
          message="You made space for yourself, returned to the present, and built a mindful practice over four days."
          actionLabel="Back to Journey"
          onAction={onExit}
        />
      </SubScreen>
    );
  }

  if (session) {
    return (
      <MeditationSession
        track={session}
        onExit={() => setSession(null)}
        onComplete={() => {
          setJustFinished(true);
          void onMarkDay();
        }}
        completionMessage={dayMessage}
      />
    );
  }

  return (
    <SubScreen
      title="Mindful Meditation"
      description="Take a few quiet minutes to slow down, relax, and create space for calmness and clarity."
    >
      <CalmOrb className="my-5" />

      <p className="soft-card rounded-3xl p-5 text-sm text-muted-foreground">
        This activity uses the app's Mindful Meditation session. Complete a session on four
        different days to finish it — {shownDays} of 4 done so far.
      </p>

      {justFinished ? (
        <p className="animate-in fade-in soft-card mt-4 rounded-3xl p-5 text-center text-sm duration-500">
          {dayMessage}
        </p>
      ) : null}

      <h2 className="mt-6 px-1 text-sm font-medium text-muted-foreground">Choose a sound</h2>
      <MeditationPicker selected={selected} onSelect={setSelected} />

      <Button
        className="press mt-6 h-12 w-full rounded-2xl"
        onClick={() => {
          haptic.success();
          setJustFinished(false);
          setSession(selected);
        }}
      >
        Begin Meditation
      </Button>

      {shownDays >= 4 ? (
        <Button
          variant="secondary"
          className="press mt-3 h-12 w-full rounded-2xl"
          disabled={busy}
          onClick={async () => {
            await onComplete();
            haptic.success();
            setDone(true);
          }}
        >
          Complete Activity
        </Button>
      ) : null}
    </SubScreen>
  );
}

/* ---------------- Activity 5 — Calm Reflection ---------------- */

const PROMPTS = [
  "What helped you feel calmer during this level?",
  "What thoughts or feelings would you like to let go of?",
  "What is one thing you can do for yourself when stress or anxiety appears?",
];

export function ReflectionActivity({ progress, onComplete, onExit, busy }: ActivityProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(
    (progress?.data?.['answers'] as string[] | undefined) ?? ["", "", ""],
  );
  const [done, setDone] = useState(false);
  const atSummary = step >= PROMPTS.length;

  if (done) {
    return (
      <SubScreen title="Level 1 Complete">
        <CompletionPanel
          message="You've taken your first steps toward understanding your emotions and finding moments of calm."
          actionLabel="Back to Journey"
          onAction={onExit}
        />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Calm Reflection"
      description="Take a quiet moment to reflect on what helped you feel calmer and what you want to carry forward."
    >
      {atSummary ? (
        <div className="animate-in fade-in flex flex-col items-center py-8 duration-500">
          <span className="flex size-20 items-center justify-center rounded-full bg-lavender">
            <Sparkles className="size-9 text-on-tint" aria-hidden />
          </span>
          <p className="mt-6 text-center text-lg font-semibold">
            You completed Level 1: Find Your Calm.
          </p>
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            disabled={busy}
            onClick={async () => {
              await onComplete({ answers });
              setDone(true);
            }}
          >
            Complete Level
          </Button>
        </div>
      ) : (
        <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="px-1 text-sm text-muted-foreground">
            Reflection {step + 1} of {PROMPTS.length}
          </p>
          <p className="mt-3 px-1 text-lg font-medium">{PROMPTS[step]}</p>
          <Textarea
            value={answers[step] ?? ""}
            onChange={(event) =>
              setAnswers((current) => {
                const next = [...current];
                next[step] = event.target.value;
                return next;
              })
            }
            placeholder="Optional — you can skip this one."
            className="mt-3 min-h-32 rounded-2xl"
          />
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            onClick={() => {
              haptic.light();
              setStep((value) => value + 1);
            }}
          >
            {step === PROMPTS.length - 1 ? "Finish reflection" : "Next"}
          </Button>
        </div>
      )}
    </SubScreen>
  );
}
