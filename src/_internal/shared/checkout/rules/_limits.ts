/** Checkout window / capacity constants — single source of truth. */

/**
 * Maximum distinct line items in one cart (hard cap, enforced at every
 * add-to-cart entry point).
 *
 * Re-exported, not re-declared. This value existed as three independent `= 50`
 * literals — here, in `constants/limits.ts`, and in
 * `_internal/shared/features/cart/config.ts` — with nothing tying them
 * together, so raising the cap in one place would have left two silently
 * disagreeing. `constants/limits.ts` is a dependency-free leaf module, so this
 * costs no import chain.
 */
export { CART_MAX_ITEMS } from "../../../../constants/limits";

/**
 * Maximum number of order documents that can be created in one checkout
 * transaction.  If the cart produces more groups than this the checkout is
 * rejected.
 */
export const CHECKOUT_MAX_ORDERS_PER_TX = 20;

/**
 * Maximum prize-draw reveal entries per order document.  Buying 7 entries
 * produces three orders: [3, 3, 1].  Each order has its own independent
 * reveal flow.
 */
export const PRIZE_DRAW_MAX_REVEALS_PER_ORDER = 3;

/** Seller-facing prize-draw duration cap, in days — enforced by the Zod schema and the seller form. */
export const PRIZE_DRAW_DURATION_DAYS_MIN = 1;
export const PRIZE_DRAW_DURATION_DAYS_MAX = 15;

/** Maximum qty per bundle purchase (bundles are always single-shot direct buys). */
export const BUNDLE_MAX_QTY_PER_TX = 1;

/** Standard / pre-order max qty per cart line (enforced at addToCart). */
export const STANDARD_MAX_QTY_PER_LINE = 99;
