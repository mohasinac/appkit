/**
 * Payouts Firestore Document Types & Constants
 */

import {
  generatePayoutId,
  type GeneratePayoutIdInput,
} from "../../../utils/id-generators";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import type { Encrypted, Plaintext } from "../../../security/encrypted";
import type { PayCadence } from "../../../_internal/shared/features/payouts/pay-period";

export interface PayoutBankAccount {
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
}

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

/**
 * A single refund deduction applied against a payout before dispatch.
 *
 * deductedAmount = refundedAmount − (refundedAmount × platformFeeRate)
 * The platform keeps its fee share; only the net seller portion is deducted.
 */
export interface PayoutRefundDeduction {
  orderId: string;
  refundId: string;
  /** Gross refund amount in decimal rupees (for audit trail). */
  refundedAmount: number;
  /** Net amount deducted from the seller payout in decimal rupees. */
  deductedAmount: number;
  reason: string;
  appliedAt: Date;
}

export const PayoutStatusValues = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
} as const satisfies Record<string, PayoutStatus>;

export type PayoutPaymentMethod = "bank_transfer" | "upi";

/**
 * `PayoutDocument` with its PII as plain `string` — what the named repository
 * accessors return, and what a WRITE path accepts (the repository encrypts).
 *
 * `Plaintext<T>` is the one definition of this shape; see `security/encrypted.ts`.
 * It is deliberately NOT distinguishable from a MASKED value — `maskPii`
 * returns plain strings too, and no type can express "these characters are
 * asterisks". The distinction is which named method you called.
 */
export type PayoutPlain = Plaintext<PayoutDocument>;

/**
 * 🛑 **A seller payout settles a LIABILITY. An employee payout is an EXPENSE.**
 *
 * One undiscriminated shape misstates both statements at once — wages vanish
 * from the P&L and reappear as settled seller liabilities — so `payeeType` is
 * a discriminated union rather than an optional field.
 *
 * ## Why `PayoutDocument` still names the STORE variant
 *
 * Every one of the ~30 existing readers means a seller payout, and every one
 * of them is correct. Renaming the type they import would turn a safety change
 * into a mechanical sweep, and the sweep is where the real mistakes go in.
 * `PayoutDocument = StorePayoutDocument` keeps them compiling and correct;
 * anything that must handle BOTH takes `AnyPayoutDocument` and is forced by
 * `tsc` to narrow.
 *
 * 🛑 `payeeType` is REQUIRED here, not optional-with-a-default. That breaks
 * the five sites that CONSTRUCT a payout, which is the entire point — a row
 * written without it is a row the books cannot classify, and an optional
 * discriminant defers that discovery to a reader rather than a writer.
 */
export interface StorePayoutDocument extends BaseDocument {
  payeeType: "store";
  storeId: string;
  sellerName: string;
  sellerEmail: Encrypted<string>;
  amount: number;
  grossAmount: number;
  platformFee: number;
  platformFeeRate: number;
  currency: string;
  status: PayoutStatus;
  paymentMethod: PayoutPaymentMethod;
  bankAccount?: PayoutBankAccount;
  upiId?: Encrypted<string>;
  notes?: string;
  adminNote?: string;
  orderIds: string[];
  gatewayFee?: number;
  gatewayFeeRate?: number;
  gstAmount?: number;
  gstRate?: number;
  isAutomatic?: boolean;
  /**
   * Refund deductions applied before dispatch (while status = "pending").
   * Each entry reduces the seller's net payout by deductedAmount.
   */
  refundDeductions?: PayoutRefundDeduction[];
  /**
   * amount − sum(refundDeductions.deductedAmount). Undefined when no
   * deductions have been applied; dispatch code must use `netAmount ?? amount`.
   */
  netAmount?: number;
  requestedAt: Date;
  processedAt?: Date;
  /** UTR / UPI ref / bank transfer ID entered by admin when marking paid. */
  transactionId?: string;
  /** Seller-set personal follow-up flag — surfaced only to the owning seller, never mutated by admin. */
  sellerReminderFlag?: boolean;

  /*
   * ── SPLIT SETTLEMENT: the gateway paid this, not us ──────────────────────
   *
   * Present only on a row created by `createSplitSettlementPayout`, i.e. a
   * seller share that a payment aggregator settled out of escrow at capture.
   * Absent means the ordinary manual path and nothing changes about it.
   *
   * 🛑 THESE ARE THE "do not re-add without a real writer" FIELDS, re-added
   * WITH one. The note two screens down records that the RazorpayX dispatcher
   * and its `razorpayPayoutId` / `razorpayStatus` / `failureCount` /
   * `lastFailureReason` were deleted together, and that instruction is honoured
   * here in both directions:
   *
   *   · the three below have a live writer — `createSplitSettlementPayout`,
   *     which is also the first thing in this codebase ever to write
   *     `status: "processing"`;
   *   · `failureCount` and `lastFailureReason` are deliberately NOT re-added,
   *     because a split settlement has no retry loop of ours to count. A
   *     refusal happens at capture, before any payout row exists, and the
   *     capture is refused rather than retried.
   *
   * 🛑 GATEWAY-NAMESPACED, never `cashfreeVendorId`. `supportsSplit` is a
   * capability precisely so a second splitting gateway is a registry row and
   * not a sweep (Root Cause #61); a gateway-shaped field name here would
   * reintroduce the coupling in the schema, where it is hardest to change.
   */

