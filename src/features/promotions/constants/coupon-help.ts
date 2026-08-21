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

export const COUPON_HELP = {
  title: "How coupons work",

  /** The stacking rules — the part buyers most often get wrong. */
  stackingHeading: "You can use more than one coupon",
  stackingRules: [
    "One store coupon per store. If your cart has items from three stores, you can apply each of those stores' coupons at the same time.",
    "Plus one platform-wide LetItRip coupon, on top of any store coupons.",
    "A second coupon for the same store, or a second platform-wide coupon, will be declined — remove the first one to swap it.",
  ],

  /** How the discount is actually distributed. */
  applicationHeading: "Where each discount lands",
  applicationRules: [
    "A store coupon only discounts that store's items.",
    "A platform-wide coupon is spread proportionally across every store in your cart.",
    "Orders are placed per store, so each store's order shows its own share of the discount.",
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
