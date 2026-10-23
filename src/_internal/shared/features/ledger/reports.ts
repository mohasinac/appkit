/**
 * Trial balance and P&L — derived views, pure, so the audit can exercise them.
 *
 * ## 🛑 These are REPORTS, not truth, and they carry the disclaimer
 *
 * Phase 12's `accounting-output` label applies to every figure produced
 * here. The ledger is already a projection of orders and payouts; a report
 * is a projection of the ledger. Nobody files a return from this without a
 * CA reading it, and the label is what stops the number being treated as
 * though they had.
 *
 * ## 🛑 Signs are applied ONCE, at the boundary
 *
 * A trial balance lists raw debit and credit totals per account, which is
 * what makes it a check: the two columns must agree, and that is only
 * meaningful if nothing has been netted on the way. The P&L is where a
 * normal-balance sign is applied, and it is applied in exactly one place
 * (`signedBalance`) so an income account can never be summed as though it
 * were an expense.
 */

import type {
  AccountType,
  JournalEntryDocument,
  JournalLine,
} from "../../../../features/ledger/schemas/firestore";

/** Which side increases this type. Duplicated from the schema's own helper? No — see below. */
type Side = "debit" | "credit";

/*
 * 🛑 `normalBalanceFor` lives on the SCHEMA and is not imported here, for the
 * same mechanical reason `periodOf` moved out of it: `verify-posting-rules`
 * loads these modules through Node's type stripping, which erases
 * `import type` but cannot resolve a runtime import against extensionless
 * appkit source.
 *
 * So this is NOT a second definition — the table below is the same mapping,
 * and the schema's function is what application code calls. Two copies of a
 * rule is Root Cause #42, and the honest mitigation is that `R6` in the
 * audit asserts they agree for all five types rather than trusting a
 * comment to keep them in step.
 */
const NORMAL_SIDE: Record<AccountType, Side> = {
  asset: "debit",
  expense: "debit",
  liability: "credit",
  equity: "credit",
  income: "credit",
};

export interface AccountTotals {
  accountCode: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  period: string;
  rows: AccountTotals[];
  totalDebit: number;
  totalCredit: number;
  /** The identity. False means an entry was written outside `post()`. */
  balanced: boolean;
  /**
   * Propagated from the read that produced it.
   *
   * 🛑 A truncated trial balance BALANCES — both columns lose the same
   * entries — so `balanced: true` with `truncated: true` says nothing at
   * all. A caller that renders the first and ignores the second is showing
   * a reconciliation that did not happen.
   */
  truncated: boolean;
}

/** Sum every line by account. Raw columns, nothing netted. */
export function trialBalance(
  period: string,
  entries: readonly JournalEntryDocument[],
  truncated = false,
): TrialBalance {
  const byAccount = new Map<string, AccountTotals>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const row =
        byAccount.get(line.accountCode) ??
        { accountCode: line.accountCode, debit: 0, credit: 0 };
      row.debit += line.debit ?? 0;
      row.credit += line.credit ?? 0;
      byAccount.set(line.accountCode, row);
    }
  }

  const rows = [...byAccount.values()]
    .map((r) => ({
      accountCode: r.accountCode,
      debit: round2(r.debit),
      credit: round2(r.credit),
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));

  return {
    period,
    rows,
    totalDebit,
    totalCredit,
    /*
     * 🛑 Compared with the SAME tolerance the posting rules use. A trial
     * balance stricter than the gate that wrote the entries would report an
     * imbalance nobody can act on — every entry in it passed `assertBalanced`.
     */
    balanced: Math.abs(totalDebit - totalCredit) <= 0.005,
    truncated,
  };
}

/**
 * The net movement on an account, signed by its normal balance.
 *
 * 🛑 The ONE place a sign is applied. An income account with ₹1,000 credited
 * and ₹100 debited has earned ₹900; the same raw figures on an expense
 * account are a ₹900 loss in the other direction. Applying this per call
 * site is how one of the two gets inverted and a P&L reads profitable.
 */
export function signedBalance(type: AccountType, totals: AccountTotals): number {
  return NORMAL_SIDE[type] === "debit"
    ? round2(totals.debit - totals.credit)
    : round2(totals.credit - totals.debit);
}

export interface ProfitAndLoss {
  period: string;
  income: number;
  expenses: number;
  net: number;
  truncated: boolean;
}

/**
 * Income less expenses for a period.
 *
 * 🛑 Needs the account TYPES, which it takes as a map rather than inferring
 * from the code's leading digit. The range convention is for humans (see the
 * chart's own header); inferring from it makes the first out-of-range
 * account silently land in the wrong half of the P&L, and the total would
 * still look plausible.
 */
export function profitAndLoss(
  tb: TrialBalance,
  typeOf: (accountCode: string) => AccountType | undefined,
): ProfitAndLoss {
  let income = 0;
  let expenses = 0;

  for (const row of tb.rows) {
    const type = typeOf(row.accountCode);
    /*
     * 🛑 An UNKNOWN account is skipped and that is why `truncated` is not
     * the only honesty flag this needs — but it is the behaviour with the
     * least bad failure: including it would need a guessed type, and a
     * guessed type puts real money on the wrong side. An account code with
     * no account is a `chartOfAccounts` wipe (the orphan case its
     * `seedPurpose: "permanent"` exists to prevent), and the trial balance
     * above still shows the row, so the discrepancy is visible there.
     */
    if (!type) continue;
    if (type === "income") income += signedBalance(type, row);
    else if (type === "expense") expenses += signedBalance(type, row);
  }

  income = round2(income);
  expenses = round2(expenses);
  return { period: tb.period, income, expenses, net: round2(income - expenses), truncated: tb.truncated };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Re-exported for the audit, which checks the two mappings agree. */
export const NORMAL_SIDE_TABLE: Readonly<Record<AccountType, Side>> = NORMAL_SIDE;

export type { JournalLine };
