/**
 * Coupons Seed Data — LetiTrip Collectibles Platform
 * 5 coupons covering all key scenarios: welcome, category-scoped, free shipping,
 * partially-used, and exhausted (limit reached).
 * coupon- prefix, id === code-based slug.
 */

import type { CouponDocument } from "../features/promotions/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const couponsSeedData: Partial<CouponDocument>[] = [
  // ── 1. WELCOME10 — 10% off, first-order only, active ─────────────────────
  {
    id: "coupon-welcome10",
    code: "WELCOME10",
    name: "Welcome Discount — 10% Off Your First Order",
    description:
      "10% off your first order on LetiTrip. Valid on all categories. Maximum discount ₹200. First-time buyers only.",
    type: "percentage",
    scope: "admin",
    discount: {
      value: 10,
      maxDiscount: 20000,
      minPurchase: 50000,
    },
    usage: {
      totalLimit: undefined,
      perUserLimit: 1,
      currentUsage: 847,
    },
    validity: {
      startDate: daysAgo(120),
      endDate: daysAhead(240),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: true,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(120),
    updatedAt: daysAgo(2),
    stats: {
      totalUses: 847,
      totalRevenue: 423500000,
      totalDiscount: 8470000,
    },
  },

  // ── 2. POKEMON25 — ₹250 fixed off Pokémon category, active ───────────────
  {
    id: "coupon-pokemon25",
    code: "POKEMON25",
    name: "Pokémon Collector's Discount — ₹250 Off",
    description:
      "₹250 off on any Pokémon TCG category purchase. Minimum order ₹1,000. Valid on trading cards, sealed products, and vintage Pokémon. Can be combined with seller coupons.",
    type: "fixed",
    scope: "admin",
    discount: {
      value: 25000,
      maxDiscount: 25000,
      minPurchase: 100000,
    },
    usage: {
      totalLimit: undefined,
      perUserLimit: 3,
      currentUsage: 234,
    },
    validity: {
      startDate: daysAgo(60),
      endDate: daysAhead(120),
      isActive: true,
    },
    restrictions: {
      applicableCategories: ["category-pokemon-cards", "category-sealed-products", "category-vintage-pokemon", "category-vintage-tcg"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(5),
    stats: {
      totalUses: 234,
      totalRevenue: 117000000,
      totalDiscount: 5850000,
    },
  },

  // ── 3. FREESHIP999 — free shipping on orders ₹999+, active ───────────────
  {
    id: "coupon-freeship999",
    code: "FREESHIP999",
    name: "Free Shipping on Orders ₹999+",
    description:
      "Free standard shipping on any order above ₹999. No category restriction. Note: free shipping is already automatic above ₹999 — this coupon extends the same benefit and can be applied to orders that were manually discounted below ₹999.",
    type: "free_shipping",
    scope: "admin",
    discount: {
      value: 100,
      minPurchase: 99900,
    },
    usage: {
      totalLimit: undefined,
      perUserLimit: undefined,
      currentUsage: 1240,
    },
    validity: {
      startDate: daysAgo(180),
      endDate: undefined,
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(1),
    stats: {
      totalUses: 1240,
      totalRevenue: 620000000,
      totalDiscount: 6200000,
    },
  },

  // ── 4. BLADER20 — 20% off Beyblades, partially used (30/50) ──────────────
  {
    id: "coupon-blader20",
    code: "BLADER20",
    name: "Blader's Discount — 20% Off All Beyblade Products",
    description:
      "20% off all Beyblade X and Burst products. Maximum discount ₹500 per order. Limited to 50 uses total — 30 used so far. Created for the India launch promotion.",
    type: "percentage",
    scope: "admin",
    discount: {
      value: 20,
      maxDiscount: 50000,
      minPurchase: 0,
    },
    usage: {
      totalLimit: 50,
      perUserLimit: 1,
      currentUsage: 30,
    },
    validity: {
      startDate: daysAgo(45),
      endDate: daysAhead(15),
      isActive: true,
    },
    restrictions: {
      applicableCategories: ["category-beyblade-tops", "category-spinning-tops"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
    stats: {
      totalUses: 30,
      totalRevenue: 15000000,
      totalDiscount: 300000,
    },
  },

  // ── 5. VIP-EXCLUSIVE — 25% off, limit 10 (EXHAUSTED) ─────────────────────
  {
    id: "coupon-vip-exclusive",
    code: "VIP2026",
    name: "VIP Collector's Exclusive — 25% Off (Limit Reached)",
    description:
      "25% off any order — exclusive to LetiTrip VIP program members. Limited to 10 uses total. This coupon is now exhausted. Watch for VIP2026B in the next newsletter.",
    type: "percentage",
    scope: "admin",
    discount: {
      value: 25,
      maxDiscount: 250000,
      minPurchase: 200000,
    },
    usage: {
      totalLimit: 10,
      perUserLimit: 1,
      currentUsage: 10,
    },
    validity: {
      startDate: daysAgo(30),
      endDate: daysAhead(60),
      isActive: false,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(10),
    stats: {
      totalUses: 10,
      totalRevenue: 5000000,
      totalDiscount: 1250000,
    },
  },
];
