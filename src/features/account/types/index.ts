// --- Order types -------------------------------------------------------------

export type OrderStatus =
  | "placed"
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  productId: string;
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface UserOrder {
  id: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  totalPrice: number;
  currency?: string;
  items?: OrderItem[];
  orderDate: string;
  createdAt?: string;
  updatedAt?: string;
}

// --- Notification types -------------------------------------------------------

export type NotificationType =
  | "order"
  | "offer"
  | "promo"
  | "system"
  | "message";

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  href?: string;
}

// --- Offer types --------------------------------------------------------------

export type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "paid"
  | "declined"
  | "expired"
  | "withdrawn";

export interface UserOffer {
  id: string;
  productTitle: string;
  productId: string;
  offeredPrice: number;
  counterPrice?: number;
  status: OfferStatus;
  currency?: string;
  createdAt: string;
  updatedAt?: string;
}

// --- Profile stats ------------------------------------------------------------

export interface UserProfileStats {
  orders: number;
  wishlist: number;
  addresses: number;
}

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

export interface NotificationPreferences {
  orderUpdates?: boolean;
  promotions?: boolean;
  newsletter?: boolean;
  sms?: boolean;
  push?: boolean;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
  addresses?: UserAddress[];
  notificationPreferences?: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  phone?: string;
  bio?: string;
}
