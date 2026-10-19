/**
 * Bundle CategoryCheckoutRule — bundles are always direct-checkout-only.
 *
 * Bundles (categoryType:"bundle") never enter the cart. The buyer clicks
 * "Buy bundle" on the bundle PDP which calls directBundleCheckoutAction,
 * bypassing the cart pipeline entirely.  This rule conveys that intent to the
 * cart-add gate (cartEligible: false) and informs the checkout CART-UI which
 * replaces "Add to cart" with "Buy now".
 */
import type { CategoryCheckoutRule } from "./types";

export const bundleRule: CategoryCheckoutRule = {
  purchaseable: true,
  cartEligible: false, // direct-checkout-only; addBundleToCart has been removed
  orderType: "standard", // bundle orders resolve to standard orderType
  requiresShippingAddress: true,
  /*
   * 🛑 cod + cash, NOT emi. A bundle is priced BELOW the sum of its members —
   * that discount is the whole product — so a no-show on delivery costs the
   * seller several items at once, and the bundle has meanwhile been held out of
   * every member's own availability. EMI is confirmed-at-order financing rather
   * than a deferred payment, so it carries none of that and stays available.
   *
   * 🛑 Honoured by `assertPaymentMethodAllowed`, NOT by `runSyncPreflight` —
   * which skips multi-member lines, and a bundle line is always one. A value
   * here relying on preflight would be a silent no-op.
   */
  blockedPaymentMethods: ["cod", "cash"],
  blockedPaymentMessage:
    "Bundles cannot be paid for on delivery or in cash — a bundle is priced below the sum of its parts and is reserved when you order.",
};
