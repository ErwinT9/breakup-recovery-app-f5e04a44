/**
 * Local-timezone date/time helpers.
 *
 * Everything is stored as a UTC ISO string (the real moment), but every
 * picker and label works in the device's own timezone — read live from the
 * browser/WebView, never hardcoded and never assumed to be UTC. Because we
 * always go through the Date constructor / getters, daylight-saving shifts
 * are handled by the platform.
 */

const pad = (value: number) => String(value).padStart(2, "0");

/** "YYYY-MM-DD" for the device's local calendar day. */
export function toLocalDateValue(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DDTHH:mm" in local time — the format <input type="datetime-local"> expects. */
export function toLocalInputValue(date: Date = new Date()): string {
  return `${toLocalDateValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse an ISO/stored timestamp into a Date, or null when unusable. */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Build a UTC ISO string from local date parts + a 12-hour clock time. */
export function localPartsToISO(
  dateValue: string,
  hour12: number,
  minute: number,
  meridiem: "AM" | "PM",
): string | null {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return null;
  let hours = hour12 % 12;
  if (meridiem === "PM") hours += 12;
  const date = new Date(year, month - 1, day, hours, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Split a moment into the pieces a 12-hour picker needs, in local time. */
export function toLocalParts(date: Date) {
  const hours = date.getHours();
  return {
    dateValue: toLocalDateValue(date),
    hour12: hours % 12 === 0 ? 12 : hours % 12,
    minute: date.getMinutes(),
    meridiem: (hours >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
}

/** Human label such as "18 Aug 2026, 06:17 AM" in the device timezone. */
export function formatLocalDateTime(value: string | Date): string {
  const date = typeof value === "string" ? parseTimestamp(value) : value;
  if (!date) return "";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
