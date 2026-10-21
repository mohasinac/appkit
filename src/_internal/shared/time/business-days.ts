/**
 * Business-day arithmetic for India, with an admin-maintained holiday list.
 *
 * WHY: every deadline in the order lifecycle that matters commercially is
 *      quoted in *business* days — the payout hold, the seller dispatch
 *      window, the return-response window, the inspection window. Before this
 *      module the only implementation was `getBusinessDayCutoff` in
 *      `autoPayoutEligibility.ts`, which did this:
 *
 *        cutoff.setUTCDate(cutoff.getUTCDate() - daysAgo)
 *
 *      i.e. it subtracted CALENDAR days and called them business days. A
 *      7-"business"-day hold computed on a Monday reached back to the previous
 *      Monday — 5 business days, not 7 — so every payout over a weekend was
 *      released two business days early, in the seller's favour, with no
 *      record that the stated hold had not been honoured.
 *
 * WHAT: `addBusinessDays` / `subBusinessDays` / `isBusinessDay` /
 *       `businessDaysBetween`, all operating on IST calendar days and all
 *       taking the holiday list as an explicit parameter.
 *
 * 🛑 A MISSED HOLIDAY SILENTLY SHORTENS A DEADLINE. There is no error, no
 * log, and nothing to notice — the hold simply releases a day early. So the
 * list below needs an owner and a review before each financial year; it is
 * not fire-and-forget config. That hazard is the reason the list is DATA
 * (admin-editable, see `resolveHolidays`) rather than a constant someone has
 * to ship a release to change.
 */

/**
 * 🛑 IST, not UTC, and this is not a preference.
 *
 * A business day is a property of the *place the business operates in*. India
 * is UTC+5:30, so 23:00 UTC on a Friday is already Saturday morning in
 * Mumbai. Computing weekends in UTC therefore misclassifies a 5.5-hour band
 * at the edge of every single day — which is 23% of a working Friday evening
 * treated as a working day when the office is shut, and the inverse on Sunday
 * night.
 *
 * The old helper's `setUTCHours(4, 30, 0, 0)` was reaching for exactly this
 * (04:30 UTC = 10:00 IST) without saying so. Making the offset explicit is
 * what lets the weekend test be correct rather than approximately correct.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` in IST. The key format the holiday list uses. */
