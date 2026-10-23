/**
 * `chartOfAccounts` + `journalEntries` — Part 4's double-entry books.
 *
 * ## 🛑 THE LEDGER IS A PROJECTION. Orders, payouts and expenses are truth.
 *
 * The same split `obligations` takes, and for the same reason. An order says
 * what was sold; a journal entry is an accounting *statement about* that
 * order. So: **never read a balance to make an operational decision.** Do not
 * gate a payout on a ledger figure, do not refuse a refund because an account
 * looks short — read the payout and the order. A projection that starts
 * making decisions becomes a second source of truth, and then the two
 * disagree with no way to say which is wrong.
 *
 * ## 🛑 Every entry is MACHINE-GENERATED from a business event
 *
 * This is the one constraint that makes the whole thing safe. If a human has
 * to remember that a gateway fee is `Dr Bank Charges / Cr Bank`, it will
 * eventually be posted the other way round; if the settlement ingest posts
 * it, it cannot be. `sourceEvent` is REQUIRED and names the event, not the
 * person — a hand-posted adjustment uses `"manual-journal"`, which is a
 * distinguishable value precisely so the exception stays countable.
 *
 * ## 🛑 A correction is a REVERSING ENTRY, never an edit
 *
 * The invoice/credit-note rule, applied to the books. `journalEntries` rows
 * are append-only: `reverse()` writes a NEW entry with the legs swapped and
 * the two pointed at each other. An edit would silently rewrite a period a
 * GST return has already been filed for, and nothing downstream could tell.
 *
 * ## 🛑 Money is DECIMAL RUPEES, matching every other money field here
 *
 * Rupees with two decimal places, like every other money field here. The
 * 2026-05 migration moved the whole codebase off minor units and
 * `audit-money-units` enforces it; a ledger in minor units would be the one
 * place a reader has to remember a different scale, which is how a 100×
 * error gets written (Root Cause #31).
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const CHART_OF_ACCOUNTS_COLLECTION = "chartOfAccounts";
export const JOURNAL_ENTRIES_COLLECTION = "journalEntries";
export const ACCOUNTING_PERIODS_COLLECTION = "accountingPeriods";

/**
 * The five classical account types.
 *
 * Carried on the ACCOUNT rather than inferred from its code, because the
 * normal-balance side and every report's sign convention derive from it —
 * and a report that guesses the type from a code prefix breaks the first time
 * somebody adds an account out of range.
 */
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

/**
 * Which side INCREASES this account.
 *
 * Derived from `AccountType` by `normalBalanceFor`, never stored — a stored
 * copy is a mirror that drifts the first time somebody types the wrong one
 * (Root Cause #42), and the mapping is a fact about accounting rather than
 * about this business.
 */
export type NormalBalance = "debit" | "credit";

export function normalBalanceFor(type: AccountType): NormalBalance {
  return type === "asset" || type === "expense" ? "debit" : "credit";
}

export interface ChartAccountDocument extends BaseDocument {
  /**
   * Stable numeric code, e.g. `"1100"`. The id is `account-{code}`.
   *
   * 🛑 Codes are grouped by type in the conventional Indian small-business
   * ranges (1xxx asset, 2xxx liability, 3xxx equity, 4xxx income, 5xxx
   * expense) **so a CA can map them to Tally at a glance** — that is the
   * entire reason for a numeric code rather than a slug. It is a convention
   * for humans; nothing in the code derives `type` from the range, because a
   * derivation would make adding an account outside it silently wrong.
   */
  code: string;
  name: string;
  type: AccountType;
  /** A one-line note for whoever has to reconcile this against a bank statement. */
  description?: string;
  /**
   * A closed account refuses new postings but keeps its history.
   *
   * Deliberately not a delete: an account with entries against it cannot be
   * removed without orphaning them, and a closed row still has to appear in
   * last year's trial balance.
   */
  isActive: boolean;
}

/**
 * One side of one entry.
 *
 * 🛑 `debit` and `credit` are SEPARATE non-negative fields rather than one
 * signed amount. A signed amount needs a sign convention, the convention
 * differs per account type, and a reader then has to know the account's type
 * to interpret the number — which is how a credit gets read as a debit. Two
 * fields are unambiguous at the point of reading, which is where it matters.
 *
 * Exactly one of them is non-zero on any line; `assertBalanced` refuses both.
 */
