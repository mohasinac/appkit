// --- Order types -------------------------------------------------------------

/**
 * Root Cause #36 — this module used to declare its OWN `OrderStatus` and
 * `PaymentStatus`, and `appkit/src/index.ts` re-exported *those* rather than
 * the real ones. So a bare `import type { OrderStatus } from "@mohasinac/appkit"`
 * silently resolved to a narrower, wrong union:
 *
 *   OrderStatus    had a fake `"placed"` (used nowhere but its own declaration)
 *                  and was MISSING `"return_requested"` — a real status with
 *                  29 references across the codebase.
 *   PaymentStatus  was missing `"processing"` and `"partial_refund"`.
 *
 * Assigning a legitimate `OrderStatusValues.RETURN_REQUESTED` to an
 * `OrderStatus[]` therefore failed to typecheck, which is what pushed callers
 * onto `Set<string>` and untyped workarounds.
 *
 * These are now re-exports of the single source of truth. The account feature
 * describes the same orders the rest of the app does; it never had grounds for
 * its own union.
 */
import type { OrderStatus, PaymentStatus } from "../../orders/types/index";
export type { OrderStatus, PaymentStatus };

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

/*
 * 🛑 This file used to declare its OWN `NotificationType`
 * (`order|offer|promo|system|message`) and a `UserNotification` interface
 * around it. Both are gone.
 *
 * The union was a fourth spelling of a concept that already had three, and it
 * shared a name with the canonical one — the exact Root Cause #36 shape
 * (`OrderStatus`), one union over, where the barrel's choice between two
 * same-named types is invisible at every call site.
 *
 * `UserNotification` had ZERO real consumers: a repo-wide search found only
 * its own declaration and two barrel re-exports. Per the plan's deletion
 * discipline that is dead, not under-used.
 *
 * Re-exported here so anything importing `NotificationType` from the account
 * feature resolves to the one real union, exactly as `OrderStatus` and
 * `PaymentStatus` were repointed in W2.
 */
export type { NotificationType } from "../../admin/schemas/firestore";


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
