/**
 * Public surface for the provider resolver + mocks.
 *
 * Real provider implementations remain in `appkit/src/providers/{payment-razorpay,payment-manual,shipping-manual}/`
 * because they are independently consumable per-package. This barrel only
 * exposes the resolver entry points and the in-process mock implementations
 * Track H requires. Shipping has no mock — the manual shipping provider
 * makes no external API calls, so there's nothing to mock.
 */

export {
  resolvePaymentProvider,
  type PaymentResolutionFactories,
  type ProviderResolutionContext,
} from "./resolve";

export {
  MockRazorpayProvider,
  type MockWebhookEvent,
  type MockWebhookPayload,
  type WebhookSink,
} from "./payment/razorpay-mock";
