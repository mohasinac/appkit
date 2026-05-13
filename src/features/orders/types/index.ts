import {
  type PaymentGateway,
  PaymentGatewayValues,
} from "../../payments/schemas";
export { type PaymentGateway, PaymentGatewayValues };

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded"
  | "partial_refund";

export interface UserAddress {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  phone?: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "return_requested"
  | "returned";

export interface OrderItem {
  productId: string;
  title: string;
  image?: string;
  price: number;
  quantity: number;
  currency?: string;
  storeId?: string;
  attributes?: Record<string, string>;
  /** Listing kind at the time of order — needed for prize-draw UI hints (SB8-F). */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw";
  /**
   * Per-item prize-draw reveal status (SB8-F). Populated by the checkout
   * actions when listingType === "prize-draw". Used to render the
   * "X reveals pending" badge on user orders.
   */
  prizeRevealStatus?: "pending" | "open" | "closed" | "revealed";
  /** ISO timestamp — when the user must claim their reveal before forfeit. */
  prizeRevealDeadline?: string;
  /** Set after the reveal endpoint picks a winner — the prize item index. */
  revealedItemNumber?: number;
}

export interface OrderTimeline {
  status: OrderStatus;
  message?: string;
  timestamp: string;
  actor?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  address: UserAddress;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentGateway?: PaymentGateway;
  subtotal: number;
  shippingCost?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency: string;
  couponCode?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  notes?: string;
  timeline?: OrderTimeline[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface OrderListParams {
  userId?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sort?: string;
  page?: number;
  perPage?: number;
}
