import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SubScreen } from "@/components/SubScreen";
import { WorryBoxArt } from "@/components/illustrations/wellness";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { worryRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import type { WorryEntry } from "@/data/types";

export const Route = createFileRoute("/_authenticated/motivation/worry-box")({
  head: () => ({
    meta: [
      { title: "Worry Box | No Contact Tracker" },
      {
        name: "description",
        content: "Write down what is worrying you and store it safely until you are ready.",
      },
      { property: "og:title", content: "Worry Box | No Contact Tracker" },
      {
        property: "og:description",
        content: "A calm place to put your worries down for a while.",
      },
    ],
  }),
  component: WorryBoxScreen,
});

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

type Stage = "box" | "write" | "stored";

function WorryBoxScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("box");
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<WorryEntry | null>(null);

  const worries = useQuery({
    queryKey: ["worries", userId],
    queryFn: () => worryRepo.list(userId),
    enabled: Boolean(userId),
  });

  const save = useMutation({
    mutationFn: async (value: string) => worryRepo.save(userId, { worry_text: value }),
    onSuccess: (rows) => {
      queryClient.setQueryData(["worries", userId], rows);
      setSaved(rows[0] ?? null);
      setText("");
      setStage("stored");
      haptic.success();
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const count = worries.data?.length ?? 0;

  if (stage === "write") {
    return (
      <WriteWorry
        value={text}
        onChange={setText}
        pending={save.isPending}
        onBack={() => {
          haptic.light();
          setStage("box");
        }}
        onDone={() => {
          if (save.isPending) return;
          const value = text.trim();
          if (!value) {
            toast.error("Write a worry first.");
            return;
          }
          save.mutate(value);
        }}
      />
    );
  }

  if (stage === "stored") {
    return (
      <SubScreen
        title="Stored safely!"
        description="Process your worries now or revisit them later?"
        headerClassName="bg-sky/40"
      >
        <div className="animate-in fade-in zoom-in-95 soft-card rounded-3xl p-5 duration-500">
          <p className="text-xs text-muted-foreground">
            {saved ? formatLongDate(saved.created_at) : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
            {saved?.worry_text}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setSaved(null);
            setStage("box");
          }}
          className="press mt-10 w-full text-center text-sm text-muted-foreground opacity-50"
        >
          I&apos;ll revisit later
        </button>
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Worry Box"
      description="There are moments we find ourselves overwhelmed by worries. Worry Box will help you when you feel overly anxious."
      headerClassName="bg-sky/40"
    >
      <div className="flex flex-col items-center">
        <div className="relative">
          <WorryBoxArt className="w-56" />
          <CloudCounter count={count} loading={worries.isLoading} />
        </div>

        <Button
          className="press mt-10 h-12 w-full rounded-2xl"
          onClick={() => {
            haptic.select();
            setStage("write");
          }}
        >
          Write Worries
        </Button>
      </div>
    </SubScreen>
  );
}

function CloudCounter({ count, loading }: { count: number; loading: boolean }) {
  return (
    <span className="absolute -right-3 -top-2 flex items-center">
      <span className="relative flex items-center justify-center rounded-full bg-sky px-4 py-2 text-xs font-medium text-on-tint shadow-sm">
        <span className="absolute -bottom-1 left-3 size-3 rounded-full bg-sky" aria-hidden />
        <span className="absolute -bottom-2.5 left-1 size-2 rounded-full bg-sky" aria-hidden />
        {loading ? "…" : `${count} ${count === 1 ? "worry" : "worries"}`}
      </span>
    </span>
  );
}

function WriteWorry({
  value,
  onChange,
  onBack,
  onDone,
  pending,
}: {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onDone: () => void;
  pending: boolean;
}) {
  return (
    <div className="animate-in slide-in-from-right-6 fade-in mx-auto flex min-h-screen w-full max-w-md flex-col duration-300">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-2">
        <Button variant="ghost" className="press h-10 rounded-2xl px-3" onClick={onBack}>
          Back
        </Button>
        <Button className="press h-10 rounded-2xl px-5" disabled={pending} onClick={onDone}>
          {pending ? "Saving…" : "Done"}
        </Button>
      </header>
      <main className="flex-1 px-5 pb-24 pt-4">
        <h1 className="text-xl font-semibold tracking-tight">What am I worrying about?</h1>
        <Textarea
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Let it all out…"
          className="mt-4 min-h-[45vh] rounded-3xl text-[0.95rem] leading-relaxed"
        />
      </main>
    </div>
  );
}
