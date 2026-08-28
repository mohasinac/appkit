/*
 * WHY: Seeds 10 discount coupons for the Beyblade marketplace — covers percentage, fixed, free_shipping, buy_x_get_y types.
 * WHAT: 5 admin-scoped (REHAN10, BLADER50, FREESHIP499, NEWBLADER, TOURNAMENT2026) + 5 seller-scoped (ARENA25, ARENAVIP, BUYNOW10, SEALED20, LIMITEDSET). Mix of active, upcoming, and exhausted.
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
import type { CouponDocument } from "../features/promotions/schemas";
import { COUPON_FIELDS } from "../constants/field-names";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const couponsSeedData: Partial<CouponDocument>[] = [
  // ── Admin coupons ──────────────────────────────────────────────────────────

  {
    id: "coupon-rehan10",
    code: "REHAN10",
    name: "Rehan's Welcome — 10% Off",
    description: "10% off your first order on LetItRip. Maximum discount ₹200. First-time buyers only.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 10, maxDiscount: 200, minPurchase: 500 },
    usage: { totalLimit: undefined, perUserLimit: 1, currentUsage: 312 },
    validity: { startDate: daysAgo(90), endDate: daysAhead(180), isActive: true },
    restrictions: { firstTimeUserOnly: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
    stats: { totalUses: 312, totalRevenue: 1560000, totalDiscount: 31200 },
  },

  {
    id: "coupon-blader50",
    code: "BLADER50",
    name: "Blader's Power — ₹500 Off",
    description: "₹500 off on orders above ₹2,000. All categories. Limited to 500 total uses.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 500, maxDiscount: 500, minPurchase: 2000 },
    usage: { totalLimit: 500, perUserLimit: 2, currentUsage: 187 },
    validity: { startDate: daysAgo(30), endDate: daysAhead(60), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(3),
    stats: { totalUses: 187, totalRevenue: 935000, totalDiscount: 93500 },
  },

  {
    id: "coupon-freeship499",
    code: "FREESHIP499",
    name: "Free Shipping on ₹499+",
    description: "Free shipping on all orders above ₹499. No category restrictions.",
    type: COUPON_FIELDS.TYPE_VALUES.FREE_SHIPPING,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 0, maxDiscount: 0, minPurchase: 499 },
    usage: { totalLimit: undefined, perUserLimit: 5, currentUsage: 1024 },
    validity: { startDate: daysAgo(60), endDate: daysAhead(120), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    stats: { totalUses: 1024, totalRevenue: 5120000, totalDiscount: 153600 },
  },

  {
    id: "coupon-newblader",
    code: "NEWBLADER",
    name: "New Blader — 20% Off First Order",
    description: "20% off your first order. Maximum discount ₹400. First-time buyers only.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 20, maxDiscount: 400, minPurchase: 1000 },
    usage: { totalLimit: undefined, perUserLimit: 1, currentUsage: 89 },
    validity: { startDate: daysAgo(14), endDate: daysAhead(90), isActive: true },
    restrictions: { firstTimeUserOnly: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
    stats: { totalUses: 89, totalRevenue: 445000, totalDiscount: 35600 },
  },

  {
    id: "coupon-tournament2026",
    code: "TOURNAMENT2026",
    name: "Tournament Season — ₹200 Off",
    description: "₹200 off on any purchase ₹1,000+. Valid during 2026 tournament season.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 200, maxDiscount: 200, minPurchase: 1000 },
    usage: { totalLimit: 1000, perUserLimit: 3, currentUsage: 456 },
    validity: { startDate: daysAgo(45), endDate: daysAhead(45), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
    stats: { totalUses: 456, totalRevenue: 2280000, totalDiscount: 91200 },
  },

  // ── Seller coupons (Beyblade Arena) ────────────────────────────────────────

  {
    id: "coupon-arena25",
    code: "ARENA25",
    name: "Beyblade Arena — 25% Off (Max ₹500)",
    description: "25% off any Beyblade Arena purchase. Maximum discount ₹500.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-beyblade-arena",
    discount: { value: 25, maxDiscount: 500, minPurchase: 1000 },
    usage: { totalLimit: 200, perUserLimit: 2, currentUsage: 67 },
    validity: { startDate: daysAgo(20), endDate: daysAhead(40), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-tyson-blader",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(4),
    stats: { totalUses: 67, totalRevenue: 335000, totalDiscount: 33500 },
  },

  {
    id: "coupon-arenavip",
    code: "ARENAVIP",
    name: "Arena VIP — 15% Off Limited Editions",
    description: "15% off limited-edition beyblades at Beyblade Arena. For our top collectors.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-beyblade-arena",
    discount: { value: 15, maxDiscount: 750, minPurchase: 2000 },
    usage: { totalLimit: 50, perUserLimit: 1, currentUsage: 12 },
    validity: { startDate: daysAgo(10), endDate: daysAhead(60), isActive: true },
    restrictions: {
      applicableCategories: ["category-beyblade-original", "category-beyblade-metal"],
      firstTimeUserOnly: false,
    },
    createdBy: "user-tyson-blader",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
    stats: { totalUses: 12, totalRevenue: 60000, totalDiscount: 9000 },
  },

  {
    id: "coupon-buynow10",
    code: "BUYNOW10",
    name: "Buy 3 Beyblades, Get 10% Off",
    description: "Buy any 3 beyblades from Beyblade Arena and get 10% off the total.",
    type: COUPON_FIELDS.TYPE_VALUES.BUY_X_GET_Y,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-beyblade-arena",
    discount: { value: 10, maxDiscount: 300, minPurchase: 0 },
    bxgy: {
      buyQuantity: 3,
      getQuantity: 0,
      applicableCategories: ["category-beyblade-original", "category-beyblade-metal", "category-beyblade-burst", "category-beyblade-x"],
    },
    usage: { totalLimit: 100, perUserLimit: 3, currentUsage: 34 },
    validity: { startDate: daysAgo(15), endDate: daysAhead(45), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-tyson-blader",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
    stats: { totalUses: 34, totalRevenue: 170000, totalDiscount: 17000 },
  },

  {
    id: "coupon-sealed20",
    code: "SEALED20",
    name: "20% Off Sealed Products",
    description: "20% off sealed launcher sets, stadiums, and starter boxes at Beyblade Arena.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-beyblade-arena",
    discount: { value: 20, maxDiscount: 1000, minPurchase: 1000 },
    usage: { totalLimit: 75, perUserLimit: 2, currentUsage: 28 },
    validity: { startDate: daysAgo(7), endDate: daysAhead(30), isActive: true },
    restrictions: {
      applicableCategories: ["category-beyblade-burst", "category-beyblade-x"],
      firstTimeUserOnly: false,
    },
    createdBy: "user-tyson-blader",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
    stats: { totalUses: 28, totalRevenue: 140000, totalDiscount: 28000 },
  },

  {
    id: "coupon-limitedset",
    code: "LIMITEDSET",
    name: "12% Off Limited Edition Bundle",
    description: "12% off when purchasing any limited-edition beyblade bundle from Beyblade Arena.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-beyblade-arena",
    discount: { value: 12, maxDiscount: 600, minPurchase: 1500 },
    usage: { totalLimit: 100, perUserLimit: 2, currentUsage: 19 },
    validity: { startDate: daysAgo(5), endDate: daysAhead(55), isActive: true },
    restrictions: {
      applicableCategories: ["bundle-original-collectors-set", "bundle-metal-fusion-duo", "bundle-burst-battlers-pack", "bundle-x-series-starter"],
      firstTimeUserOnly: false,
    },
    createdBy: "user-tyson-blader",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    stats: { totalUses: 19, totalRevenue: 95000, totalDiscount: 11400 },
  },

  // ── Seller coupon (LetItRip Official) ──────────────────────────────────────
  // Deliberately on a SECOND store: every other seller coupon above belongs to
  // store-beyblade-arena, so without this one the "one coupon per store, plus
  // one platform-wide coupon" stacking rule could never be demonstrated on a
  // real multi-store cart.

  {
    id: "coupon-official10",
    code: "OFFICIAL10",
    name: "LetItRip Official — 10% Off",
    description: "10% off anything from the LetItRip Official store. Stacks with other stores' coupons and with a platform-wide coupon.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-letitrip-official",
    discount: { value: 10, maxDiscount: 300, minPurchase: 500 },
    usage: { totalLimit: 300, perUserLimit: 2, currentUsage: 41 },
    validity: { startDate: daysAgo(15), endDate: daysAhead(45), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
    stats: { totalUses: 41, totalRevenue: 205000, totalDiscount: 20500 },
  },
// Derived through the wrapper, never per record — an inline literal is how
// five product seed files shipped their last fixture with no tokens.
].map(withCouponSearchTxt);
