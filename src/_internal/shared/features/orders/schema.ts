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

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
