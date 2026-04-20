/**
 * Coupons Seed Data
 * Various types of discount coupons
 */

import type { CouponDocument } from "../features/promotions/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const couponsSeedData: Partial<CouponDocument>[] = [
  // Percentage discount coupons
  {
    id: "coupon-WELCOME10",
    code: "WELCOME10",
    name: "Otaku Welcome Discount",
    description: "10% off your first anime figure or collectible order",
    type: "percentage",
    discount: {
      value: 10,
      maxDiscount: 1000,
      minPurchase: 500,
    },
    usage: {
      totalLimit: 1000,
      perUserLimit: 1,
      currentUsage: 245,
    },
    validity: {
      startDate: daysAgo(799),
      endDate: daysAhead(297),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: true,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(799),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 245,
      totalRevenue: 1225000,
      totalDiscount: 122500,
    },
  },
  {
    id: "coupon-SAVE20",
    code: "SAVE20",
    name: "Winter Anime Sale",
    description: "20% off all anime collectibles sitewide — winter season deal",
    type: "percentage",
    discount: {
      value: 20,
      maxDiscount: 5000,
      minPurchase: 2000,
    },
    usage: {
      totalLimit: 500,
      perUserLimit: 2,
      currentUsage: 178,
    },
    validity: {
      startDate: daysAgo(37),
      endDate: daysAgo(9),
      isActive: false,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(44),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 178,
      totalRevenue: 3560000,
      totalDiscount: 712000,
    },
  },
  {
    id: "coupon-FIGURES15",
    code: "FIGURES15",
    name: "Scale Figures Sale",
    description: "15% off scale figures & PVC statues — limited window",
    type: "percentage",
    discount: {
      value: 15,
      maxDiscount: 3000,
      minPurchase: 3000,
    },
    usage: {
      totalLimit: 300,
      perUserLimit: 1,
      currentUsage: 89,
    },
    validity: {
      startDate: daysAgo(33),
      endDate: daysAgo(17),
      isActive: false,
    },
    restrictions: {
      applicableCategories: ["category-scale-figures-collectibles"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(37),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 89,
      totalRevenue: 4450000,
      totalDiscount: 667500,
    },
  },

  // Fixed amount discount coupons
  {
    id: "coupon-FLAT500",
    code: "FLAT500",
    name: "Flat ₹500 Off Collectibles",
    description: "Flat ₹500 off anime figure & collectible orders above ₹3000",
    type: "fixed",
    discount: {
      value: 500,
      minPurchase: 3000,
    },
    usage: {
      totalLimit: 1000,
      perUserLimit: 3,
      currentUsage: 412,
    },
    validity: {
      startDate: daysAgo(54),
      endDate: daysAhead(22),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(59),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 412,
      totalRevenue: 2060000,
      totalDiscount: 206000,
    },
  },
  {
    id: "coupon-MEGA1000",
    code: "MEGA1000",
    name: "Mega Otaku Discount",
    description: "₹1000 off anime collectible orders above ₹10,000",
    type: "fixed",
    discount: {
      value: 1000,
      minPurchase: 10000,
    },
    usage: {
      totalLimit: 200,
      perUserLimit: 1,
      currentUsage: 56,
    },
    validity: {
      startDate: daysAgo(37),
      endDate: daysAgo(22),
      isActive: false,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(41),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 56,
      totalRevenue: 840000,
      totalDiscount: 56000,
    },
  },

  // Free shipping coupon
  {
    id: "coupon-FREESHIP",
    code: "FREESHIP",
    name: "Free Shipping — Otaku Orders",
    description: "Free shipping on all anime & collectible orders — no minimum",
    type: "free_shipping",
    discount: {
      value: 0,
      minPurchase: 0,
    },
    usage: {
      totalLimit: 5000,
      perUserLimit: 10,
      currentUsage: 1234,
    },
    validity: {
      startDate: daysAgo(68),
      endDate: daysAhead(297),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(85),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 1234,
      totalRevenue: 6170000,
      totalDiscount: 123400,
    },
  },

  // Buy X Get Y coupon
  {
    id: "coupon-BUY2GET1",
    code: "BUY2GET1",
    name: "Buy 2 Get 1 Free — Cosplay",
    description: "Buy 2 cosplay items get 1 free — limited stock event",
    type: "buy_x_get_y",
    discount: {
      value: 0,
      minPurchase: 0,
    },
    bxgy: {
      buyQuantity: 2,
      getQuantity: 1,
      applicableCategories: [
        "category-cosplay-cosplay",
        "category-apparel-cosplay",
        "category-accessories-cosplay",
      ],
    },
    usage: {
      totalLimit: 100,
      perUserLimit: 1,
      currentUsage: 34,
    },
    validity: {
      startDate: daysAgo(37),
      endDate: daysAgo(9),
      isActive: false,
    },
    restrictions: {
      applicableCategories: [
        "category-cosplay-cosplay",
        "category-apparel-cosplay",
        "category-accessories-cosplay",
      ],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(44),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 34,
      totalRevenue: 204000,
      totalDiscount: 68000,
    },
  },

  // Product-specific coupon
  {
    id: "coupon-MAKIMA500",
    code: "MAKIMA500",
    name: "Makima Figure Launch Deal",
    description: "₹500 off the Makima 1/7 Kotobukiya figure — launch week only",
    type: "fixed",
    discount: {
      value: 500,
      minPurchase: 12000,
    },
    usage: {
      totalLimit: 50,
      perUserLimit: 1,
      currentUsage: 12,
    },
    validity: {
      startDate: daysAgo(33),
      endDate: daysAgo(22),
      isActive: false,
    },
    restrictions: {
      applicableProducts: ["auction-chainsaw-man-makima-figure-fashion-1"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(37),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 12,
      totalRevenue: 144000,
      totalDiscount: 6000,
    },
  },

  // Inactive/Expired coupon
  {
    id: "coupon-NEWYEAR25",
    code: "NEWYEAR25",
    name: "New Year Otaku Sale",
    description: "25% off all anime collectibles — New Year 2026 flash deal",
    type: "percentage",
    discount: {
      value: 25,
      maxDiscount: 5000,
      minPurchase: 1000,
    },
    usage: {
      totalLimit: 500,
      perUserLimit: 1,
      currentUsage: 487,
    },
    validity: {
      startDate: daysAgo(68),
      endDate: daysAgo(61),
      isActive: false,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(75),
    updatedAt: daysAgo(61),
    stats: {
      totalUses: 487,
      totalRevenue: 9740000,
      totalDiscount: 2435000,
    },
  },

  // Seller-specific coupon
  {
    id: "coupon-FJPVAULT15",
    code: "FJPVAULT15",
    name: "FigureVault JP Special",
    description: "15% off FigureVault JP figures and imports",
    type: "percentage",
    discount: {
      value: 15,
      maxDiscount: 2500,
      minPurchase: 2000,
    },
    usage: {
      totalLimit: 200,
      perUserLimit: 2,
      currentUsage: 67,
    },
    validity: {
      startDate: daysAgo(37),
      endDate: daysAgo(9),
      isActive: false,
    },
    restrictions: {
      applicableSellers: ["user-techhub-electronics-electron"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(41),
    updatedAt: daysAgo(29),
    stats: {
      totalUses: 67,
      totalRevenue: 1340000,
      totalDiscount: 201000,
    },
  },

  // Holi Special coupon — linked to the Holi Offer event
  {
    id: "coupon-ANIMECON15",
    code: "ANIMECON15",
    name: "AniCon 2026 Coupon Drop",
    description:
      "Extra 15% off for AniCon 2026 — valid on all anime orders over ₹999",
    type: "percentage",
    discount: {
      value: 15,
      maxDiscount: 1500,
      minPurchase: 999,
    },
    usage: {
      totalLimit: 5000,
      perUserLimit: 1,
      currentUsage: 0,
    },
    validity: {
      startDate: daysAgo(9),
      endDate: daysAhead(6),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
    stats: {
      totalUses: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    },
  },

  // Fashion Boutique — seller-specific March sale coupon
  {
    id: "coupon-ANIMECRAFT10",
    code: "ANIMECRAFT10",
    name: "AnimeCraft Apparel March Offer",
    description:
      "10% off all AnimeCraft Apparel cosplay & accessories in March",
    type: "percentage",
    discount: {
      value: 10,
      maxDiscount: 1500,
      minPurchase: 1000,
    },
    usage: {
      totalLimit: 300,
      perUserLimit: 2,
      currentUsage: 0,
    },
    validity: {
      startDate: daysAgo(9),
      endDate: daysAhead(22),
      isActive: true,
    },
    restrictions: {
      applicableSellers: ["user-fashion-boutique-fashionb"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
    stats: {
      totalUses: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    },
  },

  // Golden Week Anime Special — 10% off all collectibles, used by event-golden-week-anime-special-2026-offer
  {
    id: "coupon-GOLDENWEEK10",
    code: "GOLDENWEEK10",
    name: "Golden Week Anime Special",
    description:
      "10% off all anime collectibles during Golden Week (Apr 29 – May 5)",
    type: "percentage",
    discount: {
      value: 10,
      maxDiscount: 1500,
      minPurchase: 500,
    },
    usage: {
      totalLimit: 1000,
      perUserLimit: 2,
      currentUsage: 0,
    },
    validity: {
      startDate: daysAhead(51),
      endDate: daysAhead(57),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAhead(11),
    updatedAt: daysAhead(11),
    stats: {
      totalUses: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    },
  },

  // Home Essentials — seller-specific coupon for home & sports categories
  {
    id: "coupon-OTAKUSHELF15",
    code: "OTAKUSHELF15",
    name: "OtakuShelf Co March Deal",
    description: "15% off OtakuShelf Co Nendoroids & Gunpla above ₹2000",
    type: "percentage",
    discount: {
      value: 15,
      maxDiscount: 2000,
      minPurchase: 2000,
    },
    usage: {
      totalLimit: 200,
      perUserLimit: 1,
      currentUsage: 0,
    },
    validity: {
      startDate: daysAgo(9),
      endDate: daysAhead(22),
      isActive: true,
    },
    restrictions: {
      applicableSellers: ["user-home-essentials-homeesse"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
    stats: {
      totalUses: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    },
  },
];
