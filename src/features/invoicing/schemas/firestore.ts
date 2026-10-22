/**
 * Invoicing — the two gapless series (Phase 7, D12)
 *
 * ## Why two series and not one field
 *
 * **A GST invoice is issued once and must not change.** So a partial
 * cancellation or refund gets a CREDIT NOTE with its own number referencing
 * the invoice it adjusts — never a re-issued invoice. That is the whole reason
 * `creditNoteNumber` is a second series rather than a revision suffix.
 *
 * ## 🛑 Gapless means the counter CANNOT be sharded
 *
 * Firestore's ~1 write/sec/document ceiling applies to a counter doc, and the
 * usual answer is to shard it. That answer is unavailable here: a sharded
 * counter cannot be gapless, which is the entire requirement. At this volume
 * the ceiling is irrelevant; the note exists so nobody "optimises" it later
 * and silently breaks the one property an auditor checks.
 *
 * ## 🛑 The FINANCIAL YEAR is the riskiest line in the phase
 *
 * The series is `LIR/26-27/0001` (decision 21), resetting on 1 April. So the
 * allocating transaction must key on the FY — if it keys on anything else, two
 * years share one counter and NEITHER series is gapless. And a number cannot
 * be withdrawn without leaving a gap, so this is not a mistake that can be
 * corrected after the fact.
 */

/**
 * ## 🛑 OUTSTANDING — both collections need a PRESERVE entry in the tester tier
 *
 * `invoiceCounters` and `invoiceAllocations` are in **no tier**, and
 * `assertDeletable` THROWS on an unlisted collection name *mid-run* — which
 * reads as a harness fault rather than a classification gap. That is the exact
 * latent trip `gatewayOrderClaims` sat on, and these two are worse: a wiped
 * counter would restart a series at 1 and re-issue numbers that already exist
 * on real invoices, which is unrecoverable.
 *
 * The entry belongs in `tester/scripts/lib/collections.mjs`'s PRESERVE list,
 * beside `payoutMethods` and `adminAuditLog`. It is not in this change because
 * **the `tester` submodule is not initialised in this worktree** (`git
 * submodule status` shows it uninitialised), so the file does not exist here to
 * edit. Recorded rather than silently skipped.
 *
 * 🛑 And they must get **no `SEED_COLLECTION_PURPOSE` entry**:
 * `audit-seed-purpose` R1 requires that registry to match `COLLECTION_MAP` in
 * BOTH directions, so a key for a collection the seeder does not write is a
 * DEAD entry and fails the audit. Neither of these is ever seeded — they are
 * written only by allocation. The same mistake was made with `refundClaims`
 * and reverted.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const INVOICE_COUNTER_COLLECTION = "invoiceCounters";

/** The two independent series. */
export type InvoiceSeriesKind = "invoice" | "credit_note";

/**
 * One counter per (series, financial year).
 *
 * The document id IS `${kind}_${fy}` — e.g. `invoice_26-27` — so the
 * transaction that allocates a number needs no query, and two series in the
 * same year cannot contend with each other.
 */
export interface InvoiceCounterDocument extends BaseDocument {
  kind: InvoiceSeriesKind;
  /** `"26-27"` — the FY label that appears in the number itself. */
  fy: string;
  /**
   * The last number ISSUED. The next allocation is `lastNumber + 1`.
   *
   * 🛑 Last-issued rather than next-to-issue, deliberately: a counter created
   * at 0 means "nothing issued yet", which is true and self-evident, whereas a
   * next-to-issue counter created at 0 would mint `LIR/26-27/0000`.
   */
  lastNumber: number;
  /** When this counter last allocated — for the operator, never read by code. */
  lastIssuedAt?: Date;
}

/**
 * A record of every number allocated, keyed on what it was allocated FOR.
 *
 * ## 🛑 This is the idempotency claim, and it is why a number cannot be issued
 * twice for one order
 *
 * `onOrderStatusChange` can fire more than once, and **two numbers for one
 * order is the single unrecoverable failure in this phase** — the spare number
 * is a permanent gap that cannot be explained to an auditor and cannot be
 * reclaimed.
 *
 * So allocation is a `.create()` on `invoiceAllocations/{subjectId}` INSIDE
 * the same transaction that bumps the counter. `.create()` fails if the
 * document exists, which makes "already allocated" a transaction-level fact
 * rather than a read-then-write race. It is the same primitive the refund
 * claim, the gateway-event inbox and the gateway-order claim all use.
 */
export const INVOICE_ALLOCATION_COLLECTION = "invoiceAllocations";

export interface InvoiceAllocationDocument extends BaseDocument {
  kind: InvoiceSeriesKind;
  /**
   * What this number was issued for.
   *
   * 🛑 For an invoice this is the ORDER id, so one order can only ever hold
   * one invoice number. For a credit note it is `${orderId}_${refundId}`,
   * because an order can legitimately have several credit notes — one per
   * refund event — and keying a credit note on the order alone would refuse
   * the second one.
   */
  subjectId: string;
  orderId: string;
  /** The formatted number, e.g. `LIR/26-27/0001`. */
  number: string;
  fy: string;
  sequence: number;
  issuedAt: Date;
}
