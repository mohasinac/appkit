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
export const RANDOM_LOTS_MAX_REVEALS_PER_ORDER = 3;

/** Seller-facing prize-draw duration cap, in days — enforced by the Zod schema and the seller form. */
export const RANDOM_LOTS_DURATION_DAYS_MIN = 1;
export const RANDOM_LOTS_DURATION_DAYS_MAX = 15;

/**
 * How far ahead a pre-order may promise delivery, in days.
 *
 * 🛑 **45 IS A GATEWAY CEILING, NOT A TASTE DECISION. Do not round it up.**
 *
 * Cashfree Easy Split will not hold a settlement beyond **45 days from the
 * transaction**. Split settlement is the only lawful money shape here — buyer
 * → PA escrow → seller, with the proprietorship never touching the funds —
 * because a marketplace cannot be a payment aggregator and cannot commingle
 * buyer money with its own (RBI; see `project_listing_type_payment_compliance`).
 * So a pre-order promising delivery on day 46 cannot be split-settled at all,
 * and the only remaining way to pay the seller would be a payout from the
 * platform's own account — which is the exact trap the whole split-settlement
 * design exists to avoid.
 *
 * Raising this number therefore does not extend a deadline; it creates orders
 * whose money has nowhere legal to go. If the ceiling ever moves, it moves
 * because the GATEWAY moved — confirm it against Cashfree's live docs, not
 * against what would be convenient for a seller.
 *
 * The matching cancellation half already exists: the `preorder-deliver`
 * obligation (`features/obligations/constants/policies.ts`) is anchored on
 * `order.sourceContext.expectedDeliveryDate`, so a pre-order that misses its
 * promised date is cancelled and refunded. This constant is the WRITE-side cap
 * that stops a non-compliant pre-order being created in the first place.
 *
 * Predicates and buyer-facing messages derive from it in
 * `_internal/shared/features/products/preorder-window.ts` — never re-derive the
 * window at a call site.
 */
export const PREORDER_MAX_DELIVERY_DAYS = 45;

/** Maximum qty per bundle purchase (bundles are always single-shot direct buys). */
export const BUNDLE_MAX_QTY_PER_TX = 1;

/**
 * Max quantity on a single cart line.
 *
 * 🛑 It now IS the enforcement. It used to say "enforced at addToCart" while
 * the actual limit was four hand-written `.max(99)` literals that never
 * referenced it — so the constant was documentation nobody read and the rule
 * was a magic number in four places. The cart schemas import it.
 *
 * Its other reader, `ListingCheckoutRule.maxQuantityPerLine`, was DELETED in
 * the same change: that field was set by collector drop, offer and prize-draw and read
 * by nothing at all, and it contradicted the feature it appeared to govern —
 * prize-draw set it to 1 while `splitMultipleOrders` right beside it existed
 * only to chunk a quantity of 7 into [3,3,1].
 */
export const STANDARD_MAX_QTY_PER_LINE = 99;
