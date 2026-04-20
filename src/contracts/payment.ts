// --- Payment Shared Types -----------------------------------------------------

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "attempted" | "paid" | "failed";
  receipt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO-8601
}

export interface PaymentCapture {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "captured" | "failed";
  capturedAt: string; // ISO-8601
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: "pending" | "processed" | "failed";
  reason?: string;
  createdAt: string; // ISO-8601
}

// --- Payment Interface --------------------------------------------------------

/**
 * Payment gateway adapter contract.
 * Implemented by @mohasinac/payment-razorpay, @mohasinac/payment-stripe,
 * @mohasinac/payment-braintree.
 */
export interface IPaymentProvider {
  createOrder(
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentOrder>;
  /** Returns true if the webhook signature is valid. */
  verifyWebhook(payload: string, signature: string): boolean;
  capturePayment(orderId: string): Promise<PaymentCapture>;
  refund(paymentId: string, amount?: number): Promise<Refund>;
  getOrder(orderId: string): Promise<PaymentOrder>;
}
