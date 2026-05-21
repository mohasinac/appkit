/*
 * WHY: Seeds 10 discount coupons for YGO marketplace — covers percentage, fixed, free_shipping, buy_x_get_y types.
 * WHAT: 5 admin-scoped (YUGI10, EXODIA50, FREESHIP499, NEWDUELIST, TOURNAMENT2026) + 5 seller-scoped (KAIBA25, BLUEEYESVIP, BUYNOW10, SEALED20, GRADEDSET). Mix of active, upcoming, and exhausted.
 *
 * EXPORTS:
 *   couponsSeedData — Array of Partial<CouponDocument> for seed runner
 *
 * @tag domain:coupons
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { CouponDocument } from "../features/promotions/schemas";
import { COUPON_FIELDS } from "../constants/field-names";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const couponsSeedData: Partial<CouponDocument>[] = [
  // ── Admin coupons ──────────────────────────────────────────────────────────

  {
    id: "coupon-yugi10",
    code: "YUGI10",
    name: "Yugi's Welcome — 10% Off",
    description: "10% off your first order on LetItRip. Maximum discount ₹200. First-time buyers only.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 10, maxDiscount: 20000, minPurchase: 50000 },
    usage: { totalLimit: undefined, perUserLimit: 1, currentUsage: 312 },
    validity: { startDate: daysAgo(90), endDate: daysAhead(180), isActive: true },
    restrictions: { firstTimeUserOnly: true, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
    stats: { totalUses: 312, totalRevenue: 156000000, totalDiscount: 3120000 },
  },

  {
    id: "coupon-exodia50",
    code: "EXODIA50",
    name: "Exodia's Power — ₹500 Off",
    description: "₹500 off on orders above ₹2,000. All categories. Limited to 500 total uses.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 50000, maxDiscount: 50000, minPurchase: 200000 },
    usage: { totalLimit: 500, perUserLimit: 2, currentUsage: 187 },
    validity: { startDate: daysAgo(30), endDate: daysAhead(60), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(3),
    stats: { totalUses: 187, totalRevenue: 93500000, totalDiscount: 9350000 },
  },

  {
    id: "coupon-freeship499",
    code: "FREESHIP499",
    name: "Free Shipping on ₹499+",
    description: "Free shipping on all orders above ₹499. No category restrictions.",
    type: COUPON_FIELDS.TYPE_VALUES.FREE_SHIPPING,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 0, maxDiscount: 0, minPurchase: 49900 },
    usage: { totalLimit: undefined, perUserLimit: 5, currentUsage: 1024 },
    validity: { startDate: daysAgo(60), endDate: daysAhead(120), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    stats: { totalUses: 1024, totalRevenue: 512000000, totalDiscount: 15360000 },
  },

  {
    id: "coupon-newduelist",
    code: "NEWDUELIST",
    name: "New Duelist — 20% Off First Order",
    description: "20% off your first order. Maximum discount ₹400. First-time buyers only.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 20, maxDiscount: 40000, minPurchase: 100000 },
    usage: { totalLimit: undefined, perUserLimit: 1, currentUsage: 89 },
    validity: { startDate: daysAgo(14), endDate: daysAhead(90), isActive: true },
    restrictions: { firstTimeUserOnly: true, combineWithSellerCoupons: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
    stats: { totalUses: 89, totalRevenue: 44500000, totalDiscount: 3560000 },
  },

  {
    id: "coupon-tournament2026",
    code: "TOURNAMENT2026",
    name: "Tournament Season — ₹200 Off",
    description: "₹200 off on any purchase ₹1,000+. Valid during 2026 tournament season.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 20000, maxDiscount: 20000, minPurchase: 100000 },
    usage: { totalLimit: 1000, perUserLimit: 3, currentUsage: 456 },
    validity: { startDate: daysAgo(45), endDate: daysAhead(45), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
    stats: { totalUses: 456, totalRevenue: 228000000, totalDiscount: 9120000 },
  },

  // ── Seller coupons (Kaiba Corp) ────────────────────────────────────────────

  {
    id: "coupon-kaiba25",
    code: "KAIBA25",
    name: "Kaiba Corp — 25% Off (Max ₹500)",
    description: "25% off any Kaiba Corp Card Vault purchase. Maximum discount ₹500.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-kaiba-corp-cards",
    discount: { value: 25, maxDiscount: 50000, minPurchase: 100000 },
    usage: { totalLimit: 200, perUserLimit: 2, currentUsage: 67 },
    validity: { startDate: daysAgo(20), endDate: daysAhead(40), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: false },
    createdBy: "user-seto-kaiba",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(4),
    stats: { totalUses: 67, totalRevenue: 33500000, totalDiscount: 3350000 },
  },

  {
    id: "coupon-blueeyesvip",
    code: "BLUEEYESVIP",
    name: "Blue-Eyes VIP — 15% Off Graded Cards",
    description: "15% off graded cards at Kaiba Corp. For our top collectors.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-kaiba-corp-cards",
    discount: { value: 15, maxDiscount: 75000, minPurchase: 200000 },
    usage: { totalLimit: 50, perUserLimit: 1, currentUsage: 12 },
    validity: { startDate: daysAgo(10), endDate: daysAhead(60), isActive: true },
    restrictions: {
      applicableCategories: ["category-psa-graded", "category-bgs-graded", "category-cgc-graded"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-seto-kaiba",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
    stats: { totalUses: 12, totalRevenue: 6000000, totalDiscount: 900000 },
  },

  {
    id: "coupon-buynow10",
    code: "BUYNOW10",
    name: "Buy 3 Singles, Get 10% Off",
    description: "Buy any 3 single cards from Kaiba Corp and get 10% off the total.",
    type: COUPON_FIELDS.TYPE_VALUES.BUY_X_GET_Y,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-kaiba-corp-cards",
    discount: { value: 10, maxDiscount: 30000, minPurchase: 0 },
    bxgy: {
      buyQuantity: 3,
      getQuantity: 0,
      applicableCategories: ["category-monster-cards", "category-spell-cards", "category-trap-cards", "category-extra-deck-cards"],
    },
    usage: { totalLimit: 100, perUserLimit: 3, currentUsage: 34 },
    validity: { startDate: daysAgo(15), endDate: daysAhead(45), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: false },
    createdBy: "user-seto-kaiba",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
    stats: { totalUses: 34, totalRevenue: 17000000, totalDiscount: 1700000 },
  },

  {
    id: "coupon-sealed20",
    code: "SEALED20",
    name: "20% Off Sealed Products",
    description: "20% off sealed booster packs, boxes, and tins at Kaiba Corp.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-kaiba-corp-cards",
    discount: { value: 20, maxDiscount: 100000, minPurchase: 100000 },
    usage: { totalLimit: 75, perUserLimit: 2, currentUsage: 28 },
    validity: { startDate: daysAgo(7), endDate: daysAhead(30), isActive: true },
    restrictions: {
      applicableCategories: ["category-booster-packs", "category-booster-boxes", "category-collector-tins", "category-starter-structure"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-seto-kaiba",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
    stats: { totalUses: 28, totalRevenue: 14000000, totalDiscount: 2800000 },
  },

  {
    id: "coupon-gradedset",
    code: "GRADEDSET",
    name: "12% Off Graded Cards Bundle",
    description: "12% off when purchasing any graded card from Kaiba Corp.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-kaiba-corp-cards",
    discount: { value: 12, maxDiscount: 60000, minPurchase: 150000 },
    usage: { totalLimit: 100, perUserLimit: 2, currentUsage: 19 },
    validity: { startDate: daysAgo(5), endDate: daysAhead(55), isActive: true },
    restrictions: {
      applicableCategories: ["category-psa-graded", "category-bgs-graded", "category-cgc-graded", "category-raw-near-mint"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-seto-kaiba",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    stats: { totalUses: 19, totalRevenue: 9500000, totalDiscount: 1140000 },
  },
];
