/**
 * TEMPORARY RevenueCat diagnostics.
 *
 * Every step of configure() / getOfferings() is logged here so the exact
 * failure point is visible in `adb logcat` (tag: Capacitor/Console) and in the
 * on-screen diagnostics panel on the Pro screen. Remove once the offerings
 * issue is resolved.
 */
import { logBreadcrumb, recordNonFatal } from "@/lib/monitoring/crashlytics";

export type RcLogEntry = { at: string; step: string; detail: string };

const MAX = 60;
const entries: RcLogEntry[] = [];
const listeners = new Set<() => void>();

function stringify(value: unknown): string {
  if (value === undefined) return "";
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value, safeReplacer(), 2);
  } catch {
    return String(value);
  }
}

function safeReplacer() {
  const seen = new WeakSet<object>();
  return (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value as object)) return "[circular]";
      seen.add(value as object);
    }
    return value;
  };
}

export function rcLog(step: string, detail?: unknown): void {
  const entry: RcLogEntry = { at: new Date().toISOString(), step, detail: stringify(detail) };
  entries.push(entry);
  if (entries.length > MAX) entries.shift();
  // eslint-disable-next-line no-console
  console.log("[RC-DEBUG]", step, entry.detail);
  logBreadcrumb(`rc:${step}`, { detail: entry.detail.slice(0, 400) });
  listeners.forEach((fn) => fn());
}

/** Logs an error with every field RevenueCat may attach (code, underlyingErrorMessage, ...). */
export function rcLogError(step: string, error: unknown): void {
  const err = error as Record<string, unknown> & { message?: string };
  rcLog(step, {
    message: err?.message ?? String(error),
    code: err?.["code"],
    readableErrorCode: err?.["readableErrorCode"],
    underlyingErrorMessage: err?.["underlyingErrorMessage"],
    domain: err?.["domain"],
    raw: err ? Object.fromEntries(Object.entries(err)) : null,
  });
  recordNonFatal(error, { stage: step });
}

export function rcLogs(): RcLogEntry[] {
  return [...entries];
}

export function rcLogsText(): string {
  return rcLogs()
    .map((e) => `${e.at} ${e.step}\n${e.detail}`)
    .join("\n\n");
}

export function subscribeRcLogs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
