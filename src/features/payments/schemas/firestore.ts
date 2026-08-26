/**
 * Payouts Firestore Document Types & Constants
 */

import {
  generatePayoutId,
  type GeneratePayoutIdInput,
} from "../../../utils/id-generators";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";

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

export interface PayoutDocument extends BaseDocument {
  storeId: string;
  sellerName: string;
  sellerEmail: string;
  amount: number;
  grossAmount: number;
  platformFee: number;
  platformFeeRate: number;
  currency: string;
  status: PayoutStatus;
  paymentMethod: PayoutPaymentMethod;
  bankAccount?: PayoutBankAccount;
  upiId?: string;
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
   * ── Dispatch outcome ──────────────────────────────────────────────────
   *
   * All four are written by `recordSuccess` / `recordFailure` in the payouts
   * batch and were **undeclared here** until 2026-08-26 — the same
   * written-but-not-declared shape as Root Cause #70's `adSettings`. Nothing
   * type-checked against them, so no reader could safely surface a dispatch
   * failure to the seller or to an admin, and only the repository's own tests
   * knew they existed.
   */
  /** Razorpay's payout id, once the API accepted the dispatch. */
  razorpayPayoutId?: string;
  /** Razorpay's own status string — NOT this document's `status`. */
  razorpayStatus?: string;
  /** Consecutive dispatch failures. At MAX_FAILURES the payout goes `failed`. */
  failureCount?: number;
  /**
   * Why the LAST attempt failed. Overwritten by every retry, which is why the
   * timeline tracks it: `statusHistory` is the only place the earlier reasons
   * survive.
   */
  lastFailureReason?: string;

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
 * The fields whose changes earn a timeline entry.
 *
 * `netAmount`/`refundDeductions` are excluded — a refund deduction is money
 * churn before dispatch, and § "Status History" keeps money off the timeline;
 * `refundDeductions[]` on the document is already its own record.
 * `failureCount` is excluded because `lastFailureReason` changing is the
 * event, and tracking both would double every retry entry.
 */
export const PAYOUT_TRACKED_FIELDS = [
  "status",
  "processedAt",
  "transactionId",
  "razorpayPayoutId",
  "razorpayStatus",
  "lastFailureReason",
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

export type PayoutCreateInput = Omit<
  PayoutDocument,
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
