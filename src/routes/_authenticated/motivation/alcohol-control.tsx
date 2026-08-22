import { createFileRoute } from "@tanstack/react-router";
import { CloudOff, Loader2, Pause, Play, TriangleAlert, Wine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SoftCard } from "@/components/SoftCard";
import { SubScreen } from "@/components/SubScreen";
import { Button } from "@/components/ui/button";
import {
  ALCOHOL_CONTROL_AUDIO_URL,
  ALCOHOL_CONTROL_ERROR_MESSAGE,
  ALCOHOL_CONTROL_OFFLINE_MESSAGE,
  formatAudioClock,
} from "@/lib/alcoholControl";
import { haptic } from "@/lib/native/haptics";
import { refreshNetworkStatus } from "@/lib/offline/network";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/motivation/alcohol-control")({
  head: () => ({
    meta: [
      { title: "Alcohol Control | No Contact Tracker" },
      {
        name: "description",
        content:
          "A calming guided voice session to help you ride out the urge to drink and stay in control.",
      },
      { property: "og:title", content: "Alcohol Control | No Contact Tracker" },
      {
        property: "og:description",
        content: "Stream a supportive audio session for the moments the craving feels loudest.",
      },
    ],
  }),
  component: AlcoholControlScreen,
});

const TIPS = [
  "Cravings peak and pass — usually within twenty minutes.",
  "Drink a full glass of water before you decide anything.",
  "Change the room you're in. New surroundings, quieter urge.",
  "Message one person who knows what you're working on.",
];

function AlcoholControlScreen() {
  const { online } = useNetworkStatus();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * A single audio element for the whole screen, created lazily on first play
   * and destroyed on unmount — so nothing keeps streaming in the background and
   * two sessions can never overlap.
   */
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    // Stream only; no CORS request — the host serves no Access-Control-Allow-Origin
    // header, so crossOrigin would make the media request fail outright.
    audio.preload = "metadata";
    audio.src = ALCOHOL_CONTROL_AUDIO_URL;
    log("created audio element", { src: audio.src });

    const onMeta = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      log("metadata loaded", { duration: d });
      setDuration(d);
    };
    const onTime = () => setElapsed(audio.currentTime);
    const onWaiting = () => {
      log("buffering…");
      setLoading(true);
    };
    const onCanPlay = () => setLoading(false);
    const onPlaying = () => {
      log("playing");
      setLoading(false);
      setError(null);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      log("ended");
      setPlaying(false);
      setElapsed(audio.duration || 0);
      haptic.success();
    };
    const onError = () => {
      const mediaError = audio.error;
      log("media error", {
        src: audio.currentSrc || audio.src,
        code: mediaError?.code,
        name: MEDIA_ERROR_NAMES[mediaError?.code ?? 0] ?? "UNKNOWN",
        message: mediaError?.message,
        networkState: audio.networkState,
        readyState: audio.readyState,
      });
      setLoading(false);
      setPlaying(false);
      setError(ALCOHOL_CONTROL_ERROR_MESSAGE);
    };

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    (audio as HTMLAudioElement & { _cleanup?: () => void })._cleanup = () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };

    audioRef.current = audio;
    return audio;
  }, []);

  // Full teardown when the screen is left.
  useEffect(() => {
    return () => {
      const audio = audioRef.current as (HTMLAudioElement & { _cleanup?: () => void }) | null;
      if (!audio) return;
      audio._cleanup?.();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  const toggle = useCallback(async () => {
    haptic.select();
    const audio = audioRef.current;

    if (audio && !audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }

    // Online-only: re-read the real connectivity state before streaming.
    const connected = await refreshNetworkStatus();
    if (!connected) {
      setError(ALCOHOL_CONTROL_OFFLINE_MESSAGE);
      return;
    }

    setError(null);
    setLoading(true);
    const el = ensureAudio();
    try {
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError(ALCOHOL_CONTROL_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [ensureAudio]);

  // Pause immediately if the connection drops mid-session.
  useEffect(() => {
    if (online) return;
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      setPlaying(false);
      setError(ALCOHOL_CONTROL_OFFLINE_MESSAGE);
    }
  }, [online]);

  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  return (
    <SubScreen
      title="Alcohol Control"
      description="A calm voice to sit with you until the craving loosens its grip."
    >
      <SoftCard className="bg-sky text-on-tint">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background/30">
            <Wine className="size-5 text-on-tint" aria-hidden />
          </span>
          <div>
            <p className="font-semibold">Guided listening session</p>
            <p className="mt-1 text-sm text-on-tint/80">
              Find a quiet spot, put your phone down and just listen. Streams online only.
            </p>
          </div>
        </div>
      </SoftCard>

      <SoftCard className="mt-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={loading}
            aria-label={playing ? "Pause session" : "Play session"}
            className={cn(
              "press flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
              loading && "opacity-70",
            )}
          >
            {loading ? (
              <Loader2 className="size-7 animate-spin" aria-hidden />
            ) : playing ? (
              <Pause className="size-7" aria-hidden />
            ) : (
              <Play className="ml-0.5 size-7" aria-hidden />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div
              role="progressbar"
              aria-label="Session progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatAudioClock(elapsed)}</span>
              <span>{duration > 0 ? formatAudioClock(duration) : "--:--"}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
              {loading ? "Buffering…" : playing ? "Playing" : "Paused"}
            </p>
          </div>
        </div>

        {!online || error ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-blush p-3 text-sm text-on-tint">
            {online ? (
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <span>{online ? error : ALCOHOL_CONTROL_OFFLINE_MESSAGE}</span>
          </p>
        ) : null}

        {error && online ? (
          <Button
            variant="outline"
            className="press mt-3 h-11 w-full rounded-2xl"
            onClick={() => void toggle()}
          >
            Try again
          </Button>
        ) : null}
      </SoftCard>

      <section aria-labelledby="alcohol-tips" className="mt-6">
        <h2 id="alcohol-tips" className="px-1 text-sm font-medium text-muted-foreground">
          While you listen
        </h2>
        <ul className="mt-3 space-y-3">
          {TIPS.map((tip) => (
            <SoftCard as="li" key={tip} className="p-4 text-sm">
              {tip}
            </SoftCard>
          ))}
        </ul>
      </section>
    </SubScreen>
  );
}
