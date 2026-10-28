/**
 * Coupon Help Copy
 *
 * Single source of truth for the buyer-facing explanation of how coupon
 * scoping and stacking work. Rendered by <CouponHelpDetails> on the cart,
 * the checkout coupon box, and the public coupons listing — so the three
 * surfaces can never drift (same reasoning as REFUND_COPY).
 *
 * Keep this in sync with `detectCouponConflict()`
 * (features/promotions/actions/coupon-stacking.ts), which is what actually
 * enforces the stacking rules described here, and with the seeded FAQ
 * `faq-coupons-and-discounts`.
 */

/*
 * 🛑 Carries a `{{siteName}}` token rather than a literal. This is module-level
 * data, so a template literal here would resolve at IMPORT time — before the
 * consumer's `configureBrand()` has run — and permanently capture appkit's
 * neutral default. `CouponHelpDetails` resolves it at render. See
 * `core/brand-text.ts`.
 */
export const COUPON_HELP = {
  title: "How coupons work",

  /** The stacking rules — the part buyers most often get wrong. */
  stackingHeading: "You can use more than one coupon",
  stackingRules: [
    "One store coupon per store. If your cart has items from three stores, you can apply each of those stores' coupons at the same time.",
    "Plus one platform-wide {{siteName}} coupon, on top of any store coupons.",
    // D51's third bucket, stated for the buyer. Without this line the rule
    // above reads as "one platform coupon" and a buyer with a points offer
    // applied would reasonably think it was using up that slot.
    "Plus one points offer, which stacks with everything else — it earns you points rather than discounting, so it never takes the place of a discount coupon.",
    "A second coupon for the same store, a second platform-wide coupon, or a second points offer will be declined — remove the first one to swap it.",
  ],

  /** How the discount is actually distributed. */
  applicationHeading: "Where each discount lands",
  applicationRules: [
    "A store coupon only discounts that store's items.",
    "A platform-wide coupon is spread proportionally across every store in your cart.",
    "Orders are placed per store, so each store's order shows its own share of the discount.",
    // Stated because the ORDER of operations is what a buyer would otherwise
    // guess wrong — points are earned on what you actually paid, so a discount
    // reduces the points as well as the price.
    "A points offer earns points on what you pay after any discounts, so the two interact rather than ignoring each other.",
  ],

  /** Reuses the failure reasons already written for the buyer shopping guide. */
  failureHeading: "Why a coupon might not apply",
  failureReasons: [
    "The eligible items in your cart are below the coupon's minimum purchase amount — minimum spend is measured against the items the coupon actually covers, not your whole cart.",
    "The coupon has expired, or hasn't started yet.",
    "The coupon is limited to certain products or categories, and your cart has none of them.",
    "The coupon is first-order-only and you've ordered before.",
    "You've already used the coupon the maximum number of times allowed.",
    "The coupon ran out — some coupons have a total limit across all buyers.",
  ],

  /** Shown at checkout only, where a coupon can be dropped at payment time. */
  revalidationNote:
    "Coupons are re-checked when you place the order. If one has expired or run out while it sat in your cart, it's removed and your total is recalculated before payment.",
} as const;