  /** The adapter that collected and split, e.g. `"cashfree"`. */
  settlementGateway?: string;
  /** The gateway's vendor id the money was settled to — i.e. the store slug. */
  settlementVendorId?: string;
  /**
   * The gateway reference this settlement can be looked up by.
   *
   * 🛑 Our own merchant order id for the CAPTURE, not a settlement id of the
   * gateway's: Easy Split settles on its own cycle and does not hand one back
   * at capture time. It is the only reference that exists at the moment the row
   * is written, and it is the join key to the orders — so it is honest about
   * what it is rather than being named after a value we do not have.
   */
  settlementReference?: string;

  /**
   * Who changed what, when, and why. See § "Status History" in CLAUDE.md.
   *
   * Payouts are the entity where this matters most to a seller: "it says
   * failed, what happened" was previously answerable only from
   * `lastFailureReason`, which the NEXT retry overwrites.
   */
  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
}

/**
 * Wages for a period, earned by resolving support tickets.
 *
 * ## 🛑 `platformFee` is ABSENT, not zero
 *
 * A `0` would read as "we took no commission on these wages", which is a
 * statement about a transaction that did not happen. Commission is not a
 * concept between a platform and its own staff, and the books must be able to
 * tell "not applicable" from "nil" — a nil commission is a seller payout where
 * the rate happened to resolve to zero, and those post differently.
 *
 * The same argument removes `storeId`, `sellerName`, `sellerEmail`,
 * `grossAmount`, `platformFeeRate`, `gatewayFee*`, `orderIds` and
 * `refundDeductions`. A field that cannot apply is omitted so `tsc` refuses
 * the read, rather than present-and-empty so a reader quietly gets a falsy
 * value.
 */
export interface EmployeePayoutDocument extends BaseDocument {
  payeeType: "employee";
  employeeUid: string;
  employeeName: string;
  /** PII, same treatment as a seller's. */
  employeeEmail: Encrypted<string>;
  amount: number;
  currency: string;
  status: PayoutStatus;
  paymentMethod: PayoutPaymentMethod;
  bankAccount?: PayoutBankAccount;
  upiId?: Encrypted<string>;
  /**
   * The tickets this payslip is for.
   *
   * 🛑 Tickets **still resolved at period end**, not tickets closed during it.
   * Paying per ticket closed rewards closing rather than resolving, so a
   * reopened ticket does not count — see `resolvedTicketsForPeriod`.
   */
  ticketIds: string[];
  /** Resolved by `payPeriodFor`, never computed at a call site. */
  periodStart: Date;
  periodEnd: Date;
  payCadence: PayCadence;
  notes?: string;
  adminNote?: string;
  requestedAt: Date;
  processedAt?: Date;
  transactionId?: string;
  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
}

/**
 * What ~30 existing readers mean, and what they should keep meaning.
 *
 * Deliberately an alias rather than a rename: see the header on
 * `StorePayoutDocument`.
 */
export type PayoutDocument = StorePayoutDocument;

/** Use this ONLY where both kinds genuinely arrive together. */
export type AnyPayoutDocument = StorePayoutDocument | EmployeePayoutDocument;

/**
 * 🛑 Narrow on the DISCRIMINANT, never on the presence of `storeId`.
 *
 * A `"storeId" in payout` test reads as equivalent and is not: it answers a
 * question about the object in hand rather than about what the row IS, so a
 * partially-populated or hand-built object answers it wrongly, silently, and
 * in the direction that posts wages as a settled seller liability.
 */
export function isStorePayout(p: AnyPayoutDocument): p is StorePayoutDocument {
  return p.payeeType === "store";
}

export function isEmployeePayout(p: AnyPayoutDocument): p is EmployeePayoutDocument {
  return p.payeeType === "employee";
}

/**
 * The fields whose changes earn a timeline entry.
 *
 * `netAmount`/`refundDeductions` are excluded — a refund deduction is money
 * churn before dispatch, and § "Status History" keeps money off the timeline;
 * `refundDeductions[]` on the document is already its own record.
 *
 * The automated RazorpayX payout-dispatch job (and the `razorpayPayoutId` /
 * `razorpayStatus` / `failureCount` / `lastFailureReason` fields it alone
 * wrote) was deleted when Razorpay was replaced by PhonePe — PhonePe has no
 * comparable payout API, so seller payouts are fully manual again via
 * `adminUpdatePayout`. Those four fields no longer exist on `PayoutDocument`;
 * do not re-add them here without a real writer.
 *
 * 🛑 PARTIALLY SUPERSEDED 2026-10-31, and read the asymmetry rather than the
 * headline. Split settlement is NOT a payouts API — the whole point is that the
 * aggregator settles out of escrow and the platform never holds the money, so
 * there is no dispatcher to rebuild. What it does give is a real writer for
 * `status: "processing"` and for three gateway-namespaced fields
 * (`settlementGateway` / `settlementVendorId` / `settlementReference`, declared
 * on `StorePayoutDocument` above). `failureCount` and `lastFailureReason` stay
 * deleted: a split has no retry loop of ours to count, because a refusal
 * happens at capture, before a payout row exists.
 *
 * `settlementGateway` and friends are deliberately NOT tracked below. They are
 * written once, at the row's birth, and never change — a tracked field that
 * cannot move would add a timeline entry describing the creation the row
 * already is.
 */
