/*
 * WHY: Seeds claimed coupons wallet for the Beyblade marketplace.
 * WHAT: 3 records for Rehan — active (spin), expired (manual), used (manual). Tabs Active/Expired/Used.
 *
 * EXPORTS:
 *   claimedCouponsSeedData — Array of ClaimedCouponDocument for seed runner
 *
 * @tag domain:coupons,promotions
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
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
    id: createClaimedCouponId("user-yugi-muto", "REHAN10"),
    userId: "user-yugi-muto",
    couponId: "coupon-rehan10",
    couponCode: "REHAN10",
    source: "spin",
    couponSnapshot: {
      name: "Rehan's Welcome 10% Off",
      description: "10% off your first order on LetItRip.",
      type: "percentage",
      scope: "admin",
      discount: { value: 10, maxDiscount: 500, minPurchase: 999 },
      restrictions: { firstTimeUserOnly: true },
    },
    status: "active",
    expiresAt: daysAhead(14),
    claimedAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  // Expired — manually claimed 30 days ago, no purchase made
  {
    id: createClaimedCouponId("user-yugi-muto", "BLADER50"),
    userId: "user-yugi-muto",
    couponId: "coupon-blader50",
    couponCode: "BLADER50",
    source: "manual",
    couponSnapshot: {
      name: "Blader's Power ₹500 Off",
      description: "₹500 flat discount on orders above ₹5,000.",
      type: "fixed",
      scope: "admin",
      discount: { value: 500, minPurchase: 5000 },
      restrictions: { firstTimeUserOnly: false },
    },
    status: "expired",
    expiresAt: daysAgo(5),
    claimedAt: daysAgo(45),
    createdAt: daysAgo(45),
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
      discount: { value: 0, minPurchase: 499 },
      restrictions: { firstTimeUserOnly: false },
    },
    status: "used",
    expiresAt: daysAhead(60),
    usedAt: daysAgo(10),
    usedOrderId: "order-3-20260508-a1b2c3",
    claimedAt: daysAgo(20),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(10),
  },
];
