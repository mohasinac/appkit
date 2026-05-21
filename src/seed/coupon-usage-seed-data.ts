/*
 * WHY: Seeds per-user coupon usage subcollection for YGO marketplace.
 * WHAT: 4 records: Yugi used YUGI10 + FREESHIP499, Kaiba used KAIBA25, Admin used EXODIA50.
 *
 * EXPORTS:
 *   CouponUsageSeedRecord (interface)
 *   couponUsageSeedData — Array for seed runner
 *
 * @tag domain:coupons,promotions
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
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
  // Yugi used YUGI10 once (perUserLimit: 1 → exhausted)
  {
    userId: "user-yugi-muto",
    couponId: "coupon-yugi10",
    couponCode: "YUGI10",
    usageCount: 1,
    lastUsedAt: daysAgo(45),
    orders: ["order-2-20260325-a1b2c3"],
  },

  // Yugi used FREESHIP499 once (no perUserLimit)
  {
    userId: "user-yugi-muto",
    couponId: "coupon-freeship499",
    couponCode: "FREESHIP499",
    usageCount: 1,
    lastUsedAt: daysAgo(20),
    orders: ["order-1-20260410-j1k2l3"],
  },

  // Kaiba used KAIBA25 once (perUserLimit: 2 → one more use left)
  {
    userId: "user-seto-kaiba",
    couponId: "coupon-kaiba25",
    couponCode: "KAIBA25",
    usageCount: 1,
    lastUsedAt: daysAgo(15),
    orders: ["order-1-20260425-p7q8r9"],
  },

  // Admin used EXODIA50 once (perUserLimit: 1 → exhausted)
  {
    userId: "user-admin-letitrip",
    couponId: "coupon-exodia50",
    couponCode: "EXODIA50",
    usageCount: 1,
    lastUsedAt: daysAgo(10),
    orders: ["order-1-20260430-g7h8i9"],
  },
];
