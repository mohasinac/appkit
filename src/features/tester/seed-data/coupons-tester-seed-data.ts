/*
 * WHY: Shared tester sandbox — 3 disposable test coupons so testers can exercise
 *      coupon apply/reject edge cases end to end: a perUserLimit:1 admin coupon (to
 *      verify the second-use rejection), an already-expired admin coupon (to verify
 *      the expiry rejection), and a seller-scope coupon on store-tester-sandbox.
 *      NOTE: CouponDocument does not currently carry isTestData/testDataExpiresAt
 *      (unlike categories/stores/products/blogPosts/events) — testerSandboxCleanup
 *      does not cascade-delete these. They're small, static, and harmless to leave;
 *      extending the cleanup script to cover coupons is a follow-up, not blocking.
 * WHAT: Exports couponsTesterSeedData — 3 Partial<CouponDocument> for the seed runner.
 *
 * EXPORTS:
 *   couponsTesterSeedData — Array of 3 Partial<CouponDocument> for the seed runner
 *
 * @tag domain:coupons,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { CouponDocument } from "../../promotions/schemas";
import { COUPON_FIELDS } from "../../../constants/field-names";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const couponsTesterSeedData: Partial<CouponDocument>[] = [
  {
    id: "coupon-tester-sandbox-limited",
    code: "TESTERLIMITED",
    name: "Tester Sandbox — One Use Per Tester",
    description: "Disposable test coupon: 10% off, capped at one use per tester. Use it twice to verify the second attempt is rejected.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 10, maxDiscount: 100, minPurchase: 100 },
    usage: { totalLimit: undefined, perUserLimit: 1, currentUsage: 0 },
    validity: { startDate: daysAgo(1), endDate: daysAhead(7), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },
  {
    id: "coupon-tester-sandbox-expired",
    code: "TESTEREXPIRED",
    name: "Tester Sandbox — Already Expired",
    description: "Disposable test coupon that already expired — applying it at checkout should show a specific expiry rejection.",
    type: COUPON_FIELDS.TYPE_VALUES.FIXED,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 50, maxDiscount: 50, minPurchase: 100 },
    usage: { totalLimit: undefined, perUserLimit: 5, currentUsage: 0 },
    validity: { startDate: daysAgo(30), endDate: daysAgo(1), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },
  {
    id: "coupon-tester-sandbox-seller",
    code: "TESTERSTORE",
    name: "Tester Sandbox Store — 5% Off",
    description: "Disposable seller-scope test coupon on the tester sandbox store.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.SELLER,
    storeId: "store-tester-sandbox",
    discount: { value: 5, maxDiscount: 50, minPurchase: 0 },
    usage: { totalLimit: undefined, perUserLimit: 3, currentUsage: 0 },
    validity: { startDate: daysAgo(1), endDate: daysAhead(7), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },
];
