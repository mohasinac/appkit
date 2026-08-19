/*
 * WHY: Seeds per-user coupon usage subcollection for the Beyblade marketplace.
 * WHAT: 4 records: Rehan used REHAN10 + FREESHIP499, Vivaan used ARENA25, Admin used BLADER50.
 *
 * EXPORTS:
 *   CouponUsageSeedRecord (interface)
 *   couponUsageSeedData — Array for seed runner
 *
 * @tag domain:coupons,promotions
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export interface CouponUsageSeedRecord {
  userId: string;
  couponId: string;
  couponCode: string;
  usageCount: number;
  lastUsedAt: Date;
  orders: string[];
}

export const couponUsageSeedData: CouponUsageSeedRecord[] = [
  // Rehan used REHAN10 once (perUserLimit: 1 → exhausted)
  {
    userId: "user-yugi-muto",
    couponId: "coupon-rehan10",
    couponCode: "REHAN10",
    usageCount: 1,
    lastUsedAt: daysAgo(45),
    orders: ["order-2-20260325-a1b2c3"],
  },

  // Rehan used FREESHIP499 once (no perUserLimit)
  {
    userId: "user-yugi-muto",
    couponId: "coupon-freeship499",
    couponCode: "FREESHIP499",
    usageCount: 1,
    lastUsedAt: daysAgo(20),
    orders: ["order-1-20260410-j1k2l3"],
  },

  // Vivaan used ARENA25 once (perUserLimit: 2 → one more use left)
  {
    userId: "user-seto-kaiba",
    couponId: "coupon-arena25",
    couponCode: "ARENA25",
    usageCount: 1,
    lastUsedAt: daysAgo(15),
    orders: ["order-1-20260425-p7q8r9"],
  },

  // Admin used BLADER50 once (perUserLimit: 1 → exhausted)
  {
    userId: "user-admin-letitrip",
    couponId: "coupon-blader50",
    couponCode: "BLADER50",
    usageCount: 1,
    lastUsedAt: daysAgo(10),
    orders: ["order-1-20260430-g7h8i9"],
  },
];
