/**
 * The Indian financial year, and the series format built on it.
 *
 * ## 🛑 1 April, and getting the boundary wrong is unrecoverable
 *
 * The FY segment is what makes the reset safe: a counter keyed on the year
 * resets by construction, because 1 April produces a new key. But it also
 * means a boundary error is permanent — a number issued under the wrong FY
 * leaves a gap in one year's series and an extra in the other, and a number
 * cannot be withdrawn.
 *
 * So the month test is `>= 3` on a ZERO-BASED month (April is 3, not 4). That
 * single off-by-one is the whole risk, and it is why this is a named function
 * with its reasoning attached rather than an inline expression at the call
 * site.
 */

/**
 * `"26-27"` for any date from 2026-04-01 to 2027-03-31.
 *
 * Two-digit years, matching decision 21's `LIR/26-27/0001`. The full number is
 * 14 characters, inside the statutory 16, and uses only `-` and `/` as
 * separators.
 */
export function financialYearLabel(at: Date): string {
  const year = at.getFullYear();
  // 🛑 ZERO-BASED. `getMonth()` returns 3 for April, so `>= 3` is "April or
  // later" and `< 3` is "January to March", which belongs to the FY that
  // STARTED in the previous calendar year.
  const startYear = at.getMonth() >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear % 100).padStart(2, "0")}-${String(endYear % 100).padStart(2, "0")}`;
}

/**
 * Prefixes, per decision 21.
 *
 * 🛑 Distinct prefixes rather than one with a suffix, so the two series are
 * distinguishable at a glance in a bank statement, a spreadsheet and a GSTR-1
 * row — and so a text search for one can never match the other.
 */
export const INVOICE_PREFIX = "LIR";
export const CREDIT_NOTE_PREFIX = "LIRCN";

/**
 * `LIR/26-27/0001`.
 *
 * Zero-padded to four digits, which covers 9,999 documents per series per
 * year. 🛑 Overflow does NOT wrap or throw: `padStart` is a floor, not a
 * ceiling, so number 10,000 renders as `10000` and the series stays gapless
 * and sortable-by-sequence. Width is cosmetic; gaplessness is not, and the
 * failure mode of a throw here would be a paid order that cannot be invoiced.
 */
export function formatSeriesNumber(
  prefix: string,
  fy: string,
  sequence: number,
): string {
  return `${prefix}/${fy}/${String(sequence).padStart(4, "0")}`;
}
