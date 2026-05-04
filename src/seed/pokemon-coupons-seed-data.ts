/**
 * Pokemon TCG — Coupons Seed Data
 * Platform-wide and event-linked discount coupons themed around the Pokemon Base Set.
 */

import type { CouponDocument } from "../features/promotions/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const pokemonCouponsSeedData: Partial<CouponDocument>[] = [
  // Platform welcome coupon — first-time Pokemon TCG buyer
  {
    id: "coupon-CATCHEM10",
    code: "CATCHEM10",
    name: "Gotta Catch 'Em — First Order",
    description: "10% off your first Pokemon card order. Welcome to the LetItRip community!",
    type: "percentage",
    discount: {
      value: 10,
      maxDiscount: 1500,
      minPurchase: 500,
    },
    usage: {
      totalLimit: 2000,
      perUserLimit: 1,
      currentUsage: 387,
    },
    validity: {
      startDate: daysAgo(180),
      endDate: daysAhead(365),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: true,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
    stats: {
      totalUses: 387,
      totalRevenue: 1935000,
      totalDiscount: 193500,
    },
  },

  // Charizard hunt — large-order discount
  {
    id: "coupon-CHARIZARD25",
    code: "CHARIZARD25",
    name: "Charizard Hunt Discount",
    description: "₹2500 off graded and high-value Pokemon singles above ₹20,000",
    type: "fixed",
    discount: {
      value: 2500,
      minPurchase: 20000,
    },
    usage: {
      totalLimit: 100,
      perUserLimit: 1,
      currentUsage: 43,
    },
    validity: {
      startDate: daysAgo(45),
      endDate: daysAhead(30),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(50),
    updatedAt: daysAgo(1),
    stats: {
      totalUses: 43,
      totalRevenue: 1290000,
      totalDiscount: 107500,
    },
  },

  // Free shipping for any sealed product
  {
    id: "coupon-POKESHIP",
    code: "POKESHIP",
    name: "Free Shipping — Sealed Pokemon Product",
    description: "Free shipping on all sealed Pokemon booster boxes and ETBs — no minimum",
    type: "free_shipping",
    discount: {
      value: 0,
      minPurchase: 0,
    },
    usage: {
      totalLimit: 3000,
      perUserLimit: 5,
      currentUsage: 892,
    },
    validity: {
      startDate: daysAgo(90),
      endDate: daysAhead(180),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3),
    stats: {
      totalUses: 892,
      totalRevenue: 8920000,
      totalDiscount: 89200,
    },
  },

  // Pikachu Day — 20% off Pikachu cards (category-specific)
  {
    id: "coupon-PIKADAY20",
    code: "PIKADAY20",
    name: "Pikachu Day Flash Sale",
    description: "20% off all Pikachu cards and variants — 72-hour flash deal",
    type: "percentage",
    discount: {
      value: 20,
      maxDiscount: 3000,
      minPurchase: 1000,
    },
    usage: {
      totalLimit: 500,
      perUserLimit: 2,
      currentUsage: 234,
    },
    validity: {
      startDate: daysAgo(5),
      endDate: daysAgo(2),
      isActive: false,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
    stats: {
      totalUses: 234,
      totalRevenue: 4680000,
      totalDiscount: 936000,
    },
  },

  // Misty's Water Cards store-specific coupon
  {
    id: "coupon-MISTYS15",
    code: "MISTYS15",
    name: "Misty's Water Cards Special",
    description: "15% off all Misty's Water Cards store — Water-type and Aqua-set cards",
    type: "percentage",
    discount: {
      value: 15,
      maxDiscount: 2000,
      minPurchase: 1500,
    },
    usage: {
      totalLimit: 200,
      perUserLimit: 2,
      currentUsage: 67,
    },
    validity: {
      startDate: daysAgo(14),
      endDate: daysAhead(14),
      isActive: true,
    },
    restrictions: {
      applicableSellers: ["store-mistys-water-cards"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(14),
    stats: {
      totalUses: 67,
      totalRevenue: 1005000,
      totalDiscount: 150750,
    },
  },

  // Poke-Auctions — buy-now discount
  {
    id: "coupon-BUYNOW500",
    code: "BUYNOW500",
    name: "Auction Buy Now Saver",
    description: "₹500 off when you use Buy Now on any auction — skip the bidding war",
    type: "fixed",
    discount: {
      value: 500,
      minPurchase: 3000,
    },
    usage: {
      totalLimit: 300,
      perUserLimit: 3,
      currentUsage: 121,
    },
    validity: {
      startDate: daysAgo(20),
      endDate: daysAhead(40),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: true,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(22),
    updatedAt: daysAgo(20),
    stats: {
      totalUses: 121,
      totalRevenue: 1210000,
      totalDiscount: 60500,
    },
  },

  // PSA graded cards — loyalty discount
  {
    id: "coupon-GRADE10",
    code: "GRADE10",
    name: "Graded Collector Loyalty",
    description: "10% off PSA, BGS, and CGC graded cards sitewide — for the serious collector",
    type: "percentage",
    discount: {
      value: 10,
      maxDiscount: 5000,
      minPurchase: 2000,
    },
    usage: {
      totalLimit: 1000,
      perUserLimit: 3,
      currentUsage: 156,
    },
    validity: {
      startDate: daysAgo(30),
      endDate: daysAhead(60),
      isActive: true,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(32),
    updatedAt: daysAgo(30),
    stats: {
      totalUses: 156,
      totalRevenue: 3120000,
      totalDiscount: 312000,
    },
  },

  // New Year 2026 — expired
  {
    id: "coupon-POKE2026",
    code: "POKE2026",
    name: "New Year 2026 Pokemon Sale",
    description: "25% off all Base Set singles — ring in 2026 with the OG set",
    type: "percentage",
    discount: {
      value: 25,
      maxDiscount: 8000,
      minPurchase: 1000,
    },
    usage: {
      totalLimit: 1000,
      perUserLimit: 1,
      currentUsage: 947,
    },
    validity: {
      startDate: daysAgo(120),
      endDate: daysAgo(113),
      isActive: false,
    },
    restrictions: {
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(125),
    updatedAt: daysAgo(113),
    stats: {
      totalUses: 947,
      totalRevenue: 18940000,
      totalDiscount: 4735000,
    },
  },

  // Blaine's Fire Shoppe — store exclusive
  {
    id: "coupon-FIRESALE12",
    code: "FIRESALE12",
    name: "Blaine's Fire Shoppe Flash Deal",
    description: "12% off all Fire-type cards at Blaine's Fire Shoppe",
    type: "percentage",
    discount: {
      value: 12,
      maxDiscount: 1800,
      minPurchase: 800,
    },
    usage: {
      totalLimit: 150,
      perUserLimit: 2,
      currentUsage: 0,
    },
    validity: {
      startDate: daysAhead(2),
      endDate: daysAhead(9),
      isActive: true,
    },
    restrictions: {
      applicableSellers: ["store-blaines-fire-shoppe"],
      firstTimeUserOnly: false,
      combineWithSellerCoupons: false,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    stats: {
      totalUses: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    },
  },
];
