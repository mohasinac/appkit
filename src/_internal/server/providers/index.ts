/**
 * Public surface for the provider resolver + mocks.
 *
 * Real provider implementations remain in `appkit/src/providers/{payment-razorpay,shipping-shiprocket}/`
 * because they are independently consumable per-package. This barrel only
 * exposes the resolver entry points and the in-process mock implementations
 * Track H requires.
 */

export {
  resolvePaymentProvider,
  resolveShippingProvider,
  type PaymentResolutionFactories,
  type ProviderResolutionContext,
  type ShippingResolutionFactories,
} from "./resolve";

export {
  MockRazorpayProvider,
  type MockWebhookEvent,
  type MockWebhookPayload,
  type WebhookSink,
} from "./payment/razorpay-mock";

export {
  MockShiprocketProvider,
  type ShipmentEvent,
  type ShipmentEventSink,
} from "./shipping/shiprocket-mock";
