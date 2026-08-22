import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SubScreen } from "@/components/SubScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityProps } from "@/components/journey/activities";
import { affirmationRepo, journalRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

/* Shared bits ------------------------------------------------------- */

function CompletionPanel({
  message,
  onExit,
}: {
  message: string;
  onExit: () => void;
}) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center py-8 duration-500">
      <span className="flex size-20 items-center justify-center rounded-full bg-mint animate-[pulse_2.4s_ease-in-out_infinite]">
        <Check className="size-9 text-on-tint" aria-hidden />
      </span>
      <p className="mt-6 text-center text-base font-medium">{message}</p>
      <Button className="press mt-8 h-12 w-full rounded-2xl" onClick={onExit}>
        Back to Journey
      </Button>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press rounded-full border border-border px-4 py-2 text-sm",
        active ? "bg-mint text-on-tint border-transparent" : "bg-background",
      )}
    >
      {label}
    </button>
  );
}

function dayMessage(days: number, required: number): string {
  if (days >= required) return "You've practised on enough different days. You can finish this activity now.";
  if (required - days === 1) return `Day ${days} of ${required} complete. One more day remains.`;
  if (days === 0) return `Day 0 of ${required} complete. Save today to begin.`;
  return `Day ${days} of ${required} complete. Return another day to continue.`;
}

/* Activity 1 — Daily Journal ---------------------------------------- */

