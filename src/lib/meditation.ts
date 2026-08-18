export type MeditationTrack = {
  id: "calm" | "peace" | "rain" | "wave";
  label: string;
  src: string;
};

/** Bundled meditation audio (public/audio/meditation, filenames unchanged). */
export const MEDITATION_TRACKS: MeditationTrack[] = [
  { id: "calm", label: "Calm", src: "/audio/meditation/Calm.m4a" },
  { id: "peace", label: "Peace", src: "/audio/meditation/Peace.m4a" },
  { id: "rain", label: "Rain", src: "/audio/meditation/Rain.m4a" },
  { id: "wave", label: "Wave", src: "/audio/meditation/wave.m4a" },
];

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}