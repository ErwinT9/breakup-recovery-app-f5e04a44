import { Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CalmOrb } from "@/components/CalmOrb";
import { SubScreen } from "@/components/SubScreen";
import { Button } from "@/components/ui/button";
import { formatClock, type MeditationTrack } from "@/lib/meditation";
import { haptic } from "@/lib/native/haptics";

/**
 * Shared meditation player used by the standalone Mindful Meditation screen and
 * by the Journey activity, so there is only ever one meditation implementation.
 * The audio element and every listener are torn down on unmount.
 */
export function MeditationSession({
  track,
  onExit,
  onComplete,
  completionTitle = "Meditation Complete",
  completionMessage,
  doneLabel = "Done",
}: {
  track: MeditationTrack;
  onExit: () => void;
  /** Fired once when the audio session finishes playing. */
  onComplete?: () => void;
  completionTitle?: string;
  completionMessage?: string;
  doneLabel?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [complete, setComplete] = useState(false);

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
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || complete) return;
    haptic.select();
    if (audio.paused) {
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const remaining = duration > 0 ? Math.max(0, duration - elapsed) : 0;
  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  return (
    <SubScreen title={complete ? completionTitle : "Mindful Meditation"} description={track.label}>
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
        <>
          {completionMessage ? (
            <p className="animate-in fade-in mt-6 text-center text-sm text-muted-foreground duration-500">
              {completionMessage}
            </p>
          ) : null}
          <Button className="press mt-8 h-12 w-full rounded-2xl" onClick={onExit}>
            {doneLabel}
          </Button>
        </>
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
          <Button
            variant="secondary"
            className="press h-12 flex-1 rounded-2xl"
            onClick={() => {
              haptic.light();
              onExit();
            }}
          >
            <Square className="size-4" aria-hidden /> Stop
          </Button>
        </div>
      )}
    </SubScreen>
  );
}
