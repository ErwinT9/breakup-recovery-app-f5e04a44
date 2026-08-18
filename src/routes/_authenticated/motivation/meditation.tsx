import { createFileRoute } from "@tanstack/react-router";
import { CloudRain, Feather, Pause, Play, Square, Waves, Wind } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CalmOrb } from "@/components/CalmOrb";
import { SubScreen } from "@/components/SubScreen";
import { Button } from "@/components/ui/button";
import { formatClock, MEDITATION_TRACKS, type MeditationTrack } from "@/lib/meditation";
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

const ICONS = {
  calm: Wind,
  peace: Feather,
  rain: CloudRain,
  wave: Waves,
} as const;

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
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {MEDITATION_TRACKS.map((track) => {
          const Icon = ICONS[track.id];
          const active = selected.id === track.id;
          return (
            <li key={track.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  haptic.select();
                  setSelected(track);
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

function MeditationSession({ track, onExit }: { track: MeditationTrack; onExit: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [complete, setComplete] = useState(false);

  // One audio element per session; every listener and the element itself are
  // torn down on unmount so no track can keep playing in the background.
  useEffect(() => {
    const audio = new Audio(track.src);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => setElapsed(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setComplete(true);
      haptic.success();
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    void audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
      audio.load();
      audioRef.current = null;
    };
  }, [track.src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || complete) return;
    haptic.select();
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const stop = () => {
    haptic.light();
    onExit();
  };

  const remaining = duration > 0 ? Math.max(0, duration - elapsed) : 0;
  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  return (
    <SubScreen title={complete ? "Meditation Complete" : "Mindful Meditation"} description={track.label}>
      <CalmOrb active={playing} className="my-6" />

      <div className="text-center">
        <p className="text-4xl font-semibold tabular-nums">{formatClock(complete ? 0 : remaining)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {duration > 0 ? `of ${formatClock(duration)}` : "Loading audio…"}
        </p>
      </div>

      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${complete ? 100 : progress}%` }}
        />
      </div>

      {complete ? (
        <Button className="press mt-8 h-12 w-full rounded-2xl" onClick={onExit}>
          Done
        </Button>
      ) : (
        <div className="mt-8 flex gap-3">
          <Button className="press h-12 flex-1 rounded-2xl" onClick={toggle}>
            {playing ? (
              <>
                <Pause className="size-4" aria-hidden /> Pause
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden /> Resume
              </>
            )}
          </Button>
          <Button variant="secondary" className="press h-12 flex-1 rounded-2xl" onClick={stop}>
            <Square className="size-4" aria-hidden /> Stop
          </Button>
        </div>
      )}
    </SubScreen>
  );
}