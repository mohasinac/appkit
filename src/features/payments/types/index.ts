export type PaymentGateway =
  | "razorpay"
  | "stripe"
  | "paypal"
  | "cod"
  | "upi"
  | "whatsapp";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded"
  | "partial_refund";

export interface PaymentGatewayConfig {
  id: string;
  gateway: PaymentGateway;
  isEnabled: boolean;
  displayName?: string;
  credentials?: Record<string, string>;
  testMode?: boolean;
  minAmount?: number;
  maxAmount?: number;
  supportedCurrencies?: string[];
  sortOrder?: number;
}

export interface PaymentSettings {
  id: string;
  gateways: PaymentGatewayConfig[];
  defaultCurrency?: string;
  codEnabled?: boolean;
  codMinAmount?: number;
  codMaxAmount?: number;
  updatedAt?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  gateway: PaymentGateway;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
