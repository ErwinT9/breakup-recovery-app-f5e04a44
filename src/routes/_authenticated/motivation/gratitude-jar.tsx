import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SubScreen } from "@/components/SubScreen";
import { CandyIcon, HeartIcon, LeafIcon } from "@/components/illustrations/wellness";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { gratitudeRepo } from "@/data/repository";
import type { GratitudeEntry, GratitudeItemType } from "@/data/types";
import { useAuth } from "@/hooks/useAuth";
import { humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/motivation/gratitude-jar")({
  head: () => ({
    meta: [
      { title: "Gratitude Jar | No Contact Tracker" },
      {
        name: "description",
        content: "Fill your jar with small things you are grateful for, one entry at a time.",
      },
      { property: "og:title", content: "Gratitude Jar | No Contact Tracker" },
      {
        property: "og:description",
        content: "Every entry is a step towards a more joyful mindset.",
      },
    ],
  }),
  component: GratitudeJarScreen,
});

const CHOICES: { type: GratitudeItemType; label: string; Icon: typeof CandyIcon; tint: string }[] = [
  { type: "candy", label: "Candy", Icon: CandyIcon, tint: "bg-blush" },
  { type: "heart", label: "Heart", Icon: HeartIcon, tint: "bg-sand" },
  { type: "leaf", label: "Leaf", Icon: LeafIcon, tint: "bg-mint" },
];

const ICONS: Record<GratitudeItemType, typeof CandyIcon> = {
  candy: CandyIcon,
  heart: HeartIcon,
  leaf: LeafIcon,
};

type Stage = "jar" | "choose" | "write";

function GratitudeJarScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("jar");
  const [choice, setChoice] = useState<GratitudeItemType>("heart");
  const [text, setText] = useState("");
  const [droppingId, setDroppingId] = useState<string | null>(null);

  const entries = useQuery({
    queryKey: ["gratitude", userId],
    queryFn: () => gratitudeRepo.list(userId),
    enabled: Boolean(userId),
  });

  const save = useMutation({
    mutationFn: async (value: string) =>
      gratitudeRepo.save(userId, { gratitude_text: value, item_type: choice }),
    onSuccess: (rows) => {
      queryClient.setQueryData(["gratitude", userId], rows);
      setDroppingId(rows[0]?.id ?? null);
      setText("");
      setStage("jar");
      haptic.success();
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  if (stage === "choose") {
    return (
      <SubScreen
        title="Add to your jar"
        description="Pick something to drop into the jar."
        headerClassName="bg-sand/50"
      >
        <ul className="space-y-3">
          {CHOICES.map(({ type, label, Icon, tint }) => (
            <li key={type}>
              <button
                type="button"
                onClick={() => {
                  haptic.select();
                  setChoice(type);
                  setStage("write");
                }}
                className="press soft-card flex w-full items-center gap-4 rounded-3xl p-4 text-left"
              >
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl p-2.5",
                    tint,
                  )}
                >
                  <Icon />
                </span>
                <span className="font-medium">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </SubScreen>
    );
  }

  if (stage === "write") {
    return (
      <WriteGratitude
        value={text}
        onChange={setText}
        pending={save.isPending}
        onBack={() => {
          haptic.light();
          setStage("choose");
        }}
        onDone={() => {
          if (save.isPending) return;
          const value = text.trim();
          if (!value) {
            toast.error("Write something you're grateful for first.");
            return;
          }
          save.mutate(value);
        }}
      />
    );
  }

  const items = entries.data ?? [];

  return (
    <SubScreen
      title="Great Job!"
      description="Every entry is a step towards a more joyful mindset."
      headerClassName="bg-sand/50"
    >
      <Jar items={items} droppingId={droppingId} loading={entries.isLoading} />

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {entries.isLoading
          ? "Opening your jar…"
          : items.length === 0
            ? "Your jar is empty — add your first gratitude."
            : `${items.length} ${items.length === 1 ? "entry" : "entries"} inside`}
      </p>

      <Button
        className="press mt-6 h-12 w-full rounded-2xl"
        onClick={() => {
          haptic.select();
          setStage("choose");
        }}
      >
        Add More
      </Button>
    </SubScreen>
  );
}

/** Deterministic placement so items keep their spot across restarts. */
function slot(index: number) {
  const perRow = 4;
  const row = Math.floor(index / perRow);
  const col = index % perRow;
  const jitter = ((index * 37) % 11) - 5;
  return {
    left: `${10 + col * 22 + jitter}%`,
    bottom: `${6 + row * 15}%`,
    rotate: `${((index * 53) % 40) - 20}deg`,
  };
}

function Jar({
  items,
  droppingId,
  loading,
}: {
  items: GratitudeEntry[];
  droppingId: string | null;
  loading: boolean;
}) {
  // Oldest at the bottom of the jar.
  const stacked = [...items].reverse().slice(-24);
  return (
    <div className="relative mx-auto h-64 w-52">
      {/* lid */}
      <div className="absolute inset-x-6 top-0 h-6 rounded-t-2xl bg-[#C9B79B] dark:bg-[#6E6250]" />
      {/* glass */}
      <div className="absolute inset-x-0 bottom-0 top-6 overflow-hidden rounded-b-[2.5rem] rounded-t-3xl border-4 border-sky/70 bg-sky/20 backdrop-blur-[1px]">
        <span className="absolute left-4 top-4 h-24 w-3 rounded-full bg-background/40" aria-hidden />
        {loading
          ? null
          : stacked.map((entry, index) => {
              const Icon = ICONS[entry.item_type] ?? HeartIcon;
              const position = slot(index);
              return (
                <span
                  key={entry.id}
                  title={entry.gratitude_text}
                  className={cn(
                    "absolute block size-9",
                    entry.id === droppingId ? "jar-drop" : undefined,
                  )}
                  style={{
                    left: position.left,
                    bottom: position.bottom,
                    transform: `rotate(${position.rotate})`,
                  }}
                >
                  <Icon />
                </span>
              );
            })}
      </div>
    </div>
  );
}

function WriteGratitude({
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
        <h1 className="text-xl font-semibold tracking-tight">What are you grateful for today?</h1>
        <Textarea
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Something small counts too…"
          className="mt-4 min-h-[45vh] rounded-3xl text-[0.95rem] leading-relaxed"
        />
      </main>
    </div>
  );
}
