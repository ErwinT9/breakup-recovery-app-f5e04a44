import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import {
  formatLocalDateTime,
  localPartsToISO,
  parseTimestamp,
  toLocalDateValue,
  toLocalParts,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";

type Props = {
  /** Stored UTC ISO timestamp, or null when nothing is picked yet. */
  value: string | null;
  onChange: (iso: string) => void;
  /** Prevent picking a future calendar day. */
  disableFuture?: boolean;
  id?: string;
  invalid?: boolean;
  className?: string;
};

const selectClass =
  "h-13 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 text-base text-foreground";

/**
 * Date + 12-hour time picker that always works in the device's local
 * timezone and emits a UTC ISO string.
 */
export function DateTimeField({ value, onChange, disableFuture, id, invalid, className }: Props) {
  const parts = useMemo(() => toLocalParts(parseTimestamp(value) ?? new Date()), [value]);

  const emit = (patch: Partial<ReturnType<typeof toLocalParts>>) => {
    const next = { ...parts, ...patch };
    const iso = localPartsToISO(next.dateValue, next.hour12, next.minute, next.meridiem);
    if (iso) onChange(iso);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        id={id}
        type="date"
        value={parts.dateValue}
        {...(disableFuture ? { max: toLocalDateValue() } : {})}
        aria-invalid={invalid ?? false}
        onChange={(event) => {
          if (event.target.value) emit({ dateValue: event.target.value });
        }}
        className="h-13 rounded-2xl"
      />
      <div className="flex items-center gap-2">
        <select
          aria-label="Hour"
          className={selectClass}
          value={parts.hour12}
          onChange={(event) => emit({ hour12: Number(event.target.value) })}
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span aria-hidden className="text-lg font-medium text-muted-foreground">
          :
        </span>
        <select
          aria-label="Minute"
          className={selectClass}
          value={parts.minute}
          onChange={(event) => emit({ minute: Number(event.target.value) })}
        >
          {Array.from({ length: 60 }, (_, index) => index).map((minute) => (
            <option key={minute} value={minute}>
              {String(minute).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          aria-label="AM or PM"
          className={selectClass}
          value={parts.meridiem}
          onChange={(event) => emit({ meridiem: event.target.value as "AM" | "PM" })}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      {value ? <p className="text-xs text-muted-foreground">{formatLocalDateTime(value)}</p> : null}
    </div>
  );
}
