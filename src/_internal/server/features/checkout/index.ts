export {
  createCheckoutOrderAction,
  attachPaymentAction,
  verifyAndPlaceGatewayOrderAction,
  previewCheckoutPricing,
  resolveShippingCost,
  type CreateCheckoutOrderInput,
  type VerifyAndPlaceGatewayOrderInput,
  type CheckoutPricingPreviewInput,
  type CheckoutPricingPreview,
} from "./actions";
export {
  formatShippingAddress,
  type CheckoutOrderResult,
} from "./data";
export {
  CHECKOUT_DEFAULT_COMMISSIONS,
  CHECKOUT_PAYMENT_METHODS,
  type CheckoutPaymentMethod,
} from "../../../shared/features/checkout/config";
export { assertPaymentMethodAllowed } from "../../../shared/checkout/rules";
/*
 * Phase 1c — the PER-CART gateway choice. Exported because the consumer owns
 * the capture route (`/api/payment/create-order`), which is the one place the
 * refusal has to land: once a gateway has captured, the money has already
 * settled wherever it settles and a refusal only denies the buyer their order.
 */
export {
  assertCollectingGateway,
  resolveCollectingGatewayForCart,
  paymentGatewayCandidates,
  type CollectingGatewayResult,
} from "./gateway-selection";
export {
  cartVendorComposition,
  cartRequiresSplitSettlement,
  resolveGatewayRequirement,
  resolveCollectingGateway,
  SETTLEMENT_CONSTRAINT,
  GATEWAY_UNAVAILABLE_CODE,
  type SettlementConstraint,
  type CartVendorComposition,
  type GatewayRequirement,
  type SettlementGatewayCandidate,
  type GatewayResolution,
} from "../../../shared/checkout/settlement";
