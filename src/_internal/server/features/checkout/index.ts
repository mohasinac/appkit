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
/*
 * Phase 3 — WHAT each seller's share of that one capture is. Exported for the
 * same reason the gateway choice above is: the consumer owns the capture route,
 * and that is the only request that holds both the cart and the vendor
 * registrations, so it is the only place the instruction can be built and the
 * only place a refusal can land before money moves.
 */
export {
  buildSplitInstructions,
  splitRefusalReason,
  vendorSettlementForGroup,
  orderNeedsManualPayout,
  SPLIT_UNSETTLEABLE_CODE,
  type SplitCandidateGroup,
  type SplitSettlementLine,
  type BuiltSplitInstructions,
  type SplitBlockedStore,
  type VendorSettlement,
} from "../../../shared/checkout/settlement-split";
export {
  resolveCaptureSplit,
  recordSplitSettlementPayouts,
  type CaptureSplitInput,
  type CaptureSplitGroupInput,
  type ResolvedCaptureSplit,
  type SplitSettlementPayoutInput,
} from "./split-settlement";
