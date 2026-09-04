import { z } from "zod";
import {
  DEFAULT_COUNTRY,
  isValidPostalCode,
  postalLabelFor,
} from "../../../../constants/geo/countries";
import {
  ORDER_CANCEL_REASON_MAX_LENGTH,
  ORDER_NOTE_MAX_LENGTH,
  ORDER_TRACKING_NUMBER_MAX_LENGTH,
} from "./config";
import { RETURN_REASON } from "./return-reasons";

/*
 * The order's own SNAPSHOT of where it shipped, denormalised onto the order
 * document at creation. Its field names (`pincode`) are stored on every
 * existing order, so renaming them to match `AddressDocument` is a data
 * migration rather than a refactor — and a snapshot deliberately does NOT
 * follow the address it was copied from.
 *
 * The postal RULE is shared, which is the half that was wrong: `/^\d{6}$/`
 * is India-only, on an order whose country is whatever the buyer chose.
 */
// audit-address-shape-ok: an order's frozen shipping snapshot, not the address entity
const addressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(10).max(15),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().trim().min(1, "A postal code is required."),
  country: z.string().default(DEFAULT_COUNTRY),
}).superRefine((v, ctx) => {
  if (!isValidPostalCode(v.country, v.pincode)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pincode"],
      message: `That is not a valid ${postalLabelFor(v.country)}.`,
    });
  }
});

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
      price: z.number().min(0),
    }),
  ).min(1, "Order must have at least one item"),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["razorpay", "cod", "upi"]),
  couponCode: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["processing", "shipped", "delivered", "cancelled", "refunded", "return_requested"]),
  trackingNumber: z.string().max(ORDER_TRACKING_NUMBER_MAX_LENGTH).optional(),
  carrier: z.string().optional(),
  note: z.string().max(ORDER_NOTE_MAX_LENGTH).optional(),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().max(ORDER_CANCEL_REASON_MAX_LENGTH).optional(),
});

/**
 * A buyer asking to return a delivered order.
 *
 * `requestReturnAction` used to parse `cancelOrderSchema` — a cancellation is
 * a different event with a different window and a different outcome, and its
 * `reason` was optional free text that the action then dropped before writing.
 * So an order could reach `return_requested` carrying no reason at all, and
 * the seller had nothing to act on.
 *
 * The code is REQUIRED here: final sale has to decide whether this particular
 * return is allowed, and it cannot do that against an absent value.
 */
export const returnRequestSchema = z.object({
  orderId: z.string().min(1),
  reasonCode: z.enum(RETURN_REASON),
  reasonNote: z.string().max(ORDER_CANCEL_REASON_MAX_LENGTH).optional(),
  /** Omit for a whole-order return — matches `processRefundAction`'s itemIds. */
  itemIds: z.array(z.string().min(1)).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ReturnRequestInput = z.infer<typeof returnRequestSchema>;
