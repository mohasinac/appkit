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
};
