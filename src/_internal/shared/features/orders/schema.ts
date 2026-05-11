import { z } from "zod";
import {
  ORDER_CANCEL_REASON_MAX_LENGTH,
  ORDER_NOTE_MAX_LENGTH,
  ORDER_TRACKING_NUMBER_MAX_LENGTH,
} from "./config";

const addressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(10).max(15),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  country: z.string().default("India"),
});

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
      price: z.number().int().min(0),
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
