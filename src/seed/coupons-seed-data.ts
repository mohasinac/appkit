/**
 * Coupons Seed Data — LetItRip Collectibles Platform
 * 5 coupons covering all key scenarios: welcome, category-scoped, free shipping,
 * partially-used, and exhausted (limit reached).
 * coupon- prefix, id === code-based slug.
 */

import type { CouponDocument } from "../features/promotions/schemas";
import { COUPON_FIELDS } from "../constants/field-names";

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
      "10% off your first order on LetItRip. Valid on all categories. Maximum discount ₹200. First-time buyers only.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
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
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
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
    type: COUPON_FIELDS.TYPE_VALUES.FREE_SHIPPING,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
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
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
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
      "25% off any order — exclusive to LetItRip VIP program members. Limited to 10 uses total. This coupon is now exhausted. Watch for VIP2026B in the next newsletter.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
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

  // ── 6. PALACE15 — 15% off Pokémon Palace (store-scoped) ──────────────────
  {
    id: "coupon-palace15",
    code: "PALACE15",
    name: "Pokémon Palace — 15% Loyalty Discount",
    description:
      "15% off your next order at Pokémon Palace. Exclusively for repeat customers. Min order ₹1,500. Max discount ₹750.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-pokemon-palace",
    discount: {
      value: 15,
      maxDiscount: 75000,
      minPurchase: 150000,
    },
    usage: {
      totalLimit: 100,
      perUserLimit: 2,
      currentUsage: 23,
    },
    validity: {
      startDate: daysAgo(20),
      endDate: daysAhead(40),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-aryan-kapoor",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
    stats: {
      totalUses: 23,
      totalRevenue: 11500000,
      totalDiscount: 1725000,
    },
  },

  // ── 7. DIECAST10 — ₹100 off Diecast Depot (store-scoped) ─────────────────
  {
    id: "coupon-diecast10",
    code: "DIECAST10",
    name: "Diecast Depot — ₹100 Off Your Next Order",
    description:
      "₹100 flat off any order at Diecast Depot. Works on all Hot Wheels and Tomica cars. Min order ₹500.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-diecast-depot",
    discount: {
      value: 10000,
      maxDiscount: 10000,
      minPurchase: 50000,
    },
    usage: {
      totalLimit: 200,
      perUserLimit: 3,
      currentUsage: 67,
    },
    validity: {
      startDate: daysAgo(15),
      endDate: daysAhead(60),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-vikram-mehta",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
    stats: {
      totalUses: 67,
      totalRevenue: 33500000,
      totalDiscount: 670000,
    },
  },

  // ── 8. BEYARENA20 — 20% off Beyblade Arena (store-scoped) ────────────────
  {
    id: "coupon-beyarena20",
    code: "BEYARENA20",
    name: "Beyblade Arena Launch Special — 20% Off",
    description:
      "20% off all Beyblade X products at Beyblade Arena. Limited launch promotion. Max discount ₹500. One use per customer.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-beyblade-arena",
    discount: {
      value: 20,
      maxDiscount: 50000,
      minPurchase: 0,
    },
    usage: {
      totalLimit: 50,
      perUserLimit: 1,
      currentUsage: 42,
    },
    validity: {
      startDate: daysAgo(10),
      endDate: daysAhead(20),
      isActive: true,
    },
    restrictions: {
      applicableCategories: ["category-beyblade-tops", "category-spinning-tops"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-rohit-joshi",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    stats: {
      totalUses: 42,
      totalRevenue: 21000000,
      totalDiscount: 420000,
    },
  },

  // ── 9. CARDGAME5 — Free shipping from CardGame Hub (store-scoped) ─────────
  {
    id: "coupon-cardgame-freeship",
    code: "CARDGAME5",
    name: "CardGame Hub — Free Shipping",
    description:
      "Free shipping on any order from CardGame Hub. No minimum order. Available to all buyers.",
    type: COUPON_FIELDS.TYPE_VALUES.FREE_SHIPPING,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-cardgame-hub",
    discount: {
      value: 100,
      minPurchase: 0,
    },
    usage: {
      totalLimit: undefined,
      perUserLimit: 5,
      currentUsage: 89,
    },
    validity: {
      startDate: daysAgo(25),
      endDate: daysAhead(90),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-nisha-reddy",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(3),
    stats: {
      totalUses: 89,
      totalRevenue: 44500000,
      totalDiscount: 445000,
    },
  },

  // ── 10. TOKYOTOYS10 — 10% off Tokyo Toys India (store-scoped) ────────────
  {
    id: "coupon-tokyotoys10",
    code: "TOKYOTOYS10",
    name: "Tokyo Toys India — 10% New Customer Discount",
    description:
      "10% off your first order at Tokyo Toys India. Valid on all anime figures, Gundam kits, and Funko Pops. Min order ₹2,000. Max discount ₹500.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-tokyo-toys-india",
    discount: {
      value: 10,
      maxDiscount: 50000,
      minPurchase: 200000,
    },
    usage: {
      totalLimit: 150,
      perUserLimit: 1,
      currentUsage: 38,
    },
    validity: {
      startDate: daysAgo(30),
      endDate: daysAhead(60),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: true,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-priya-singh",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
    stats: {
      totalUses: 38,
      totalRevenue: 19000000,
      totalDiscount: 950000,
    },
  },

  // ── P29 expansion (S17 2026-05-12) — 10 more coupons ─────────────────────

  // ── 11. NEWUSER5 — flat ₹50 first-order coupon, active ───────────────────
  {
    id: "coupon-newuser5",
    code: "NEWUSER5",
    name: "₹50 Off First Order",
    description: "Flat ₹50 off your first order on LetItRip. No minimum purchase.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 5000, minPurchase: 0 },
    usage: { totalLimit: undefined, perUserLimit: 1, currentUsage: 312 },
    validity: { startDate: daysAgo(90), endDate: daysAhead(180), isActive: true },
    restrictions: { firstTimeUserOnly: true, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3),
    stats: { totalUses: 312, totalRevenue: 156000000, totalDiscount: 1560000 },
  },

  // ── 12. FLASH24 — 30% flash sale, expired ────────────────────────────────
  {
    id: "coupon-flash24",
    code: "FLASH24",
    name: "24-Hour Flash Sale — 30% Off",
    description: "30% off everything for 24 hours only. Maximum discount ₹500.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 30, maxDiscount: 50000, minPurchase: 100000 },
    usage: { totalLimit: 200, perUserLimit: 1, currentUsage: 187 },
    validity: { startDate: daysAgo(40), endDate: daysAgo(39), isActive: false },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(41),
    updatedAt: daysAgo(39),
    stats: { totalUses: 187, totalRevenue: 374000000, totalDiscount: 11220000 },
  },

  // ── 13. REFERRAL200 — referral reward, active ────────────────────────────
  {
    id: "coupon-referral200",
    code: "REFERRAL200",
    name: "Referral Reward — ₹200 Off",
    description: "Refer a friend, both get ₹200 off the next order. Min ₹1,000.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 20000, minPurchase: 100000 },
    usage: { totalLimit: undefined, perUserLimit: 5, currentUsage: 89 },
    validity: { startDate: daysAgo(180), endDate: daysAhead(180), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(5),
    stats: { totalUses: 89, totalRevenue: 89000000, totalDiscount: 1780000 },
  },

  // ── 14. PREPAID5 — prepaid order bonus, active ───────────────────────────
  {
    id: "coupon-prepaid5",
    code: "PREPAID5",
    name: "5% Off Prepaid Orders",
    description: "Pay online (UPI/card) and get an extra 5% off. Max ₹300 discount.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 5, maxDiscount: 30000, minPurchase: 50000 },
    usage: { totalLimit: undefined, perUserLimit: undefined, currentUsage: 1024 },
    validity: { startDate: daysAgo(150), endDate: daysAhead(150), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(150),
    updatedAt: daysAgo(1),
    stats: { totalUses: 1024, totalRevenue: 512000000, totalDiscount: 25600000 },
  },

  // ── 15. GUNDAMGALAXY12 — store coupon for Gundam Galaxy, active ─────────
  {
    id: "coupon-gundamgalaxy12",
    code: "GUNDAMGALAXY12",
    name: "Gundam Galaxy 12% Off",
    description: "12% off everything at Gundam Galaxy store. Max ₹400.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-gundam-galaxy",
    discount: { value: 12, maxDiscount: 40000, minPurchase: 250000 },
    usage: { totalLimit: 100, perUserLimit: 2, currentUsage: 24 },
    validity: { startDate: daysAgo(45), endDate: daysAhead(60), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: false },
    createdBy: "user-amit-sharma",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
    stats: { totalUses: 24, totalRevenue: 60000000, totalDiscount: 7200000 },
  },

  // ── 16. VINTAGEVAULT8 — store coupon for Vintage Vault, expired ─────────
  {
    id: "coupon-vintagevault8",
    code: "VINTAGEVAULT8",
    name: "Vintage Vault 8% Off — Diwali Special",
    description: "Diwali special — 8% off vintage collectibles. Expired Nov 2025.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-vintage-vault",
    discount: { value: 8, maxDiscount: 50000, minPurchase: 500000 },
    usage: { totalLimit: 50, perUserLimit: 1, currentUsage: 28 },
    validity: { startDate: daysAgo(180), endDate: daysAgo(150), isActive: false },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: false },
    createdBy: "user-priya-singh",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(150),
    stats: { totalUses: 28, totalRevenue: 140000000, totalDiscount: 11200000 },
  },

  // ── 17. AUCTION25 — 25% off auction shipping, active ────────────────────
  {
    id: "coupon-auction25",
    code: "AUCTION25",
    name: "25% Off Auction Wins (Shipping)",
    description: "Auction winners get 25% off shipping. Max ₹250 discount.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 25, maxDiscount: 25000, minPurchase: 0 },
    usage: { totalLimit: undefined, perUserLimit: undefined, currentUsage: 56 },
    validity: { startDate: daysAgo(60), endDate: daysAhead(120), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(4),
    stats: { totalUses: 56, totalRevenue: 28000000, totalDiscount: 1400000 },
  },

  // ── 18. SUMMER15 — seasonal 15% off, upcoming ────────────────────────────
  {
    id: "coupon-summer15",
    code: "SUMMER15",
    name: "Summer Sale 15% Off",
    description: "15% off summer 2026 collectibles. Max ₹600. Starts in 2 weeks.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 15, maxDiscount: 60000, minPurchase: 200000 },
    usage: { totalLimit: 500, perUserLimit: 1, currentUsage: 0 },
    validity: { startDate: daysAhead(14), endDate: daysAhead(45), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },

  // ── 19. RETROVAULT10 — store coupon for Vintage Vault, active ────────────
  {
    id: "coupon-retrovault10",
    code: "RETROVAULT10",
    name: "Retro Vault 10% Off",
    description: "10% off retro collectibles at Vintage Vault. Max ₹350.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-vintage-vault",
    discount: { value: 10, maxDiscount: 35000, minPurchase: 200000 },
    usage: { totalLimit: 75, perUserLimit: 1, currentUsage: 19 },
    validity: { startDate: daysAgo(20), endDate: daysAhead(40), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: false },
    createdBy: "user-priya-singh",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
    stats: { totalUses: 19, totalRevenue: 47500000, totalDiscount: 3325000 },
  },

  // ── 20. BIGBANG2026 — ₹1,000 off orders ₹10k+, active ───────────────────
  {
    id: "coupon-bigbang2026",
    code: "BIGBANG2026",
    name: "₹1,000 Off Orders Above ₹10,000",
    description: "Flat ₹1,000 off orders ₹10,000+. Big-ticket promo. Once per user.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 100000, minPurchase: 1000000 },
    usage: { totalLimit: 1000, perUserLimit: 1, currentUsage: 142 },
    validity: { startDate: daysAgo(75), endDate: daysAhead(90), isActive: true },
    restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(75),
    updatedAt: daysAgo(1),
    stats: { totalUses: 142, totalRevenue: 1846000000, totalDiscount: 14200000 },
  },
];
