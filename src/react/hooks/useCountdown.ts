import { useState, useEffect } from "react";

/**
 * useCountdown — tracks time remaining until a future date.
 *
 * Returns `null` when the target date has passed or is not provided.
 *
 * Supports:
 * - `Date` objects
 * - ISO strings / numeric timestamps
 * - Firestore Timestamp JSON shape `{ _seconds, _nanoseconds }` (serialised
 *   by Firestore's REST API — no Firestore SDK import needed)
 */
export interface CountdownRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Resolve any date-like value into a ms timestamp. */
function resolveMs(endDate: unknown): number {
  if (!endDate) return NaN;
  if (endDate instanceof Date) return endDate.getTime();
  // Firestore Timestamp JSON shape: { _seconds, _nanoseconds }
  if (
    typeof endDate === "object" &&
    endDate !== null &&
    "_seconds" in endDate &&
    typeof (endDate as Record<string, unknown>)._seconds === "number"
  ) {
    return (endDate as { _seconds: number })._seconds * 1000;
  }
  // ISO string or numeric string
  return new Date(endDate as string).getTime();
}

/**
 * @example
 * ```tsx
 * const remaining = useCountdown(auction.endsAt);
 * if (!remaining) return <span>Ended</span>;
 * return <span>{remaining.hours}h {remaining.minutes}m {remaining.seconds}s</span>;
 * ```
 */
export function useCountdown(
  endDate: Date | string | undefined,
): CountdownRemaining | null {
  const getRemaining = (): CountdownRemaining | null => {
    if (!endDate) return null;
    const ms = resolveMs(endDate);
    if (Number.isNaN(ms)) return null;
    const diff = ms - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };

  const [remaining, setRemaining] = useState<CountdownRemaining | null>(
    getRemaining,
  );

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [endDate]);

  return remaining;
}
