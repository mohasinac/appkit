import { z } from "zod";
import { ATTACHED_COUPON_MAX } from "../constants/attached-coupons";

/**
 * The write shape for any `couponIds`-style field — one definition, imported
 * by the event schema, the blog schema and both admin API routes.
 *
 * 🛑 ONE definition on purpose. Four hand-written `z.array(z.string())`s would
 * be four chances for the cap to drift, and a cap enforced on three of four
 * write paths is not a cap — the fourth is simply the way in. This is the same
 * failure as the ten hand-maintained copies of the `ListingType` union in
 * Root Cause #61.
 *
 * `.max()` carries a message because this one is reachable by a human in an
 * admin form, and "Too big: expected array to have <=10 items" is not an
 * instruction.
 */
export const attachedCouponIdsSchema = z
  .array(z.string().min(1))
  .max(ATTACHED_COUPON_MAX, `At most ${ATTACHED_COUPON_MAX} coupons can be attached.`)
  /*
   * Deduped at the boundary rather than trusted from the client. The admin
   * picker will not produce a duplicate, but the route is the thing that has
   * to be true — and a duplicate id would render the same card twice and, on
   * the raffle path, award the same prize twice.
   */
  .transform((ids) => Array.from(new Set(ids.filter(Boolean))))
  .optional();
