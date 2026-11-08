/**
 * Bundle CategoryCheckoutRule — `categoryType:"bundle"`.
 *
 * A bundle is the `derived`-stock composite: one price of its own, set below the
 * sum of its members, assembled from their loose stock when ordered. The
 * `independent` case — a separately boxed item with its own count — is a
 * LISTING with `components[]`, not a bundle; see
 * `_internal/shared/features/products/composite.ts`.
 *
 * ## 🛑 `cartEligible: false` does NOT mean bundles never reach the cart
 *
 * The previous docstring claimed "bundles never enter the cart" and that
 * "addBundleToCart has been removed". Both were false when written and are
 * false now: `addBundleToCartAction` is live in
 * `_internal/server/features/bundles/actions.ts`, exported from `server.ts`, and
 * called twice from the host (`src/actions/bundle.actions.ts`). It writes a real
 * cart line with `lineKind: "bundle"`.
 *
 * What this flag actually does is keep a bundle out of the GENERIC
 * `addItemToCart` capability gate, which a bundle cannot satisfy — its
 * `listingType: "standard"` is a placeholder, not a fact. The bundle path
 * deliberately bypasses that gate and re-asserts the lane check itself.
 *
 * Corrected rather than deleted because a comment that misdescribes a live
 * money path is worse than no comment: the next reader reasonably concludes the
 * cart cannot hold a bundle and writes code on that assumption.
 */
import type { CategoryCheckoutRule } from "./types";

export const bundleRule: CategoryCheckoutRule = {
  purchaseable: true,
  // Keeps a bundle out of the GENERIC addItemToCart capability gate, which it
  // cannot satisfy. `addBundleToCartAction` is the bundle's own entry point and
  // is very much alive — see the header.
  cartEligible: false,
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
