export * from "./firestore";
export * from "./saved-methods-firestore";
import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema, rupeesSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors PayoutDocument + PayoutRefundDeduction + PayoutBankAccount in
// ./firestore.ts. Registered into SCHEMAS.firestore.payouts.

export const payoutStatusEnumSchema = z.enum(["pending", "processing", "paid", "failed"]);
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
  refundedAmount: rupeesSchema,
  deductedAmount: rupeesSchema,
  reason: z.string(),
  appliedAt: firestoreDateSchema,
});

export const payoutFirestoreSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  sellerName: z.string(),
  sellerEmail: z.string(),
  amount: rupeesSchema,
  grossAmount: rupeesSchema,
  platformFee: rupeesSchema,
  platformFeeRate: z.number().min(0).max(1),
  currency: z.string(),
  status: payoutStatusEnumSchema,
  paymentMethod: payoutPaymentMethodSchema,
  bankAccount: payoutBankAccountSchema.optional(),
  upiId: z.string().optional(),
  notes: z.string().optional(),
  adminNote: z.string().optional(),
  orderIds: z.array(z.string()),
  gatewayFee: rupeesSchema.optional(),
  gatewayFeeRate: z.number().optional(),
  gstAmount: rupeesSchema.optional(),
  gstRate: z.number().optional(),
  isAutomatic: z.boolean().optional(),
  refundDeductions: z.array(payoutRefundDeductionSchema).optional(),
  netAmount: rupeesSchema.optional(),
  requestedAt: firestoreDateSchema,
  processedAt: firestoreDateSchema.optional(),
  ...auditTimestampsShape,
});

export type PayoutFromSchema = z.infer<typeof payoutFirestoreSchema>;

/** Zod schema for payout status — use instead of inline `z.enum(["pending",...])`. */
export const payoutStatusSchema = z.enum([
  "pending",
  "processing",
  "paid",
  "failed",
]);

