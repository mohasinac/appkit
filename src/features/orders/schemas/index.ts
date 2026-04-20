export * from "./firestore";
import { z } from "zod";

// --- Sub-schemas --------------------------------------------------------------

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "return_requested",
  "returned",
]);

export const orderItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  image: z.string().optional(),
  price: z.number(),
  quantity: z.number(),
  currency: z.string().optional(),
  sellerId: z.string().optional(),
  attributes: z.record(z.string()).optional(),
});

export const orderTimelineSchema = z.object({
  status: orderStatusSchema,
  message: z.string().optional(),
  timestamp: z.string(),
  actor: z.string().optional(),
});

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for an order.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { orderSchema } from "@mohasinac/feat-orders";
 *
 * const myOrderSchema = orderSchema.extend({
 *   giftMessage: z.string().optional(),
 *   loyaltyPointsEarned: z.number().optional(),
 * });
 * type MyOrder = z.infer<typeof myOrderSchema>;
 */
export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(orderItemSchema),
  // address shape is intentionally open to allow extending apps
  address: z.record(z.unknown()),
  orderStatus: orderStatusSchema,
  paymentStatus: z.string(),
  paymentGateway: z.string().optional(),
  subtotal: z.number(),
  shippingCost: z.number().optional(),
  discount: z.number().optional(),
  tax: z.number().optional(),
  total: z.number(),
  currency: z.string(),
  couponCode: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional(),
  notes: z.string().optional(),
  timeline: z.array(orderTimelineSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** Base schema for list-query parameters. */
export const orderListParamsSchema = z.object({
  userId: z.string().optional(),
  orderStatus: orderStatusSchema.optional(),
  paymentStatus: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
});