export function JourneyJournalActivity({ progress, onMarkDay, onComplete, onExit, busy }: ActivityProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const days = progress?.day_dates?.length ?? 0;

  const save = useMutation({
    mutationFn: async () => {
      const rows = await journalRepo.save(userId, {
        body: body.trim(),
        title: title.trim() || null,
      });
      queryClient.setQueryData(["journal", userId], rows);
      await onMarkDay();
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      haptic.success();
      toast.success("Journal entry saved.");
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  if (done) {
    return (
      <SubScreen title="Daily Journal">
        <CompletionPanel
          message="Reflecting on your days helps your mind put them down. Your next step is ready."
          onExit={onExit}
        />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Daily Journal"
      description="Take a few moments to reflect on your day, thoughts, and feelings."
    >
      <p className="soft-card rounded-3xl p-5 text-sm text-muted-foreground">
        Entries you write here are saved to your Journal. Save on 2 different days to finish this
        activity — the days do not need to be in a row.
      </p>

      <div className="soft-card mt-5 space-y-3 rounded-3xl p-5">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What is on your mind today?"
          className="min-h-32 rounded-2xl"
        />
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Give it a title (optional)"
          className="h-12 rounded-2xl"
        />
        <Button
          className="press h-12 w-full rounded-2xl"
          disabled={!body.trim() || save.isPending || busy}
          onClick={() => save.mutate()}
        >
          Save entry
        </Button>
      </div>

      <p className="mt-5 px-1 text-center text-sm text-muted-foreground">{dayMessage(days, 2)}</p>

      {days >= 2 ? (
        <Button
          className="press mt-4 h-12 w-full rounded-2xl"
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
        <Button variant="secondary" className="press mt-4 h-12 w-full rounded-2xl" onClick={onExit}>
          Back to Journey
        </Button>
      )}
    </SubScreen>
  );
}

/* Activity 2 — Prepare Your Mind for Rest ---------------------------- */

const FEELINGS = ["Relaxed", "Tense", "Tired", "Restless", "Overwhelmed"];
const CALM_ACTIONS = [
  "Put away my phone",
  "Dim the lights",
  "Drink some water",
  "Stretch for a minute",
  "Play something quiet",
];

export function PrepareRestActivity({ progress, onComplete, onExit, busy }: ActivityProps) {
  const [step, setStep] = useState(0);
  const [feeling, setFeeling] = useState<string | null>(
    (progress?.data?.["feeling"] as string | undefined) ?? null,
  );
  const [action, setAction] = useState<string | null>(
    (progress?.data?.["action"] as string | undefined) ?? null,
  );
  const [custom, setCustom] = useState("");
  const [done, setDone] = useState(false);
  const chosenAction = action ?? (custom.trim() || null);

  if (done) {
    return (
      <SubScreen title="Prepare Your Mind for Rest">
        <CompletionPanel message="You created a gentler ending to your day." onExit={onExit} />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Prepare Your Mind for Rest"
      description="Create a gentle transition between your busy day and a more peaceful state of rest."
    >
      {step === 0 ? (
        <div className="animate-in fade-in duration-300">
          <p className="soft-card rounded-3xl p-5 text-sm text-muted-foreground">
            Take a slow breath and let your shoulders drop. There is nothing left to solve tonight —
            this is simply the moment you start slowing down.
          </p>
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            onClick={() => {
              haptic.light();
              setStep(1);
            }}
          >
            I've slowed down
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="animate-in fade-in duration-300">
          <h2 className="px-1 font-semibold">How do your body and mind feel right now?</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {FEELINGS.map((item) => (
              <li key={item}>
                <Chip
                  label={item}
                  active={feeling === item}
                  onClick={() => {
                    haptic.select();
                    setFeeling(item);
                  }}
                />
              </li>
            ))}
          </ul>
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            disabled={!feeling}
            onClick={() => {
              haptic.light();
              setStep(2);
            }}
          >
            Continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="animate-in fade-in duration-300">
          <h2 className="px-1 font-semibold">Choose one small calming action</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {CALM_ACTIONS.map((item) => (
              <li key={item}>
                <Chip
                  label={item}
                  active={action === item}
                  onClick={() => {
                    haptic.select();
                    setAction(item);
                    setCustom("");
                  }}
                />
              </li>
            ))}
          </ul>
          <Input
            value={custom}
            onChange={(event) => {
              setCustom(event.target.value);
              setAction(null);
            }}
            placeholder="Or write your own calming action"
            className="mt-4 h-12 rounded-2xl"
          />
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            disabled={!chosenAction || busy}
            onClick={async () => {
              await onComplete({ feeling, action: chosenAction });
              haptic.success();
              setDone(true);
            }}
          >
            Complete Activity
          </Button>
        </div>
      ) : null}
    </SubScreen>
  );
}

/* Activity 3 — Let Go of Today's Thoughts ---------------------------- */

export function LetGoActivity({ progress, onComplete, onExit, busy }: ActivityProps) {
  const [thought, setThought] = useState((progress?.data?.["thought"] as string | undefined) ?? "");
  const [message, setMessage] = useState((progress?.data?.["message"] as string | undefined) ?? "");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <SubScreen title="Let Go of Today's Thoughts">
        <CompletionPanel
          message="You put the day down. Your reflection is saved for whenever you want to revisit it."
          onExit={onExit}
        />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Let Go of Today's Thoughts"
      description="Put down the thoughts still following you from today and give your mind permission to rest."
    >
      {step === 0 ? (
        <div className="animate-in fade-in duration-300">
          <h2 className="px-1 font-semibold">
            What thought, worry, memory, or situation is still taking up space in your mind?
          </h2>
          <Textarea
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            placeholder="Write it down — it stays private and is never deleted unless you choose to."
            className="mt-3 min-h-32 rounded-2xl"
          />
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            disabled={!thought.trim()}
            onClick={() => {
              haptic.light();
              setStep(1);
            }}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <h2 className="px-1 font-semibold">
            What would you like to tell yourself before letting this thought rest for now?
          </h2>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="A kind, honest sentence to yourself."
            className="mt-3 min-h-32 rounded-2xl"
          />
          <Button
            className="press mt-8 h-12 w-full rounded-2xl"
            disabled={!message.trim() || busy}
            onClick={async () => {
              await onComplete({ thought, message });
              haptic.success();
              setDone(true);
            }}
          >
            Complete Activity
          </Button>
        </div>
      )}
    </SubScreen>
  );
}

/* Activity 4 — Write an Affirmation ---------------------------------- */

const AFFIRMATION_IDEAS = [
  "I am allowed to rest tonight.",
  "I am healing at my own pace.",
  "I choose myself today.",
];

export function JourneyAffirmationActivity({
  progress,
  onMarkDay,
  onComplete,
  onExit,
  busy,
}: ActivityProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const days = progress?.day_dates?.length ?? 0;

  const save = useMutation({
    mutationFn: async (value: string) => {
      const rows = await affirmationRepo.save(userId, { body: value });
      queryClient.setQueryData(["affirmations", userId], rows);
      await onMarkDay();
    },
    onSuccess: () => {
      setBody("");
      haptic.success();
      toast.success("Affirmation saved.");
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  if (done) {
    return (
      <SubScreen title="Write an Affirmation">
        <CompletionPanel
          message="You built a kinder voice for yourself, one day at a time."
          onExit={onExit}
        />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Write an Affirmation"
      description="Create a supportive message for yourself and return to it over several different days."
    >
      <p className="soft-card rounded-3xl p-5 text-sm text-muted-foreground">
        Affirmations you write here are saved to your Affirmations list. Practise on 4 different days
        — they do not need to be in a row.
      </p>

      <div className="soft-card mt-5 space-y-3 rounded-3xl p-5">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write something you would like to hear today."
          className="min-h-28 rounded-2xl"
        />
        <Button
          className="press h-12 w-full rounded-2xl"
          disabled={!body.trim() || save.isPending || busy}
          onClick={() => save.mutate(body.trim())}
        >
          Save affirmation
        </Button>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {AFFIRMATION_IDEAS.map((idea) => (
          <li key={idea}>
            <Chip label={idea} active={false} onClick={() => setBody(idea)} />
          </li>
        ))}
      </ul>

      <p className="mt-5 px-1 text-center text-sm text-muted-foreground">{dayMessage(days, 4)}</p>

      {days >= 4 ? (
        <Button
          className="press mt-4 h-12 w-full rounded-2xl"
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
        <Button variant="secondary" className="press mt-4 h-12 w-full rounded-2xl" onClick={onExit}>
          Back to Journey
        </Button>
      )}
    </SubScreen>
  );
}

/* Activity 5 — Build Your Sleep Routine ------------------------------ */

const ROUTINE_STEPS = [
  "Put away my phone",
  "Dim the lights",
  "Stretch gently",
  "Write in my journal",
  "Slow breathing",
  "Read a few pages",
];

export function SleepRoutineActivity({ progress, onComplete, onExit, busy }: ActivityProps) {
  const saved = progress?.data ?? {};
  const [time, setTime] = useState((saved["wind_down_time"] as string | undefined) ?? "22:00");
  const [steps, setSteps] = useState<string[]>((saved["steps"] as string[] | undefined) ?? []);
  const [custom, setCustom] = useState("");
  const [savedOnce, setSavedOnce] = useState(Boolean(saved["steps"]));
  const [done, setDone] = useState(false);

  const toggle = (step: string) => {
    haptic.select();
    setSavedOnce(false);
    setSteps((current) =>
      current.includes(step) ? current.filter((item) => item !== step) : [...current, step],
    );
  };

  if (done) {
    return (
      <SubScreen title="Level 2 Complete">
        <CompletionPanel
          message="You completed Level 2: Rest & Recharge. Your routine is saved for the nights ahead."
          onExit={onExit}
        />
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Build Your Sleep Routine"
      description="Create a simple and realistic routine that helps your mind and body prepare for better rest."
    >
      <div className="soft-card rounded-3xl p-5">
        <h2 className="font-semibold">Wind-down time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The time you'd like to start slowing down each night.
        </p>
        <Input
          type="time"
          value={time}
          onChange={(event) => {
            setTime(event.target.value);
            setSavedOnce(false);
          }}
          className="mt-3 h-12 w-40 rounded-2xl"
        />
      </div>

      <h2 className="mt-6 px-1 font-semibold">Choose your steps</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {ROUTINE_STEPS.map((step) => (
          <li key={step}>
            <Chip label={step} active={steps.includes(step)} onClick={() => toggle(step)} />
          </li>
        ))}
        {steps
          .filter((step) => !ROUTINE_STEPS.includes(step))
          .map((step) => (
            <li key={step}>
              <Chip label={step} active onClick={() => toggle(step)} />
            </li>
          ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <Input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Add your own step"
          className="h-12 flex-1 rounded-2xl"
        />
        <Button
          variant="secondary"
          className="press h-12 rounded-2xl"
          disabled={!custom.trim()}
          onClick={() => {
            const value = custom.trim();
            setCustom("");
            setSavedOnce(false);
            setSteps((current) => (current.includes(value) ? current : [...current, value]));
          }}
        >
          Add
        </Button>
      </div>

      <Button
        className="press mt-8 h-12 w-full rounded-2xl"
        disabled={steps.length === 0 || busy || savedOnce}
        onClick={async () => {
          await onComplete({ wind_down_time: time, steps, saved_at: new Date().toISOString() });
          haptic.success();
          setSavedOnce(true);
        }}
      >
        {savedOnce ? "Routine saved" : "Save routine"}
      </Button>

      {savedOnce ? (
        <Button
          className="press mt-3 h-12 w-full rounded-2xl"
          disabled={busy}
          onClick={() => {
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
