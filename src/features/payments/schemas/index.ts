export * from "./firestore";
import { z } from "zod";
import { getDefaultCurrency } from "../../../core/baseline-resolver";

export const paymentGatewaySchema = z.enum([
  "razorpay",
  "stripe",
  "paypal",
  "cod",
  "bank_transfer",
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
