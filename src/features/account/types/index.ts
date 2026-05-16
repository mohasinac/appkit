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

/**
 * Per-channel on/off toggles at the user level.
 * Channels are only surfaced in the UI when the admin has enabled them in
 * siteSettings.notificationChannels — this is enforced on the server side.
 */
export interface NotificationChannelPrefs {
  /** Disable all email notifications for this user (default: true = enabled). */
  email?: boolean;
  /** Disable all WhatsApp notifications for this user. */
  whatsapp?: boolean;
  /** Disable all SMS notifications for this user. */
  sms?: boolean;
}

/**
 * Per notification-type on/off controls.  `true` = enabled (default when absent).
 */
export interface NotificationTypePrefs {
  orderUpdates?: boolean;
  bids?: boolean;
  promotions?: boolean;
  system?: boolean;
  reviews?: boolean;
  messages?: boolean;
  offers?: boolean;
}

export interface NotificationPreferences {
  /** Per-channel global toggles (user can silence a whole channel). */
  channels?: NotificationChannelPrefs;
  /** Per notification-type toggles (user can silence specific event classes). */
  types?: NotificationTypePrefs;
  /** @deprecated Use types.orderUpdates */
  orderUpdates?: boolean;
  /** @deprecated Use types.promotions */
  promotions?: boolean;
  /** @deprecated Use channels.sms */
  newsletter?: boolean;
  /** @deprecated Use channels.sms */
  sms?: boolean;
  /** Push notifications reserved for future use. */
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
