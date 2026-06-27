/**
 * Payouts Firestore Document Types & Constants
 */

import {
  generatePayoutId,
  type GeneratePayoutIdInput,
} from "../../../utils/id-generators";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export interface PayoutBankAccount {
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
}

export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

/**
 * A single refund deduction applied against a payout before dispatch.
 *
 * deductedAmount = refundedAmount − (refundedAmount × platformFeeRate)
 * The platform keeps its fee share; only the net seller portion is deducted.
 */
export interface PayoutRefundDeduction {
  orderId: string;
  refundId: string;
  /** Gross refund amount in paise (for audit trail). */
  refundedAmount: number;
  /** Net amount deducted from the seller payout in paise. */
  deductedAmount: number;
  reason: string;
  appliedAt: Date;
}

export const PayoutStatusValues = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
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
}

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
    COMPLETED: "completed" as PayoutStatus,
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

export const PAYOUT_ADMIN_UPDATEABLE_FIELDS = [
  "status",
  "adminNote",
  "processedAt",
] as const;

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
