/**
 * The posting rules — pure, so they can be tested by an audit rather than by
 * a `*.test.ts` the project forbids.
 *
 * Nothing here touches Firestore. `assertBalanced` and `buildReversal` are
 * the two decisions that must never be wrong, and keeping them pure is what
 * lets `verify-posting-rules.mjs` exercise them directly — the same shape as
 * `verify-shipment-allocation-guard.mjs`, which reproduces a real failure
 * against the real data shape and carries negative controls.
 */

import type {
  JournalLine,
  JournalSourceEvent,
} from "../../../../features/ledger/schemas/firestore";

/**
 * `YYYY-MM` for a date, in the ONE place that derives it.
 *
 * 🛑 **LOCAL, not UTC, and the difference is a GST return.** A sale at 02:00
 * IST on 1 November is 20:30 UTC on 31 October, so `getUTCMonth()` files it
 * under the wrong month — and the month is exactly what a GSTR-1 period is.
 * Every evening sale in India would land in the previous return.
 *
 * Local is correct because `vercel.json` pins functions to `bom1` and the
 * Firebase region is `asia-south1`, so "local" IS IST on every server that
 * runs this. It also matches `financialYearLabel`, which uses `getMonth()`
 * for the same reason and whose boundary error would be unrecoverable —
 * these two must agree or a March entry could sit in one FY and one period
 * that disagree about which year it belongs to.
 *
 * 🛑 It therefore DISAGREES with nothing by accident but with
 * `payPeriodFor`'s UTC-free local midnight by design — both are local; if
 * either is ever moved to UTC, move both, and expect the invoice series to
 * need the same treatment.
 */
export function periodOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}


/**
 * 🛑 Money comparison needs a TOLERANCE, and omitting one is the same bug
 * Root Cause #92 cost a million invocations a day.
 *
 * Every leg here is a rupee amount with at most two decimals, and the
 * arithmetic that produces them (a GST split, a pro-rata allocation) is
 * floating point — `0.1 + 0.2 !== 0.3`. An exact `===` on the two totals
 * would refuse a correct entry whose halves differ in the last bit, and the
 * refusal would look like a posting-rule bug rather than a float.
 *
 * Half of the smallest representable unit (0.005): tight enough that a real
 * 0.01 imbalance still fails, loose enough that no accumulation of
 * two-decimal values can reach it.
 */
export const BALANCE_TOLERANCE = 0.005;

export interface PostingInput {
  entryDate: Date;
  sourceEvent: JournalSourceEvent;
  sourceId?: string;
  narration: string;
  lines: JournalLine[];
}

export interface BalancedPosting extends PostingInput {
  period: string;
  totalDebit: number;
  totalCredit: number;
}

export class UnbalancedEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnbalancedEntryError";
  }
}

/**
 * Validate a posting and compute its totals, or refuse it.
 *
 * 🛑 **Refuses rather than correcting.** A plausible repair — dropping a
 * zero line, inferring the missing side from the difference — is how a wrong
 * posting rule gets a correct-looking entry written for it, and the books
 * then balance while saying something false. An unbalanced entry is always a
 * bug in the rule that built it, and the only safe response is to not write.
 *
 * The five checks, each of which has a distinct failure it prevents:
 */
export function assertBalanced(input: PostingInput): BalancedPosting {
  const { lines } = input;

  // 1. A single-legged entry is not double entry. One line can never balance,
  //    and the commonest way to get one is a rule that forgot its credit.
  if (lines.length < 2) {
    throw new UnbalancedEntryError(
      `A journal entry needs at least two lines; got ${lines.length}.`,
    );
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const [i, line] of lines.entries()) {
    const d = line.debit ?? 0;
    const c = line.credit ?? 0;

    // 2. NEGATIVE amounts are refused outright. A negative debit is a credit
    //    written the wrong way round, and allowing it means every report has
    //    to handle a sign it should never see — plus the two totals could
    //    then balance while both sides are nonsense.
    if (d < 0 || c < 0) {
      throw new UnbalancedEntryError(
        `Line ${i} (${line.accountCode}) has a negative amount. A reversal swaps the sides; it never negates them.`,
      );
    }

    // 3. EXACTLY ONE SIDE per line. A line carrying both is ambiguous about
    //    what it asserts, and its net effect depends on a subtraction the
    //    reader has to perform — which is precisely what two separate fields
    //    exist to avoid.
    if (d > 0 && c > 0) {
      throw new UnbalancedEntryError(
        `Line ${i} (${line.accountCode}) carries both a debit and a credit. Split it into two lines.`,
      );
    }

    // 4. A ZERO line asserts nothing and is almost always a rule that
    //    computed an amount it then failed to use.
    if (d === 0 && c === 0) {
      throw new UnbalancedEntryError(
        `Line ${i} (${line.accountCode}) is zero on both sides.`,
      );
    }

    totalDebit += d;
    totalCredit += c;
  }

  // 5. The accounting identity itself.
  if (Math.abs(totalDebit - totalCredit) > BALANCE_TOLERANCE) {
    throw new UnbalancedEntryError(
      `Entry does not balance: debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)}.`,
    );
  }

  return {
    ...input,
    period: periodOf(input.entryDate),
    /*
     * Rounded to two decimals AFTER the comparison, not before. Rounding
     * first would mask a genuine sub-unit imbalance by making both sides
     * equal; rounding after records a figure a human can reconcile against
     * a bank statement.
     */
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
  };
}

/**
 * The reversing entry for a posting — every leg's sides swapped.
 *
 * 🛑 **Swapped, never negated.** `debit: -100` would balance arithmetically
 * and is wrong in every other way: it breaks the non-negative rule above, it
 * makes a trial balance sum to the right number through cancelling errors
 * rather than through correct postings, and a ledger export to Tally would
 * reject it. A credit of 100 against a debit of 100 is what a reversal IS.
 *
 * 🛑 **The reversal's `entryDate` is the CALLER's, not the original's.** A
 * correction discovered in November for an October entry posts in November
 * when October is locked — that is the whole point of the lock, and
 * back-dating the reversal to the original would silently reopen a filed
 * period. The link between them is `reversesEntryId`, not a shared date.
 */
export function buildReversal(
  original: { id: string; lines: JournalLine[]; narration: string },
  at: Date,
  reason: string,
): PostingInput {
  return {
    entryDate: at,
    sourceEvent: "reversal",
    sourceId: original.id,
    narration: `Reversal of ${original.id}: ${reason}`,
    lines: original.lines.map((l) => ({
      accountCode: l.accountCode,
      debit: l.credit,
      credit: l.debit,
      ...(l.memo ? { memo: l.memo } : {}),
      ...(l.counterpartyId ? { counterpartyId: l.counterpartyId } : {}),
    })),
  };
}

/**
 * Where a late correction must post.
 *
 * 🛑 Returns the entry's OWN period when it is open, and the caller's
 * fallback when it is not — it never silently moves a posting. A rule that
 * quietly re-dated anything landing in a closed period would make the lock
 * invisible, and the first anyone knew of it would be a GST return that no
 * longer reconciles to the books it was filed from.
 */
export function resolvePostingPeriod(
  wanted: string,
  isLocked: (period: string) => boolean,
  openFallback: string,
): { period: string; deferred: boolean } {
  if (!isLocked(wanted)) return { period: wanted, deferred: false };
  if (isLocked(openFallback)) {
    throw new UnbalancedEntryError(
      `Both ${wanted} and the fallback period ${openFallback} are locked; there is nowhere to post.`,
    );
  }
  return { period: openFallback, deferred: true };
}
