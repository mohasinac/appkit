// [SCHEMA] Shiprocket webhook envelopes (W7).
//
// Shiprocket POSTs tracking updates with the shape captured by the
// pre-existing `ShiprocketWebhookPayload` interface at
// `appkit/src/providers/shipping-shiprocket/index.ts`. This module ports
// that interface into a Zod schema so the consumer route
// (src/app/api/webhooks/shiprocket/route.ts) can validate at the
// boundary instead of casting through `as ShiprocketWebhookPayload`.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Tracking-update payload.
// ---------------------------------------------------------------------------

export const shiprocketTrackingUpdateSchema = z.object({
  awb: z.string(),
  order_id: z.string(),
  shipment_id: z.string(),
  current_status: z.string(),
  current_status_id: z.number().int(),
  courier_agent_assigned: z.boolean().optional(),
  etd: z.string().optional(),
  pickup_generated: z.boolean().optional(),
});

export type ShiprocketTrackingUpdate = z.infer<typeof shiprocketTrackingUpdateSchema>;
