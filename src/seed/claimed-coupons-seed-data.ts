/*
 * WHY: Seeds claimed coupons wallet for YGO marketplace.
 * WHAT: 3 records for Yugi — active (spin), expired (manual), used (manual). Tabs Active/Expired/Used.
 *
 * EXPORTS:
 *   claimedCouponsSeedData — Array of ClaimedCouponDocument for seed runner
 *
 * @tag domain:coupons,promotions
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { ClaimedCouponDocument } from "../features/promotions/schemas";
import { createClaimedCouponId } from "../features/promotions/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const claimedCouponsSeedData: ClaimedCouponDocument[] = [
  // Active — won from a spin wheel, expires in 14 days
  {
    id: createClaimedCouponId("user-yugi-muto", "YUGI10"),
    userId: "user-yugi-muto",
    couponId: "coupon-yugi10",
    couponCode: "YUGI10",
    source: "spin",
    couponSnapshot: {
      name: "Yugi's Welcome 10% Off",
      description: "10% off your first order on LetItRip.",
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
    id: createClaimedCouponId("user-yugi-muto", "EXODIA50"),
    userId: "user-yugi-muto",
    couponId: "coupon-exodia50",
    couponCode: "EXODIA50",
    source: "manual",
    couponSnapshot: {
      name: "Exodia ₹500 Off",
      description: "₹500 flat discount on orders above ₹5,000.",
      type: "fixed",
      scope: "admin",
      discount: { value: 50000, minPurchase: 500000 },
      restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: true },
    },
    status: "expired",
    expiresAt: daysAgo(5),
    claimedAt: daysAgo(45),
    updatedAt: daysAgo(5),
  },
  // Used — applied to a prior order
  {
    id: createClaimedCouponId("user-yugi-muto", "FREESHIP499"),
    userId: "user-yugi-muto",
    couponId: "coupon-freeship499",
    couponCode: "FREESHIP499",
    source: "manual",
    couponSnapshot: {
      name: "Free Shipping Over ₹499",
      description: "Free shipping on orders above ₹499.",
      type: "free_shipping",
      scope: "admin",
      discount: { value: 0, minPurchase: 49900 },
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
