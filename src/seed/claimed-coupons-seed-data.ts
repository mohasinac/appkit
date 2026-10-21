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

/* `NOW` / date helpers and the id factory were dropped with the fixtures that
 * used them; re-add them alongside any fixture that returns. */

export const claimedCouponsSeedData: ClaimedCouponDocument[] = [
  /*
   * 🛑 EMPTIED 2026-10-21. All three rows were Rehan's wallet — REHAN10
   * (spin), BLADER50 (expired) and FREESHIP499 (used) — and none of those
   * coupons survived the purge that left CASHBACK10 as the only code.
   *
   * Repointing them at CASHBACK10 would be wrong three ways at once: it is a
   * Diwali offer that has not opened, so there is nothing to have claimed;
   * its `perUserLimit` is 1, so a "used" row would consume the only use that
   * account has; and the Expired tab needs a coupon whose window has CLOSED,
   * which CASHBACK10's has not.
   *
   * 🛑 The Active / Expired / Used tabs on /user/coupons therefore have no
   * fixture and render empty. That is a real loss of coverage, stated rather
   * than papered over — restoring it needs a second coupon with a past
   * validity window, not an edit to this file alone.
   */
];
