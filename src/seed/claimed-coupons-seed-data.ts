/**
 * Claimed Coupons Seed Data — plan §10.
 *
 * Top-level `claimedCoupons` collection (one doc per user × coupon). These
 * rows populate the /user/coupons wallet with one example per status so the
 * tabs (Active / Expired / Used) all have something to render in demo.
 *
 * Coupon snapshots mirror coupons-seed-data.ts (WELCOME10, POKEMON25,
 * FREESHIP999) so the discount badge labels render correctly. Seed user is
 * `user-mohsin-c` to match the dev-account convention used elsewhere.
 */

import type { ClaimedCouponDocument } from "../features/promotions/schemas";
import { createClaimedCouponId } from "../features/promotions/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const claimedCouponsSeedData: ClaimedCouponDocument[] = [
  // Active — won from a spin wheel, expires in 14 days
  {
    id: createClaimedCouponId("user-mohsin-c", "WELCOME10"),
    userId: "user-mohsin-c",
    couponId: "coupon-welcome10",
    couponCode: "WELCOME10",
    source: "spin",
    couponSnapshot: {
      name: "Welcome 10% Off",
      description: "10% off your first order across the marketplace.",
      type: "percentage",
      scope: "admin",
      discount: { value: 10, maxDiscount: 50000, minPurchase: 99900 },
      restrictions: { firstTimeUserOnly: true, combineWithSellerCoupons: false },
    },
    status: "active",
    expiresAt: daysAhead(14),
    claimedAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  // Expired — manually claimed 30 days ago, no purchase made
  {
    id: createClaimedCouponId("user-mohsin-c", "POKEMON25"),
    userId: "user-mohsin-c",
    couponId: "coupon-pokemon25",
    couponCode: "POKEMON25",
    source: "manual",
    couponSnapshot: {
      name: "Pokémon 25% Off",
      description: "25% off Pokémon TCG products.",
      type: "percentage",
      scope: "admin",
      discount: { value: 25, maxDiscount: 250000, minPurchase: 199900 },
      restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    },
    status: "expired",
    expiresAt: daysAgo(5),
    claimedAt: daysAgo(45),
    updatedAt: daysAgo(5),
  },
  // Used — applied to a prior order
  {
    id: createClaimedCouponId("user-mohsin-c", "FREESHIP999"),
    userId: "user-mohsin-c",
    couponId: "coupon-freeship999",
    couponCode: "FREESHIP999",
    source: "manual",
    couponSnapshot: {
      name: "Free Shipping Over ₹999",
      description: "Free shipping on orders above ₹999.",
      type: "free_shipping",
      scope: "admin",
      discount: { value: 0, minPurchase: 99900 },
      restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    },
    status: "used",
    expiresAt: daysAhead(60),
    usedAt: daysAgo(10),
    usedOrderId: "order-3-20260508-a1b2c3",
    claimedAt: daysAgo(20),
    updatedAt: daysAgo(10),
  },
];
