/**
 * Alcohol Control session config.
 *
 * The voice-over is streamed from a remote URL — it is never bundled with the
 * app and never downloaded/cached to disk. To point the session at a new
 * recording, change AUDIO_URL only; nothing else in the feature depends on it.
 */
export const ALCOHOL_CONTROL_AUDIO_URL = "https://vexalabs.biz/alc.wav";

export const ALCOHOL_CONTROL_TITLE = "Alcohol Control";
export const ALCOHOL_CONTROL_TAGLINE =
  "A guided voice session for the nights the drink feels like the answer";

export const ALCOHOL_CONTROL_OFFLINE_MESSAGE =
  "Internet connection is required to listen to this session.";
export const ALCOHOL_CONTROL_ERROR_MESSAGE =
  "We couldn't load this session right now. Please check your connection and try again.";

/** mm:ss for the player readouts. */
export function formatAudioClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
