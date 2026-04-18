/**
 * Orders Firestore Document Types & Constants
 */

import { generateOrderId } from "../../../utils/id-generators";
import type { OrderStatus, PaymentStatus } from "../types";
import type { OrderType } from "../utils/order-splitter";

export type ShippingMethod = "custom" | "shiprocket";
export type OrderPayoutStatus = "eligible" | "requested" | "paid";
export type RefundStatus = "pending" | "processing" | "completed" | "rejected";

/** Runtime-accessible shipping method values — use instead of bare string literals. */
export const ShippingMethodValues = {
  CUSTOM: "custom",
  SHIPROCKET: "shiprocket",
} as const satisfies Record<string, ShippingMethod>;

/** Runtime-accessible order status values — use instead of bare string literals. */
export const OrderStatusValues = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  RETURN_REQUESTED: "return_requested",
  RETURNED: "returned",
} as const satisfies Record<string, OrderStatus>;

/** Runtime-accessible refund status values — use instead of bare string literals. */
export const RefundStatusValues = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const satisfies Record<string, RefundStatus>;

/** Firestore storage shape for an order line item — distinct from the API display model OrderItem */
export interface OrderDocumentItem {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderDocument {
  id: string;
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  sellerId?: string;
  sellerName?: string;
  items?: OrderDocumentItem[];
  orderType?: OrderType;
  imageUrls?: string[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paymentMethod?: string;
  shippingAddress?: string;
  trackingNumber?: string;
  notes?: string;
  orderDate: Date;
  shippingDate?: Date;
  deliveryDate?: Date;
  cancellationDate?: Date;
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  refundFeeDeducted?: number;
  refundNetAmount?: number;
  refundNote?: string;
  platformFee?: number;
  depositAmount?: number;
  codRemainingAmount?: number;
  shippingFee?: number;
  shippingMethod?: ShippingMethod;
  shippingCarrier?: string;
  trackingUrl?: string;
  shiprocketOrderId?: number;
  shiprocketShipmentId?: number;
  shiprocketAWB?: string;
  shiprocketStatus?: string;
  shiprocketUpdatedAt?: Date;
  payoutStatus?: OrderPayoutStatus;
  payoutId?: string;
  offerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ORDER_COLLECTION = "orders" as const;

export const ORDER_INDEXED_FIELDS = [
  "userId",
  "productId",
  "sellerId",
  "status",
  "paymentStatus",
  "payoutStatus",
  "shippingMethod",
  "orderDate",
  "createdAt",
] as const;

export const DEFAULT_ORDER_DATA: Partial<OrderDocument> = {
  status: "pending",
  paymentStatus: "pending",
  quantity: 1,
};

export const ORDER_PUBLIC_FIELDS = [
  "id",
  "productId",
  "productTitle",
  "quantity",
  "unitPrice",
  "totalPrice",
  "currency",
  "status",
  "paymentStatus",
  "shippingAddress",
  "trackingNumber",
  "notes",
  "orderDate",
  "shippingDate",
  "deliveryDate",
  "createdAt",
] as const;

export const ORDER_UPDATABLE_FIELDS = ["notes", "shippingAddress"] as const;

export type OrderCreateInput = Omit<
  OrderDocument,
  "id" | "createdAt" | "updatedAt" | "orderDate"
>;
export type OrderUpdateInput = Partial<
  Pick<OrderDocument, (typeof ORDER_UPDATABLE_FIELDS)[number]>
>;
export type OrderAdminUpdateInput = Partial<
  Omit<OrderDocument, "id" | "createdAt">
>;

export const orderQueryHelpers = {
  byUser: (userId: string) => ["userId", "==", userId] as const,
  bySeller: (sellerId: string) => ["sellerId", "==", sellerId] as const,
  byProduct: (productId: string) => ["productId", "==", productId] as const,
  byStatus: (status: OrderStatus) => ["status", "==", status] as const,
  byPaymentStatus: (status: PaymentStatus) =>
    ["paymentStatus", "==", status] as const,
  confirmed: () => ["status", "==", "confirmed"] as const,
  pending: () => ["status", "==", "pending"] as const,
  shipped: () => ["status", "==", "shipped"] as const,
  delivered: () => ["status", "==", "delivered"] as const,
  paid: () => ["paymentStatus", "==", "paid"] as const,
  recentOrders: (date: Date) => ["orderDate", ">=", date] as const,
} as const;

export function createOrderId(productCount: number, date?: Date): string {
  return generateOrderId({ productCount, date });
}
