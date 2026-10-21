/*
 * WHY: Seeds the marketplace's discount coupons.
 * WHAT: ONE admin-scoped percentage coupon — CASHBACK10, the Diwali cashback
 *       code the `event-festive-cashback-10` offer event advertises.
 *
 * 🛑 It was 10 (REHAN10, BLADER50, FREESHIP499, NEWBLADER, TOURNAMENT2026,
 * ARENA25, ARENAVIP, BUYNOW10, SEALED20, LIMITEDSET) plus OFFICIAL10 until
 * 2026-10-21, when the owner asked for a single live code. The type coverage
 * that list gave — fixed, free_shipping, buy_x_get_y — is genuinely lost, so
 * a test of those branches needs a fixture added back deliberately rather
 * than assumed present.
 *
 * EXPORTS:
 *   couponsSeedData — Array of Partial<CouponDocument> for seed runner
 *
 * @tag domain:coupons
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { withCouponSearchTxt } from "./_helpers/search-txt-wrappers";
import type { CouponDocument } from "../features/promotions/schemas";
import { COUPON_FIELDS } from "../constants/field-names";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const couponsSeedData: Partial<CouponDocument>[] = [
  // ── The one coupon ──────────────────────────────────────────────────────
  /*
   * 🛑 ELEVEN COUPONS WERE REMOVED 2026-10-21, at the owner's request: one
   * live code, not a demo wall of them.
   *
   * Removing them from this file is only HALF the job. Coupons are
   * referenced by id AND by code from three other seed files, and a seed
   * advertising a code no collection contains is Root Cause #26 — a
   * narrowed catalogue leaving dangling foreign keys that nothing errors
   * on. Every one was repointed or removed in the same change; see the
   * notes in events-seed-data.ts, claimed-coupons and coupon-usage.
   *
   * 🛑 `validity.startDate` MUST match `event-festive-cashback-10`'s
   * `startsAt` — both daysAhead(16), which is Dhanteras, 6 Nov 2026. The
   * event publishes the code before it is spendable, so two independently
   * typed dates would let it work early or leave it dead on launch day,
   * and nothing would report either.
   */
  {
    id: "coupon-cashback10",
    code: "CASHBACK10",
    name: "Diwali Cashback — 10% Back",
    description:
      "Get 10% of your order value back as cashback, up to ₹1,000, on orders above ₹999 during the Diwali sale. Applies across the whole catalogue.",
    type: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE,
    scope: COUPON_FIELDS.SCOPE_VALUES.ADMIN,
    discount: { value: 10, maxDiscount: 1000, minPurchase: 999 },
    usage: { totalLimit: 2000, perUserLimit: 1, currentUsage: 0 },
    validity: { startDate: daysAhead(16), endDate: daysAhead(26), isActive: true },
    restrictions: { firstTimeUserOnly: false },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  },
].map(withCouponSearchTxt);
