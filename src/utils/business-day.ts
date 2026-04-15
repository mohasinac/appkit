/**
 * Business Day Utilities — Client / Server (Next.js)
 *
 * IST (Indian Standard Time, UTC+5:30) business day calculation.
 * Platform day starts at 10:00 AM IST.
 *
 * Rule:
 *   - Any event before 10:00 AM IST belongs to the previous business day.
 *   - Day 1 = the next upcoming 10:00 AM IST at or after the event.
 *   - "7 business days" means 7 consecutive 10:00 AM IST boundaries must
 *     pass after the reference event (delivery, review submission, etc.).
 *
 * Use this for displaying "X days remaining" counters in the UI and for
 * any server-side day-counting in API routes or Server Actions.
 *
 * Note: IST timezone and 10 AM start time are hardcoded. If a consumer
 * needs different business day logic, extend this module or create a
 * parametrized version.
 */

export const BUSINESS_DAY_HOUR_IST = 10; // 10:00 AM IST
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+5:30 in milliseconds
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the UTC Date for the start of the current business day —
 * the most recent 10:00 AM IST at or before `now`.
 */
export function getBusinessDayStart(now: Date = new Date()): Date {
  const istMs = now.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);

  const istMidnight = new Date(istDate);
  istMidnight.setUTCHours(0, 0, 0, 0);

  const todayAt10Shifted = new Date(
    istMidnight.getTime() + BUSINESS_DAY_HOUR_IST * 60 * 60 * 1000,
  );

  if (istMs >= todayAt10Shifted.getTime()) {
    return new Date(todayAt10Shifted.getTime() - IST_OFFSET_MS);
  }

  return new Date(todayAt10Shifted.getTime() - DAY_MS - IST_OFFSET_MS);
}

/**
 * Returns how many full business days have elapsed since `since`.
 * Each day = one 10:00 AM IST boundary crossing.
 */
export function getBusinessDaysElapsed(
  since: Date,
  now: Date = new Date(),
): number {
  const currentStart = getBusinessDayStart(now);
  const sinceStart = getBusinessDayStart(since);
  return Math.max(
    0,
    Math.floor((currentStart.getTime() - sinceStart.getTime()) / DAY_MS),
  );
}

/**
 * Returns how many business days remain before `windowDays` are up.
 *
 * @param since   - The reference date (e.g. delivery confirmation timestamp)
 * @param windowDays - Total business days required (e.g. 7 for auto-payout)
 * @param now     - Current time (defaults to now)
 * @returns       - Days remaining (0 = eligible today; negative = overdue)
 */
export function getBusinessDaysRemaining(
  since: Date,
  windowDays: number,
  now: Date = new Date(),
): number {
  return windowDays - getBusinessDaysElapsed(since, now);
}

/**
 * Returns the UTC Date when `windowDays` business days will have elapsed
 * since `since` — i.e. the eligibility date.
 *
 * @param since      - Reference date
 * @param windowDays - Number of business days to wait
 */
export function getBusinessDayEligibilityDate(
  since: Date,
  windowDays: number,
): Date {
  const sinceStart = getBusinessDayStart(since);
  return new Date(sinceStart.getTime() + windowDays * DAY_MS);
}
