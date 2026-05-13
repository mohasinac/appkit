/** Checkout window / capacity constants — single source of truth. */

/** Maximum distinct line items in one cart (hard cap, already enforced at addToCart). */
export const CART_MAX_ITEMS = 50;

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

/** Maximum qty per bundle purchase (bundles are always single-shot direct buys). */
export const BUNDLE_MAX_QTY_PER_TX = 1;

/** Standard / pre-order max qty per cart line (enforced at addToCart). */
export const STANDARD_MAX_QTY_PER_LINE = 99;
