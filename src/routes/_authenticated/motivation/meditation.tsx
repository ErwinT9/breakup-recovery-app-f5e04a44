import { createFileRoute } from "@tanstack/react-router";
import { CloudRain, Feather, Waves, Wind } from "lucide-react";
import { useState } from "react";

import { CalmOrb } from "@/components/CalmOrb";
import { MeditationSession } from "@/components/MeditationSession";
import { SubScreen } from "@/components/SubScreen";
import { Button } from "@/components/ui/button";
import { MEDITATION_TRACKS, type MeditationTrack } from "@/lib/meditation";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/motivation/meditation")({
  head: () => ({
    meta: [
      { title: "Mindful meditation | No Contact Tracker" },
      {
        name: "description",
        content: "A few minutes of guided calm — pick a sound and breathe through the urge.",
      },
      { property: "og:title", content: "Mindful meditation | No Contact Tracker" },
      {
        property: "og:description",
        content: "Create a space of calmness and serenity with a short meditation session.",
      },
    ],
  }),
  component: MeditationScreen,
});

export const MEDITATION_ICONS = {
  calm: Wind,
  peace: Feather,
  rain: CloudRain,
  wave: Waves,
} as const;

/** Shared sound picker so the Journey activity reuses the exact same chooser. */
export function MeditationPicker({
  selected,
  onSelect,
}: {
  selected: MeditationTrack;
  onSelect: (track: MeditationTrack) => void;
}) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-3">
      {MEDITATION_TRACKS.map((track) => {
        const Icon = MEDITATION_ICONS[track.id];
        const active = selected.id === track.id;
        return (
          <li key={track.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => {
                haptic.select();
                onSelect(track);
              }}
              className={cn(
                "press soft-card flex w-full items-center gap-3 rounded-3xl p-4 text-left",
                active && "bg-mint ring-2 ring-primary",
              )}
            >
              <Icon className={cn("size-5 shrink-0", active ? "text-on-tint" : "text-primary")} aria-hidden />
              <span className={cn("text-sm font-medium", active && "text-on-tint")}>{track.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MeditationScreen() {
  const [selected, setSelected] = useState<MeditationTrack>(MEDITATION_TRACKS[0]!);
  const [session, setSession] = useState<MeditationTrack | null>(null);

  if (session) {
    return <MeditationSession track={session} onExit={() => setSession(null)} />;
  }

  return (
    <SubScreen
      title="Mindful Meditation"
      description="Welcome to the few minutes meditation space. Let's create a space of calmness and serenity."
    >
      <CalmOrb className="my-6" />

      <h2 className="px-1 text-sm font-medium text-muted-foreground">Choose a sound</h2>
      <MeditationPicker selected={selected} onSelect={setSelected} />

      <Button
        className="press mt-6 h-12 w-full rounded-2xl"
        onClick={() => {
          haptic.success();
          setSession(selected);
        }}
      >
        Begin Meditation
      </Button>
    </SubScreen>
  );
}