export const PAYOUT_TRACKED_FIELDS = [
  "status",
  "processedAt",
  "transactionId",
] as const;

export const PAYOUT_COLLECTION = "payouts" as const;

export const PAYOUT_INDEXED_FIELDS = [
  "storeId",
  "status",
  "requestedAt",
  "createdAt",
] as const;

export const DEFAULT_PLATFORM_FEE_RATE = 0.05 as const;

export const DEFAULT_PAYOUT_DATA: Partial<PayoutDocument> = {
  /*
   * 🛑 Here as a BACKSTOP, not as the reason the field is set. Every caller
   * passes `payeeType` explicitly and must keep doing so — a default that is
   * the only writer makes the discriminant optional in practice, which is the
   * exact failure the required field exists to prevent. This catches a row
   * built by some path nobody enumerated and lands it on the correct side of
   * the books rather than on neither.
   */
  payeeType: "store",
  status: "pending",
  platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
  orderIds: [],
};

export const PAYOUT_FIELDS = {
  STORE_ID: "storeId",
  SELLER_NAME: "sellerName",
  SELLER_EMAIL: "sellerEmail",
  SELLER_EMAIL_INDEX: "sellerEmailIndex",
  STATUS: "status",
  REQUESTED_AT: "requestedAt",
  CREATED_AT: "createdAt",
  STATUS_VALUES: {
    PENDING: "pending" as PayoutStatus,
    PROCESSING: "processing" as PayoutStatus,
    PAID: "paid" as PayoutStatus,
    FAILED: "failed" as PayoutStatus,
  },
} as const;

export const PAYOUT_PUBLIC_FIELDS = [
  "id",
  "storeId",
  "amount",
  "currency",
  "status",
  "paymentMethod",
  "requestedAt",
  "processedAt",
  "createdAt",
] as const;

/*
 * 🛑 `transactionId` was MISSING here until 2026-08-26, and the whole
 * mark-paid flow was built on top of the gap:
 *
 *   · `AdminPayoutMarkPaidModal` collects a UTR and makes it REQUIRED
 *   · `PATCH /api/admin/payouts/[id]` declares it in its Zod schema and its
 *     own docstring advertises "+ transaction reference"
 *   · that route's test asserts it reaches `adminUpdatePayout`
 *   · `adminUpdatePayout` picks only the fields in THIS list, so it was
 *     dropped — and the route replies `{ id, ...body }`, echoing the
 *     discarded UTR back as though it had been stored
 *
 * Every payout marked paid before this therefore has no payment reference,
 * which is the one field a seller disputing "you say you paid me" needs.
 * Root Cause #40's shape: a 200 that confirms a write which never happened.
 *
 * `processedAt` stays accepted for back-compat but is server-stamped by
 * `updateStatus` on the transition into paid/failed — a client-sent
 * timestamp is how the reports collection ended up with two shapes in one
 * field.
 */
export const PAYOUT_ADMIN_UPDATEABLE_FIELDS = [
  "status",
  "adminNote",
  "processedAt",
  "transactionId",
] as const;

/** The only field a seller may write on their own payout doc. */
export const PAYOUT_SELLER_UPDATEABLE_FIELDS = ["sellerReminderFlag"] as const;

/*
 * 🛑 Derived from the PLAIN shape. The caller holds a real email and the
 * repository encrypts on write; deriving from the document would demand
 * `Encrypted<string>` nobody has, and `asEncrypted(value)` to satisfy it is
 * the misuse that helper's docstring forbids.
 */
export type PayoutCreateInput = Omit<
  PayoutPlain,
  "id" | "createdAt" | "updatedAt" | "status" | "requestedAt"
>;
export type PayoutUpdateInput = Partial<
  Pick<PayoutDocument, (typeof PAYOUT_ADMIN_UPDATEABLE_FIELDS)[number]>
>;

export const payoutQueryHelpers = {
  byStore: (storeId: string) => ["storeId", "==", storeId] as const,
  byStatus: (status: PayoutStatus) => ["status", "==", status] as const,
  pendingForStore: (storeId: string) =>
    [
      ["storeId", "==", storeId],
      ["status", "==", "pending"],
    ] as const,
} as const;

export function createPayoutId(input: GeneratePayoutIdInput): string {
  return generatePayoutId(input);
}
