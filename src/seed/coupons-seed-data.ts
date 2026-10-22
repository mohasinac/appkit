/*
 * WHY: Seeds the marketplace's discount coupons.
 * WHAT: FIVE admin-scoped codes — the four season offers the community poll
 *       asked about, plus CASHBACK10, the festival-only Diwali cashback.
 *
 * ## The four season codes came from a community poll (2026-10-22)
 *
 * The poll asked "this Diwali to New Year, which offers should be run?" and
 * was explicit that these are "different from per festival coupons" — so they
 * run ALONGSIDE CASHBACK10 for the whole season, not instead of it. Votes:
 *
 *   BUY3GET1     buy 3 get 1 free, items under ₹2,000   28   ← the mandate
 *   CASHBACK500  10% back, capped ₹500                   2
 *   CASHBACK5    5% back, uncapped                       1
 *   FREESHIP2000 free shipping above ₹2,000              1
 *
 * All four were seeded on the owner's instruction, not just the winner.
 *
 * 🛑 ONE ADMIN COUPON APPLIES PER CART (see § "Coupon Scoping & Stacking" —
 * at most one `scope:"admin"` code plus one seller code per store). These five
 * are all admin-scoped, so a buyer CHOOSES one; they do not combine. That is
 * the intended shape, but it means the caps interact: an uncapped 5% beats a
 * ₹500-capped 10% on any order above ₹10,000, so CASHBACK5 is the better code
 * on a large basket and CASHBACK500 on a small one.
 *
 * 🛑 It was 10 codes (REHAN10, BLADER50, FREESHIP499, NEWBLADER,
 * TOURNAMENT2026, ARENA25, ARENAVIP, BUYNOW10, SEALED20, LIMITEDSET) plus
 * OFFICIAL10 until 2026-10-21, when the owner asked for a single live code.
 * Three of the four types are now covered again (percentage, free_shipping,
 * buy_x_get_y); `fixed` is still unrepresented, so a test of that branch needs
 * a fixture added deliberately rather than assumed present.
 *
 * EXPORTS:
 *   couponsSeedData — Array of Partial<CouponDocument> for seed runner
 *
 * @tag domain:coupons
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { withCouponSearchTxt } from "./_helpers/search-txt-wrappers";
import {
  SEASON_START,
  SEASON_END,
  DIWALI_CASHBACK_END,
} from "./_helpers/festive-window";
import type { CouponDocument } from "../features/promotions/schemas";
import { COUPON_FIELDS } from "../constants/field-names";

const NOW = new Date();

export const couponsSeedData: Partial<CouponDocument>[] = [
  // ── Festival-only: the Diwali cashback ──────────────────────────────────
  /*
   * 🛑 `validity.startDate` and `event-festive-cashback-10`'s `startsAt` are
   * now the SAME IMPORTED CONSTANT rather than two hand-typed offsets that a
   * comment in each file claimed were equal. They were not — see the note in
   * `_helpers/festive-window.ts` for the nine-day gap this closes.
   *
   * This one keeps the SHORT window. It is the per-festival code the poll
   * distinguished itself from.
   */
  {
    id: "coupon-cashback10",
    code: "CASHBACK10",
    name: "Diwali Cashback — 10% Back",
    description:
      "Get 10% of your order value back as cashback, up to ₹1,000, on orders above ₹999 during the Diwali sale. Applies across the whole catalogue.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 10, maxDiscount: 1000, minPurchase: 999 },
    usage: { totalLimit: 2000, perUserLimit: 1, currentUsage: 0 },
    validity: {
      startDate: SEASON_START,
      endDate: DIWALI_CASHBACK_END,
      isActive: true,
    },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },

  // ── Season: buy 3 get 1 free, items under ₹2,000 (28 votes) ─────────────
  /*
   * 🛑 "BUY 3 GET 1" MEANS FOUR QUALIFYING ITEMS IN THE CART, NOT THREE.
   * `calculateBxgyDiscount` forms blocks of `buyQuantity + getQuantity` = 4
   * and makes the CHEAPEST unit in each complete block free; an incomplete
   * block earns nothing. The poll's worked example ("2 of 2k and 1k") is three
   * items and would earn ₹0. The banner copy and the event description both
   * say "add 4" for exactly this reason — the commonest way for this coupon to
   * look broken is a buyer with three items being told the code is valid and
   * seeing no discount.
   *
   * 🛑 `maxItemPrice` is a UNIT price, and it did not exist before 2026-10-22
   * — the poll's "items under 2k" was unexpressible, so it was added to
   * `BXGYConfig` and honoured in the engine's unit pool. 2000 is INCLUSIVE, so
   * a ₹2,000 top qualifies; the ceiling filters units BEFORE blocks are
   * formed, so four ₹5,000 tops earn nothing rather than earning a free
   * ₹5,000 top.
   *
   * 🛑 `minPurchase` is deliberately ABSENT. It tests the ORDER total, and
   * four sub-₹2,000 items already imply a basket; adding one would mean a
   * buyer could satisfy the item rule and still be refused with a message
   * about a minimum they cannot see in the offer.
   */
  {
    id: "coupon-buy3get1",
    code: "BUY3GET1",
    name: "Buy 3, Get 1 Free — Items Under ₹2,000",
    description:
      "Add 4 items priced ₹2,000 or under and the cheapest of the four is free. Runs from Dhanteras through the New Year. One use per account.",
    type: COUPON_FIELDS.TYPE_VALUES.BUY_X_GET_Y,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    // `value: 0` — a BOGO's worth lives in `bxgy`, not in `discount.value`.
    // `calculateDiscount` never reads the value for this type, and a non-zero
    // number here would read as a second, competing discount.
    discount: { value: 0 },
    bxgy: { buyQuantity: 3, getQuantity: 1, maxItemPrice: 2000 },
    usage: { totalLimit: 3000, perUserLimit: 1, currentUsage: 0 },
    validity: { startDate: SEASON_START, endDate: SEASON_END, isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },

  // ── Season: 10% back, capped ₹500 (2 votes) ─────────────────────────────
  /*
   * 🛑 NOT A DUPLICATE OF CASHBACK10, and the codes are deliberately
   * different. Same 10% rate, a ₹500 cap instead of ₹1,000, and a season-long
   * window instead of the festival fortnight. Reusing the CASHBACK10 code for
   * a different cap would silently reprice a live festival offer, and any
   * buyer who had already saved the code would get half what they were
   * promised.
   */
  {
    id: "coupon-cashback500",
    code: "CASHBACK500",
    name: "Season Cashback — 10% Back up to ₹500",
    description:
      "Get 10% of your order value back, up to ₹500, on any order. Runs from Dhanteras through the New Year.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 10, maxDiscount: 500 },
    usage: { totalLimit: 3000, perUserLimit: 1, currentUsage: 0 },
    validity: { startDate: SEASON_START, endDate: SEASON_END, isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },

  // ── Season: 5% back, uncapped (1 vote) ──────────────────────────────────
  /*
   * 🛑 `maxDiscount` IS ABSENT ON PURPOSE — the poll option is literally
   * "5% per order total NO LIMIT". `calculateDiscount` only applies a cap when
   * `maxDiscount` is truthy, so omitting it is how "uncapped" is spelled.
   *
   * 🛑 That makes this the ONLY uncapped code in the file, and the one with
   * real downside on a large basket: 5% of a ₹50,000 order is ₹2,500 against
   * CASHBACK500's ₹500 ceiling. It is seeded as voted; if that exposure is
   * unwanted the fix is a `maxDiscount`, not a lower rate.
   */
  {
    id: "coupon-cashback5",
    code: "CASHBACK5",
    name: "Season Cashback — 5% Back, No Limit",
    description:
      "Get 5% of your order value back with no upper limit, on any order. Runs from Dhanteras through the New Year.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 5 },
    usage: { totalLimit: 3000, perUserLimit: 1, currentUsage: 0 },
    validity: { startDate: SEASON_START, endDate: SEASON_END, isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },

  // ── Season: free shipping above ₹2,000 (1 vote) ─────────────────────────
  /*
   * 🛑 `discount.value: 0` is CORRECT here and is not a missing number.
   * `calculateDiscount` returns 0 for `free_shipping` by design — the waiver
   * is applied downstream as a shipping line, not as a subtotal discount. A
   * non-zero value would be ignored by the engine while reading, to anyone
   * scanning this file, like a discount that fails to apply.
   *
   * `minPurchase: 2000` is the whole offer: "above ₹2,000". It is tested
   * against the ELIGIBLE subtotal, which for an unrestricted admin coupon is
   * the whole cart.
   */
  {
    id: "coupon-freeship2000",
    code: "FREESHIP2000",
    name: "Free Shipping Above ₹2,000",
    description:
      "Free delivery on every order above ₹2,000. Runs from Dhanteras through the New Year.",
    type: COUPON_FIELDS.TYPE_VALUES.FREE_SHIPPING,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 0, minPurchase: 2000 },
    usage: { totalLimit: 3000, perUserLimit: 1, currentUsage: 0 },
    validity: { startDate: SEASON_START, endDate: SEASON_END, isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },
].map(withCouponSearchTxt);
