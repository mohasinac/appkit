export * from "./firestore";
import { z } from "zod";
import { getDefaultCurrency } from "../../../core/baseline-resolver";

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
