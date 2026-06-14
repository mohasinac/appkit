export * from "./firestore";
import { z } from "zod";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { auditTimestampsShape, firestoreDateSchema, paiseSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors PayoutDocument + PayoutRefundDeduction + PayoutBankAccount in
// ./firestore.ts. Registered into SCHEMAS.firestore.payouts.

export const payoutStatusEnumSchema = z.enum(["pending", "processing", "completed", "failed"]);
export const payoutPaymentMethodSchema = z.enum(["bank_transfer", "upi"]);

export const payoutBankAccountSchema = z.object({
  accountHolderName: z.string(),
  accountNumberMasked: z.string(),
  ifscCode: z.string(),
  bankName: z.string(),
});

export const payoutRefundDeductionSchema = z.object({
  orderId: z.string(),
  refundId: z.string(),
  refundedAmount: paiseSchema,
  deductedAmount: paiseSchema,
  reason: z.string(),
  appliedAt: firestoreDateSchema,
});

export const payoutFirestoreSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  sellerName: z.string(),
  sellerEmail: z.string(),
  amount: paiseSchema,
  grossAmount: paiseSchema,
  platformFee: paiseSchema,
  platformFeeRate: z.number().min(0).max(1),
  currency: z.string(),
  status: payoutStatusEnumSchema,
  paymentMethod: payoutPaymentMethodSchema,
  bankAccount: payoutBankAccountSchema.optional(),
  upiId: z.string().optional(),
  notes: z.string().optional(),
  adminNote: z.string().optional(),
  orderIds: z.array(z.string()),
  gatewayFee: paiseSchema.optional(),
  gatewayFeeRate: z.number().optional(),
  gstAmount: paiseSchema.optional(),
  gstRate: z.number().optional(),
  isAutomatic: z.boolean().optional(),
  refundDeductions: z.array(payoutRefundDeductionSchema).optional(),
  netAmount: paiseSchema.optional(),
  requestedAt: firestoreDateSchema,
  processedAt: firestoreDateSchema.optional(),
  ...auditTimestampsShape,
});

export type PayoutFromSchema = z.infer<typeof payoutFirestoreSchema>;

/** Zod schema for payout status — use instead of inline `z.enum(["pending",...])`. */
export const payoutStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

/**
 * Canonical payment gateway identifiers.
 * Use these constants instead of bare string literals.
 */
export const PaymentGatewayValues = {
  RAZORPAY: "razorpay",
  STRIPE: "stripe",
  PAYPAL: "paypal",
  COD: "cod",
  UPI: "upi",
  WHATSAPP: "whatsapp",
  BANK_TRANSFER: "bank_transfer",
} as const;

export type PaymentGateway =
  (typeof PaymentGatewayValues)[keyof typeof PaymentGatewayValues];

export const paymentGatewaySchema = z.enum([
  PaymentGatewayValues.RAZORPAY,
  PaymentGatewayValues.STRIPE,
  PaymentGatewayValues.PAYPAL,
  PaymentGatewayValues.COD,
  PaymentGatewayValues.UPI,
  PaymentGatewayValues.WHATSAPP,
  PaymentGatewayValues.BANK_TRANSFER,
]);

export const paymentStatusSchema = z.enum([
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "partially_refunded",
]);

/**
 * Base Zod schema for a payment record.
 *
 * @example
 * import { paymentRecordSchema } from "@mohasinac/feat-payments";
 *
 * const mySchema = paymentRecordSchema.extend({
 *   bankReference: z.string().optional(),
 * });
 */
export const paymentRecordSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  gateway: paymentGatewaySchema,
  gatewayPaymentId: z.string().optional(),
  amount: z.number(),
  currency: z.string().default(getDefaultCurrency()),
  status: paymentStatusSchema.default("pending"),
  createdAt: z.string().optional(),
});

export const paymentGatewayConfigSchema = z.object({
  id: z.string(),
  gateway: paymentGatewaySchema,
  isEnabled: z.boolean().default(false),
  displayName: z.string(),
  sortOrder: z.number().default(0),
});