export function toIstDateKey(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Indian public holidays on which we do not count a business day.
 *
 * Deliberately NARROW: only the days on which banking and courier movement
 * genuinely stop nationwide. A regional festival that closes one state's
 * offices is not here, because treating it as a national holiday would
 * *lengthen* every seller's deadline across the country — and unlike a missed
 * holiday, that error is invisible in the seller's favour and compounds.
 *
 * 🛑 Dates are LITERAL, never computed. Several of these move year to year
 * (they follow lunar calendars), so a formula would be wrong rather than
 * stale — and stale is detectable while wrong is not. Entries end at the last
 * declared year on purpose: `resolveHolidays` warns past that horizon instead
 * of silently treating an unlisted Diwali as a working day.
 */
export const INDIA_HOLIDAYS_BY_YEAR: Readonly<Record<number, readonly string[]>> = {
  2026: [
    "2026-01-26", // Republic Day
    "2026-03-04", // Holi
    "2026-03-21", // Id-ul-Fitr
    "2026-04-01", // Bank closing (annual)
    "2026-05-01", // Maharashtra Day / May Day
    "2026-05-28", // Bakrid
    "2026-08-15", // Independence Day
    "2026-08-26", // Janmashtami
    "2026-09-14", // Ganesh Chaturthi
    "2026-10-02", // Gandhi Jayanti
    "2026-10-20", // Dussehra
    "2026-11-08", // Diwali
    "2026-11-24", // Guru Nanak Jayanti
    "2026-12-25", // Christmas
  ],
  2027: [
    "2027-01-26",
    "2027-04-01",
    "2027-05-01",
    "2027-08-15",
    "2027-10-02",
    "2027-12-25",
  ],
};

/** The last year with a curated list — past this, `resolveHolidays` warns. */
export const HOLIDAY_HORIZON_YEAR = Math.max(
  ...Object.keys(INDIA_HOLIDAYS_BY_YEAR).map(Number),
);

export interface BusinessDayOptions {
  /**
   * Extra closure dates (`YYYY-MM-DD`, IST), from
   * `siteSettings.platformLimits.businessHolidays` once that field exists.
   * Merged with the built-in list rather than replacing it, so an admin
   * cannot accidentally delete Independence Day by saving an empty field.
   */
  extraHolidays?: readonly string[];
  /** Injected for the warning path; defaults to no-op so pure callers stay pure. */
  onWarn?: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * The holiday set covering every year the window could span.
 *
 * Takes a range rather than a single year because a 7-business-day window
 * ending on 2 January reaches back into the previous year — resolving only the
 * end year's holidays would count the Christmas break as working days.
 */
function resolveHolidays(
  fromYear: number,
  toYear: number,
  opts?: BusinessDayOptions,
): ReadonlySet<string> {
  const out = new Set<string>(opts?.extraHolidays ?? []);
  for (let y = fromYear; y <= toYear; y++) {
    const list = INDIA_HOLIDAYS_BY_YEAR[y];
    if (list) {
      for (const d of list) out.add(d);
    } else if (y > HOLIDAY_HORIZON_YEAR) {
      /*
       * Loud, because the failure is otherwise invisible: with no list for the
       * year every holiday counts as a working day, so every deadline computed
       * in that year is SHORT. Nothing breaks, nothing errors, sellers are
       * paid early and buyers' windows close early.
       */
      opts?.onWarn?.(
        `No holiday list for ${y} — business-day deadlines in that year will treat every public holiday as a working day. Extend INDIA_HOLIDAYS_BY_YEAR.`,
        { year: y, horizon: HOLIDAY_HORIZON_YEAR },
      );
    }
  }
  return out;
}

/** Saturday/Sunday in IST, or a listed holiday. */
export function isBusinessDay(d: Date, holidays: ReadonlySet<string>): boolean {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const dow = ist.getUTCDay(); // 0 = Sunday, 6 = Saturday — of the IST date
  if (dow === 0 || dow === 6) return false;
  return !holidays.has(toIstDateKey(d));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Walk `count` business days from `start`, in whole days.
 *
 * `direction` is +1 (forward, a deadline) or −1 (backward, a cutoff). One
 * function for both so the two can never disagree about what a business day
 * is — two mirrored implementations is how Root Cause #30 is written.
 *
 * 🛑 The loop is bounded. An exhausted holiday list or a pathological input
 * must not spin: `MAX_ITERATIONS` is generous enough that no real window
 * reaches it (a 30-business-day window needs ~44 calendar days) and small
 * enough to fail fast rather than hang a Cloud Function to its 540s ceiling.
 */
const MAX_ITERATIONS = 400;

function walkBusinessDays(
  start: Date,
  count: number,
  direction: 1 | -1,
  opts?: BusinessDayOptions,
): Date {
  if (count <= 0) return new Date(start);
  const startYear = Number(toIstDateKey(start).slice(0, 4));
  // Widen by a year either side — a window can straddle a year boundary, and
  // over-resolving costs nothing while under-resolving silently drops a holiday.
  const holidays = resolveHolidays(startYear - 1, startYear + 1, opts);

  let cursor = new Date(start);
  let remaining = count;
  let guard = 0;
  while (remaining > 0) {
    if (++guard > MAX_ITERATIONS) {
      opts?.onWarn?.(
        "business-day walk exceeded its iteration bound — returning the cursor as-is",
        { count, direction, start: start.toISOString() },
      );
      break;
    }
    cursor = new Date(cursor.getTime() + direction * DAY_MS);
    if (isBusinessDay(cursor, holidays)) remaining--;
  }
  return cursor;
}

/** A deadline: `count` business days after `start`. */
export function addBusinessDays(
  start: Date,
  count: number,
  opts?: BusinessDayOptions,
): Date {
  return walkBusinessDays(start, count, 1, opts);
}

/** A cutoff: `count` business days before `start`. */
export function subBusinessDays(
  start: Date,
  count: number,
  opts?: BusinessDayOptions,
): Date {
  return walkBusinessDays(start, count, -1, opts);
}

/**
 * The cutoff instant for "delivered at least `days` business days ago".
 *
 * Normalised to **10:00 IST** on the cutoff day, which is what the old helper's
 * unexplained `setUTCHours(4, 30)` meant. It matters: without a fixed
 * time-of-day the cutoff drifts with the hour the job happens to run, so an
 * order can be eligible on one run and not the next.
 */
export function businessDayCutoff(
  days: number,
  opts?: BusinessDayOptions,
  now: Date = new Date(),
): Date {
  const cutoff = subBusinessDays(now, days, opts);
  const ist = new Date(cutoff.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(10, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

/** Inclusive-of-neither count of business days in `[from, to)`. */
export function businessDaysBetween(
  from: Date,
  to: Date,
  opts?: BusinessDayOptions,
): number {
  if (to <= from) return 0;
  const fromYear = Number(toIstDateKey(from).slice(0, 4));
  const toYear = Number(toIstDateKey(to).slice(0, 4));
  const holidays = resolveHolidays(fromYear, toYear, opts);
  let count = 0;
  let cursor = new Date(from.getTime() + DAY_MS);
  let guard = 0;
  while (cursor <= to && ++guard <= MAX_ITERATIONS) {
    if (isBusinessDay(cursor, holidays)) count++;
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return count;
}
