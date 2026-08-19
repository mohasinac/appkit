export * from "./firestore";
import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema, rupeesSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors OrderDocument + OrderDocumentItem + OrderRefundEvent +
// AppliedOrderDiscount in ./firestore.ts. Registered into SCHEMAS.firestore.orders.

export const orderListingTypeSchema = z.enum([
  "standard",
  "auction",
  "pre-order",
  "prize-draw",
  "classified",
  "digital-code",
  "live",
]);

export const orderPaymentStatusSchema = z.enum([
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded",
  "partial_refund",
]);

export const orderShippingMethodSchema = z.enum(["custom"]);
export const orderRefundStatusSchema = z.enum(["pending", "processing", "completed", "rejected"]);
export const orderPayoutStatusSchema = z.enum(["eligible", "requested", "paid"]);
export const orderRefundTypeSchema = z.enum(["full", "partial"]);

export const outOfStockPolicySchema = z.enum(["cancel_order", "skip_items"]);
export const orderDroppedItemSchema = z.object({
  productId: z.string(),
  productTitle: z.string(),
  requestedQty: z.number().int().positive(),
  availableQty: z.number().int().nonnegative(),
});

export const emiInstallmentStatusSchema = z.enum(["pending", "paid", "overdue"]);
export const emiInstallmentSchema = z.object({
  index: z.number().int().positive(),
  dueDate: firestoreDateSchema,
  amount: rupeesSchema,
  status: emiInstallmentStatusSchema,
  paidAt: firestoreDateSchema.optional(),
  transactionId: z.string().optional(),
  proofUrl: z.string().optional(),
  reminderSentAt: firestoreDateSchema.optional(),
});

export const orderDocumentItemSchema = z.object({
  productId: z.string(),
  productTitle: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: rupeesSchema,
  totalPrice: rupeesSchema,
  listingType: orderListingTypeSchema.optional(),
  prizeRevealStatus: z.enum(["pending", "open", "closed", "revealed"]).optional(),
});

export const orderRefundEventSchema = z.object({
  refundId: z.string(),
  type: orderRefundTypeSchema,
  amount: rupeesSchema,
  itemIds: z.array(z.string()).optional(),
  reason: z.string(),
  refundedAt: firestoreDateSchema,
  refundedBy: z.string(),
  razorpayRefundId: z.string().optional(),
  manualTransactionId: z.string().optional(),
  proofDocumentUrl: z.string().optional(),
  proofDocumentMimeType: z.string().optional(),
  overrideReason: z.string().optional(),
});

export const appliedOrderDiscountSchema = z.object({
  code: z.string(),
  couponId: z.string().optional(),
  type: z.enum(["coupon", "deal", "auto"]),
  discountAmount: rupeesSchema,
  scope: z.enum(["admin", "seller"]).optional(),
  storeId: z.string().optional(),
});

export const prizeWonSchema = z.object({
  itemNumber: z.number().int(),
  title: z.string(),
  images: z.array(z.string()),
  wonAt: firestoreDateSchema,
});

export const physicalLocationSchema = z.object({
  zone: z.string(),
  shelf: z.string(),
  bin: z.string(),
});

export const orderFirestoreSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  items: z.array(orderDocumentItemSchema).optional(),
  orderType: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  quantity: z.number().int().positive(),
  unitPrice: rupeesSchema,
  totalPrice: rupeesSchema,
  currency: z.string(),
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "return_requested",
    "returned",
  ]),
  paymentStatus: orderPaymentStatusSchema,
  paymentId: z.string().optional(),
  paymentMethod: z.string().optional(),
  shippingAddress: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  orderDate: firestoreDateSchema,
  shippingDate: firestoreDateSchema.optional(),
  deliveryDate: firestoreDateSchema.optional(),
  cancellationDate: firestoreDateSchema.optional(),
  cancellationReason: z.string().optional(),
  refundAmount: rupeesSchema.optional(),
  refundStatus: orderRefundStatusSchema.optional(),
  refundFeeDeducted: rupeesSchema.optional(),
  refundNetAmount: rupeesSchema.optional(),
  refundNote: z.string().optional(),
  couponCode: z.string().optional(),
  couponDiscount: rupeesSchema.optional(),
  appliedDiscounts: z.array(appliedOrderDiscountSchema).optional(),
  platformFee: rupeesSchema.optional(),
  depositAmount: rupeesSchema.optional(),
  codRemainingAmount: rupeesSchema.optional(),
  codHandlingFee: rupeesSchema.optional(),
  emiEnabled: z.boolean().optional(),
  emiTenureMonths: z.number().int().min(2).max(6).optional(),
  emiTokenAmount: rupeesSchema.optional(),
  emiSurchargeAmount: rupeesSchema.optional(),
  emiInstallments: z.array(emiInstallmentSchema).optional(),
  emiRemainingBalance: rupeesSchema.optional(),
  emiComplete: z.boolean().optional(),
  shippingFee: rupeesSchema.optional(),
  shippingMethod: orderShippingMethodSchema.optional(),
  shippingCarrier: z.string().optional(),
  trackingUrl: z.string().optional(),
  payoutStatus: orderPayoutStatusSchema.optional(),
  payoutId: z.string().optional(),
  offerId: z.string().optional(),
  prizeWon: prizeWonSchema.optional(),
  prizeDrawProductId: z.string().optional(),
  prizeRevealMode: z.enum(["instant", "scheduled"]).optional(),
  isNonRefundable: z.boolean().optional(),
  bundleId: z.string().optional(),
  paymentBatchId: z.string().optional(),
  refunds: z.array(orderRefundEventSchema).optional(),
  contestable: z.boolean().optional(),
  adminBypassBy: z.string().optional(),
  shippingProofUrl: z.string().optional(),
  shippingProofMimeType: z.string().optional(),
  shippingProofUploadedAt: firestoreDateSchema.optional(),
  shippingProofUploadedBy: z.string().optional(),
  physicalLocation: physicalLocationSchema.optional(),
  outOfStockPolicy: outOfStockPolicySchema.optional(),
  droppedItems: z.array(orderDroppedItemSchema).optional(),
  refundPending: z.boolean().optional(),
  ...auditTimestampsShape,
});

export type OrderFromSchema = z.infer<typeof orderFirestoreSchema>;

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
  storeId: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
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
  address: z.object({}).passthrough(),
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
