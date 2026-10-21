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

/* `NOW` / date helpers and the id factory were dropped with the fixtures that
 * used them; re-add them alongside any fixture that returns. */

export interface CouponUsageSeedRecord {
  userId: string;
  couponId: string;
  couponCode: string;
  usageCount: number;
  lastUsedAt: Date;
  orders: string[];
}

export const couponUsageSeedData: CouponUsageSeedRecord[] = [
  /*
   * 🛑 EMPTIED 2026-10-21. Every row here recorded usage of a coupon that no
   * longer exists — REHAN10, FREESHIP499, ARENA25, BLADER50 — after the purge
   * that left CASHBACK10 as the only code.
   *
   * Repointing them at CASHBACK10 was the obvious move and is wrong: a row
   * here asserts a named user has ALREADY SPENT that code, and CASHBACK10 is
   * a Diwali offer that has not opened. `getUserCouponUsageCount` reads these
   * to enforce `perUserLimit`, which is 1 — so a fabricated row would
   * silently consume the single use that account gets, and the buyer would be
   * refused at checkout with no way to see why.
   *
   * Empty is the honest state until there is a second coupon to spend.
   */
];
