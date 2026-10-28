/**
 * Dates that are deliberately imprecise: `YYYY-MM` as well as `YYYY-MM-DD`.
 *
 * `date.formatter` handles instants — a `Date`, an ISO string, a timestamp. It
 * cannot represent "June 2024" without inventing a day, so `formatDate` on
 * `"2024-06"` renders *1* June and a reader has no way to tell the 1st was
 * guessed. Anything a person types from memory is like this: when a role
 * started, when a certificate was issued, when a licence expires, the month a
 * contract renews.
 *
 * 🛑 These values are usually ordered LEXICOGRAPHICALLY by the database, which
 * is correct for `YYYY-MM` and silently wrong for anything else — `"June 2024"`
 * sorts before `"March 2024"`. So the format is narrow on purpose, and
 * `partialDateKey` exists to give a comparable string for the rest.
 */

/** A partial date: `YYYY-MM` or `YYYY-MM-DD`. Nothing looser parses. */
const PARTIAL_DATE = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/;

export interface PartialDateParts {
  readonly year: number;
  /** 1-12. */
  readonly month: number;
  /** 1-31, or `null` when the value names only a month. */
  readonly day: number | null;
}

/**
 * Parse a partial date, or `null` when it is not one.
 *
 * 🛑 A bare `YYYY` is REJECTED. It looks harmless and sorts before every month
 * of its own year, so `"2024"` would order ahead of `"2024-01"` and the
 * resulting list looks plausible while being wrong.
 */
export function parsePartialDate(value: string | null | undefined): PartialDateParts | null {
  if (!value) return null;
  const m = PARTIAL_DATE.exec(value.trim());
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: m[3] === undefined ? null : Number(m[3]),
  };
}

export function isPartialDate(value: string | null | undefined): boolean {
  return parsePartialDate(value) !== null;
}

/**
 * A lexicographically comparable key.
 *
 * A month-only value pads to `-00`, so it sorts BEFORE every day in that month
 * — the right answer for a start date, since "sometime in June" is at earliest
 * the 1st. An unparseable value yields `"0000-00-00"` so it sorts last in a
 * descending list rather than throwing; an absent one yields `""`.
 */
export function partialDateKey(value: string | null | undefined): string {
  if (!value) return "";
  const parts = parsePartialDate(value);
  if (!parts) return "0000-00-00";
  const mm = String(parts.month).padStart(2, "0");
  const dd = parts.day === null ? "00" : String(parts.day).padStart(2, "0");
  return `${parts.year}-${mm}-${dd}`;
}

/**
 * Format without inventing precision: `2024-06` → "June 2024",
 * `2024-06-05` → "5 June 2024".
 *
 * Month names come from `Intl`, so a locale gets its own. An unparseable value
 * is returned unchanged — showing what was stored beats showing "Invalid Date".
 */
export function formatPartialDate(
  value: string | null | undefined,
  locale?: string,
): string {
  if (!value) return "";
  const parts = parsePartialDate(value);
  if (!parts) return value;
  // Noon UTC, so a timezone shift can never roll the month backwards.
  const at = new Date(Date.UTC(parts.year, parts.month - 1, parts.day ?? 1, 12));
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(at);
  return parts.day === null
    ? `${month} ${parts.year}`
    : `${parts.day} ${month} ${parts.year}`;
}

/**
 * The instant a partial date STOPS covering.
 *
 * 🛑 A month-only value runs to the end of that month. Treating `2024-06` as
 * the 1st would report something valid "through June" as expired on 1 June —
 * which is the bug this function exists to prevent.
 */
export function partialDateEnd(value: string | null | undefined): Date | null {
  const parts = parsePartialDate(value);
  if (!parts) return null;
  return parts.day === null
    ? // Day 0 of the NEXT month is the last day of this one.
      new Date(Date.UTC(parts.year, parts.month, 0, 23, 59, 59, 999))
    : new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999));
}

export type ExpiryStatus = "valid" | "expiring" | "expired" | "permanent";

export interface ExpiryOptions {
  /** How many days ahead counts as "expiring". Default 90. */
  readonly soonDays?: number;
  /** Injectable for tests and for server-rendered output. */
  readonly now?: Date;
}

/**
 * Is a dated thing still good — a licence, a certificate, a contract, a token?
 *
 * 🛑 An absent expiry means `permanent`, and so does an UNPARSEABLE one. Those
 * two share an answer deliberately: reporting a typo as `expired` tells someone
 * their valid credential has lapsed, which is a far worse error than declining
 * to judge a value you cannot read.
 */
export function expiryStatus(
  expiresAt: string | null | undefined,
  options: ExpiryOptions = {},
): ExpiryStatus {
  if (!expiresAt) return "permanent";
  const end = partialDateEnd(expiresAt);
  if (!end) return "permanent";

  const now = options.now ?? new Date();
  const soonDays = options.soonDays ?? 90;
  const msLeft = end.getTime() - now.getTime();
  if (msLeft < 0) return "expired";
  return msLeft <= soonDays * 24 * 60 * 60 * 1000 ? "expiring" : "valid";
}

/** What `comparePartialDatesDesc` reads off an entry. */
export interface DatedEntry {
  /** When it began. */
  readonly startDate?: string | null;
  /** When it ended. Absent WITH a `startDate` means ongoing. */
  readonly endDate?: string | null;
  /** A single-instant alternative to `startDate`, e.g. an issue date. */
  readonly date?: string | null;
}

/**
 * Newest first, with anything ongoing ahead of everything finished.
 *
 * 🛑 A missing `endDate` alongside a `startDate` means "still going", so it
 * sorts FIRST. Treating absent as an empty string does the opposite and buries
 * the current item at the bottom — the single most common bug in a hand-rolled
 * timeline sort.
 *
 * An entry with only `date` is a one-off, never treated as ongoing: a
 * certificate issued in 2019 has no end date and is not "current".
 */
export function comparePartialDatesDesc(a: DatedEntry, b: DatedEntry): number {
  const ongoing = (e: DatedEntry) => Boolean(e.startDate) && !e.endDate;
  const aOngoing = ongoing(a);
  const bOngoing = ongoing(b);
  if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
  return partialDateKey(b.startDate ?? b.date).localeCompare(
    partialDateKey(a.startDate ?? a.date),
  );
}

/** Convenience: a new array, newest first. Does not mutate its input. */
export function sortByRecencyDesc<T extends DatedEntry>(entries: readonly T[]): T[] {
  return [...entries].sort(comparePartialDatesDesc);
}
