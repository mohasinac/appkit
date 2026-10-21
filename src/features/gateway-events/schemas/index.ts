// [SCHEMA] gateway-events feature — Firestore document schema.
//
// Mirrors GatewayEventDocument in ./firestore.ts.
//
// 🛑 THE MIRROR MUST BE COMPLETE, and that is not a style point. `z.object()`
// STRIPS unknown keys, so a field present on the interface and absent here is
// silently DELETED by any parse — which is precisely what
// `orderRefundEventSchema` was doing to `reasonCode` and `razorpayRefundId`
// (the schema written to validate a gateway refund reference discarded it), and
// what `serverErrorFirestoreSchema` was doing to `cause`, `entityType` and
// `entityId`. Both were found by reading the two files side by side, which is
// the only way this class of drift is ever found.
//
// So: a field added to `GatewayEventDocument` is added here in the same edit.

import { z } from "zod";

export * from "./firestore";

export const gatewayEventKindSchema = z.enum([
  "paid",
  "failed",
  "dispute",
  "refund",
  "other",
]);

export const gatewayEventStatusSchema = z.enum([
  "received",
  "processing",
  "processed",
  "ignored",
  "conflict",
  "failed",
]);

/**
 * The redacted payload, as a recursive JSON-ish value.
 *
 * `z.record(z.unknown())` would accept anything and assert nothing; this at
 * least pins the shape to serialisable data, which is the property that matters
 * for a field written to Firestore and read back into an admin table.
 */
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const gatewayEventFirestoreSchema = z.object({
  id: z.string(),
  gateway: z.string(),
  rawEvent: z.string(),
  kind: gatewayEventKindSchema,
  status: gatewayEventStatusSchema,
  terminal: z.boolean().optional(),
  providerEventId: z.string().optional(),
  bodySha256: z.string(),
  gatewayOrderId: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  /*
   * No `.int()`. The amount is decimal RUPEES, so a legitimate ₹1,499.50 must
   * parse — `audit-money-units`' INT_ON_MONEY_FIELD rule exists because that
   * constraint survived the subunit→rupee migration on six money fields and
   * rejected real values.
   */
  amount: z.number().optional(),
  orderIds: z.array(z.string()).optional(),
  receivedAt: z.date(),
  claimedAt: z.date(),
  leaseExpiresAt: z.date(),
  processedAt: z.date().optional(),
  attempts: z.number(),
  lastError: z.string().optional(),
  expiresAt: z.date(),
  payload: z.record(jsonValueSchema).optional(),
  payloadTruncated: z.boolean().optional(),
  // BaseDocument
  createdAt: z.date(),
  updatedAt: z.date(),
  seedPurpose: z.string().optional(),
});

export type GatewayEventFromSchema = z.infer<typeof gatewayEventFirestoreSchema>;
