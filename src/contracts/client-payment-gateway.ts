/**
 * Client-side payment gateway contract.
 *
 * Abstracts the browser-side interaction with a payment gateway SDK
 * (script loading, modal/redirect, payment response) so checkout hooks
 * never import a vendor-specific SDK directly.
 *
 * Implementations: Razorpay, Stripe, PayPal, etc.
 */

import type { PaymentGateway } from "../features/payments/schemas";

// --- Types -----------------------------------------------------------------

/** Vendor-neutral payment response returned after the user completes payment. */
export interface GatewayPaymentResponse {
  /** Gateway-assigned order ID (e.g. Razorpay `order_xxx`, Stripe `pi_xxx`). */
  gatewayOrderId: string;
  /** Gateway-assigned payment ID. */
  gatewayPaymentId: string;
  /** Cryptographic signature for server-side verification (if gateway provides one). */
  gatewaySignature?: string;
}

/** Options passed to the gateway when opening the payment modal/redirect. */
export interface OpenGatewayOptions {
  /** Gateway-assigned order/session ID. */
  gatewayOrderId: string;
  /** Public key / publishable key for the gateway SDK. */
  publicKey: string;
  /** Amount in the gateway's smallest currency unit (e.g. paise, cents). */
  amount: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** Display name shown in the payment modal. */
  merchantName?: string;
  /** Order description. */
  description?: string;
  /** Logo URL for the payment modal. */
  logoUrl?: string;
  /** Prefill customer details. */
  prefill?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  /** Theme/branding overrides. */
  theme?: {
    color?: string;
  };
}

// --- Contract --------------------------------------------------------------

export interface IClientPaymentGateway {
  /** Which gateway this adapter handles. */
  readonly gateway: PaymentGateway;

  /**
   * Load the gateway's client-side SDK script.
   * Implementations should be idempotent (no-op if already loaded).
   * @returns `true` when the SDK is ready to use.
   */
  loadScript(): Promise<boolean>;

  /**
   * Open the payment modal or redirect to the gateway's hosted page.
   * Resolves with the payment response on success.
   * Rejects if the user cancels or a gateway error occurs.
   */
  openPayment(options: OpenGatewayOptions): Promise<GatewayPaymentResponse>;
}

// --- Runtime Registry ------------------------------------------------------

const _gateways = new Map<PaymentGateway, IClientPaymentGateway>();

export function registerClientPaymentGateway(
  adapter: IClientPaymentGateway,
): void {
  _gateways.set(adapter.gateway, adapter);
}

export function getClientPaymentGateway(
  gateway: PaymentGateway,
): IClientPaymentGateway {
  const adapter = _gateways.get(gateway);
  if (!adapter) {
    throw new Error(
      `Client payment gateway "${gateway}" not registered. ` +
        `Call registerClientPaymentGateway() with a ${gateway} adapter first.`,
    );
  }
  return adapter;
}

export function getRegisteredPaymentGateways(): PaymentGateway[] {
  return Array.from(_gateways.keys());
}
