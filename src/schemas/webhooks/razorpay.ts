// [SCHEMA] Razorpay webhook envelopes (W7).
//
// Razorpay dispatches webhook POSTs with shape `{ event, payload, ... }`
// where `event` is a discriminator like "payment.captured" /
// "payment.failed" / "refund.processed" / "order.paid" and `payload`
// carries the corresponding entity nested under `payment`, `refund`, or
// `order`.
//
// Consumed by src/app/api/payment/webhook/route.ts (W7 — wire the route
// to call razorpayWebhookEnvelopeSchema.parse(JSON.parse(rawBody))).

import { z } from "zod";

// ---------------------------------------------------------------------------
// Common entity shapes.
// ---------------------------------------------------------------------------

export const razorpayPaymentEntitySchema = z.object({
  id: z.string(),
  entity: z.literal("payment").optional(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  order_id: z.string().optional(),
  invoice_id: z.string().nullable().optional(),
  international: z.boolean().optional(),
  method: z.string().optional(),
  amount_refunded: z.number().int().optional(),
  refund_status: z.string().nullable().optional(),
  captured: z.boolean().optional(),
  description: z.string().nullable().optional(),
  card_id: z.string().nullable().optional(),
  bank: z.string().nullable().optional(),
  wallet: z.string().nullable().optional(),
  vpa: z.string().nullable().optional(),
  email: z.string().optional(),
  contact: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
  fee: z.number().int().optional(),
  tax: z.number().int().optional(),
  error_code: z.string().nullable().optional(),
  error_description: z.string().nullable().optional(),
  error_source: z.string().nullable().optional(),
  error_step: z.string().nullable().optional(),
  error_reason: z.string().nullable().optional(),
  acquirer_data: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
  created_at: z.number().int().optional(),
});

export const razorpayRefundEntitySchema = z.object({
  id: z.string(),
  entity: z.literal("refund").optional(),
  amount: z.number().int(),
  currency: z.string(),
  payment_id: z.string(),
  notes: z.record(z.string(), z.string()).optional(),
  receipt: z.string().nullable().optional(),
  acquirer_data: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
  created_at: z.number().int().optional(),
  batch_id: z.string().nullable().optional(),
  status: z.string(),
  speed_processed: z.string().optional(),
  speed_requested: z.string().optional(),
});

export const razorpayOrderEntitySchema = z.object({
  id: z.string(),
  entity: z.literal("order").optional(),
  amount: z.number().int(),
  amount_paid: z.number().int().optional(),
  amount_due: z.number().int().optional(),
  currency: z.string(),
  receipt: z.string().nullable().optional(),
  status: z.string(),
  attempts: z.number().int().optional(),
  notes: z.record(z.string(), z.string()).optional(),
  created_at: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Per-event payload buckets.
// ---------------------------------------------------------------------------

const paymentCapturedPayload = z.object({ payment: z.object({ entity: razorpayPaymentEntitySchema }) });
const paymentFailedPayload = z.object({ payment: z.object({ entity: razorpayPaymentEntitySchema }) });
const refundProcessedPayload = z.object({
  refund: z.object({ entity: razorpayRefundEntitySchema }),
  payment: z.object({ entity: razorpayPaymentEntitySchema }).optional(),
});
const refundFailedPayload = z.object({ refund: z.object({ entity: razorpayRefundEntitySchema }) });
const orderPaidPayload = z.object({
  order: z.object({ entity: razorpayOrderEntitySchema }),
  payment: z.object({ entity: razorpayPaymentEntitySchema }).optional(),
});

// ---------------------------------------------------------------------------
// Envelope: discriminated union keyed on `event`.
// ---------------------------------------------------------------------------

const envelopeBase = {
  account_id: z.string().optional(),
  contains: z.array(z.string()).optional(),
  created_at: z.number().int().optional(),
};

export const razorpayWebhookEnvelopeSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("payment.captured"), payload: paymentCapturedPayload, ...envelopeBase }),
  z.object({ event: z.literal("payment.failed"), payload: paymentFailedPayload, ...envelopeBase }),
  z.object({ event: z.literal("payment.authorized"), payload: paymentCapturedPayload, ...envelopeBase }),
  z.object({ event: z.literal("refund.processed"), payload: refundProcessedPayload, ...envelopeBase }),
  z.object({ event: z.literal("refund.failed"), payload: refundFailedPayload, ...envelopeBase }),
  z.object({ event: z.literal("refund.created"), payload: refundProcessedPayload, ...envelopeBase }),
  z.object({ event: z.literal("order.paid"), payload: orderPaidPayload, ...envelopeBase }),
]);

export type RazorpayWebhookEnvelope = z.infer<typeof razorpayWebhookEnvelopeSchema>;
export type RazorpayPaymentEntity = z.infer<typeof razorpayPaymentEntitySchema>;
export type RazorpayRefundEntity = z.infer<typeof razorpayRefundEntitySchema>;
export type RazorpayOrderEntity = z.infer<typeof razorpayOrderEntitySchema>;
