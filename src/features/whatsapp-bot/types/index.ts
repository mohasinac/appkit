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