export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  /** Why this leg exists, for a human reading the entry a year later. */
  memo?: string;
  /**
   * Who this leg is ABOUT, when that is a specific counterparty — a store for
   * a seller payable, a vendor for a bill.
   *
   * Optional because most legs (bank, GST, sales) have no counterparty. Where
   * it exists it is what makes a per-seller payable ageing possible without a
   * separate ledger per store.
   */
  counterpartyId?: string;
}

/**
 * What caused this entry. REQUIRED, and the closed list is the point.
 *
 * 🛑 `manual-journal` is a real member and must stay one. The alternative —
 * letting a hand-posted entry claim an automated source — is how the "every
 * entry is machine-generated" constraint stops being checkable. With it
 * declared, "how many of our entries were typed by a person" is one query.
 */
export type JournalSourceEvent =
  | "order-placed"
  | "order-delivered"
  | "order-refunded"
  | "payout-paid"
  | "settlement-ingest"
  | "expense-recorded"
  | "asset-purchased"
  | "opening-balance"
  | "manual-journal"
  | "reversal";

export interface JournalEntryDocument extends BaseDocument {
  /**
   * The date the entry BELONGS TO, which is not when it was written.
   *
   * A settlement ingested on the 3rd for transactions on the 31st posts to
   * the 31st. `createdAt` records when we learned; this records when it
   * happened, and every report and the period lock read this one.
   */
  entryDate: Date;
  /** `YYYY-MM`, derived from `entryDate` — the lock and the rollups key on it. */
  period: string;
  sourceEvent: JournalSourceEvent;
  /**
   * The record that caused this — an order id, a payout id, an expense id.
   *
   * Absent only for `opening-balance` and `manual-journal`, which have no
   * causing record by definition. `verify-posting-rules` checks that pairing
   * rather than trusting it.
   */
  sourceId?: string;
  narration: string;
  lines: JournalLine[];
  /**
   * Both totals, stored.
   *
   * 🛑 Redundant with `lines` ON PURPOSE, and this is the one place a mirror
   * is right: a trial balance that had to sum every line of every entry is an
   * unbounded read, and these two are written inside the same transaction
   * that validated them. They cannot drift, because nothing can write an
   * entry without going through `assertBalanced`.
   */
  totalDebit: number;
  totalCredit: number;
  /** Set on the entry this one reverses, and on the reversal, pointing both ways. */
  reversedByEntryId?: string;
  reversesEntryId?: string;
}

/**
 * A period, and whether it is closed.
 *
 * Id is the period itself (`period-2026-10`), so the lock check is a single
 * `get` by a key the caller already has — not a query.
 */
export interface AccountingPeriodDocument extends BaseDocument {
  /** `YYYY-MM`. */
  period: string;
  status: "open" | "locked";
  /** Set when locked — which GST return this period was filed under. */
  lockedReason?: string;
  lockedAt?: Date;
  lockedByUid?: string;
}

export const LEDGER_FIELDS = {
  CODE: "code",
  TYPE: "type",
  IS_ACTIVE: "isActive",
  ENTRY_DATE: "entryDate",
  PERIOD: "period",
  SOURCE_EVENT: "sourceEvent",
  SOURCE_ID: "sourceId",
  STATUS: "status",
} as const;

/*
 * 🛑 `periodOf` LIVES IN `_internal/shared/features/ledger/posting.ts`, not
 * here, and the reason is mechanical rather than taxonomic.
 *
 * `verify-posting-rules.mjs` imports the posting rules directly via Node's
 * `--experimental-strip-types` so it exercises the shipped source rather
 * than a build artefact (Root Cause #105). Type stripping erases
 * `import type` entirely but cannot RESOLVE a runtime import — appkit source
 * is written extensionless and the build adds `.js` — so a single runtime
 * import in that file would make it unloadable and the audit would be a
 * load-failure instead of a check.
 *
 * Deciding which period an entry belongs to is a posting rule anyway, and it
 * is the one the audit most needs to exercise: a UTC derivation files every
 * IST evening sale in the previous GST return.
 */
