export type {
  ListingCheckoutRule,
  CategoryCheckoutRule,
  CartItemProductPair,
  OrderItemInput,
  RefundPolicy,
} from "./types";
export {
  CHECKOUT_RULES,
  CATEGORY_CHECKOUT_RULES,
  getListingRule,
  getCategoryRule,
  pickOrderType,
  getSplitKey,
  runSyncPreflight,
} from "./_registry";
/*
 * The payment gate is a SEPARATE module from `_registry`, on purpose: it is the
 * one rule check that cannot be expressed as a per-listing-type pass over
 * single-member lines, which is all `runSyncPreflight` can see. Keeping them
 * apart is what stops someone folding it back into preflight, where it would
 * silently stop covering bundles and grouped lines.
 */
export {
  assertPaymentMethodAllowed,
  blockedMethodsForCart,
  type BlockedMethod,
} from "./payment-gate";
export {
  CART_MAX_ITEMS,
  CHECKOUT_MAX_ORDERS_PER_TX,
  PRIZE_DRAW_MAX_REVEALS_PER_ORDER,
  PRIZE_DRAW_DURATION_DAYS_MIN,
  PRIZE_DRAW_DURATION_DAYS_MAX,
  BUNDLE_MAX_QTY_PER_TX,
  STANDARD_MAX_QTY_PER_LINE,
} from "./_limits";
// Individual rules — exported for tests and direct access.
export { standardRule } from "./standard.rule";
export { auctionRule } from "./auction.rule";
export { preOrderRule } from "./preorder.rule";
export { prizeDrawRule } from "./prize-draw.rule";
export { offerRule } from "./offer.rule";
export { bundleRule } from "./bundle.rule";
export { classifiedRule } from "./classified.rule";
export { digitalCodeRule } from "./digital-code.rule";
export { liveRule } from "./live.rule";
export { artRule } from "./art.rule";
export { stickersRule } from "./stickers.rule";
export { sparesRule } from "./spares.rule";
