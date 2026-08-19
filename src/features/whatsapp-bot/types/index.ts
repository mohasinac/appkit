export interface CheckoutMessageInput {
  waNumber: string;
  cart: Array<{ name: string; qty: number; salePrice: number }>;
  total: number;
  address: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    pincode: string;
  };
  isPreorder?: boolean;
}

export interface StatusNotificationInput {
  userPhone: string;
  template: string;
  vars: Record<string, string>;
}

export interface WebhookVerifyInput {
  payload: string;
  signature: string;
  secret: string;
}

export interface IncomingWebhookPayload {
  /** Digits-only phone number, e.g. "919876543210" */
  from: string;
  body: string;
}

export interface SendWhatsAppInput {
  /** Digits-only phone number, e.g. "919876543210" */
  toPhone: string;
  message: string;
  accountSid: string;
  authToken: string;
  /** Twilio from number, e.g. "whatsapp:+14155238886" */
  fromNumber: string;
}

// ── Meta Cloud API types ───────────────────────────────────────────────────────

/** Input for sending a message via Meta WhatsApp Business Cloud API. */
export interface WaBusinessSendInput {
  /** Digits-only phone number with country code, e.g. "919876543210" */
  toPhone: string;
  message: string;
  /** Meta Phone Number ID (from Meta for Developers > App > WhatsApp > API Setup) */
  phoneNumberId: string;
  /** Meta system user access token */
  accessToken: string;
}

/**
 * Input for sending a pre-approved Meta message TEMPLATE. Required for any
 * business-initiated WhatsApp send outside the 24h customer-service window —
 * Meta rejects free-form `type: "text"` sends in that case.
 */
export interface WaBusinessTemplateSendInput {
  /** Digits-only phone number with country code, e.g. "919876543210" */
  toPhone: string;
  /** Meta Phone Number ID (from Meta for Developers > App > WhatsApp > API Setup) */
  phoneNumberId: string;
  /** Meta system user access token */
  accessToken: string;
  /** Exact approved template name from Meta WhatsApp Manager (not the display label). */
  templateName: string;
  /** BCP-47 language code the template was approved in, e.g. "en" or "en_US". */
  languageCode: string;
  /** Positional {{1}}, {{2}}… body parameters, in order. */
  bodyParams?: string[];
}

/** A product mapped to the Meta Commerce API catalog item format. */
export interface CatalogSyncProduct {
  /** Firestore product ID — used as Meta `retailer_id` */
  id: string;
  title: string;
  description: string;
  /** Price in decimal rupees */
  price: number;
  currency: string;
  /** URL of the first product image */
  imageUrl: string;
  availability: "in stock" | "out of stock";
  condition: "new" | "used" | "refurbished";
  /** Canonical product page URL, e.g. /products/{slug} */
  link?: string;
}

export interface CatalogSyncInput {
  catalogId: string;
  /** Meta access token with catalog management permission */
  accessToken: string;
  products: CatalogSyncProduct[];
}

export interface CatalogSyncResult {
  /** Meta batch request handles */
  handles: string[];
  successCount: number;
  failureCount: number;
  errors: string[];
}

/** Input for building a purchase announcement message. */
export interface PurchaseAnnouncementInput {
  buyerName: string;
  firstItemName: string;
  /** 0 if only one item in the order */
  additionalItemCount: number;
  /** Total order amount in decimal rupees */
  totalAmount: number;
  orderId: string;
}

/** Tier PP — input for building the payment-proof fast-review WhatsApp message (admin push + buyer/seller share link). */
export interface PaymentProofReviewMessageInput {
  orderId: string;
  buyerName: string;
  productTitle: string;
  totalAmount: number;
  reviewUrl: string;
}

/** Known order status values — extend as needed per project. */
export type OrderStatusKey =
  | "pending_payment"
  | "payment_confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refund_initiated"
  | string;

export interface StatusMessageInput {
  orderId: string;
  status: OrderStatusKey;
  trackingNumber?: string;
  courierName?: string;
}
