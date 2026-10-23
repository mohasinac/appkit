/**
 * Attached coupons — the contract shared by every layer that carries a set of
 * coupon ids on a piece of CONTENT (`EventDocument.couponIds`,
 * `BlogPostDocument.couponIds`).
 *
 * This file is deliberately dependency-free: the Zod write schemas, the admin
 * editors, the repository's batch read and the public renderer all import the
 * cap from here, so the number cannot drift between what an editor may save
 * and what a page is willing to read. A cap enforced in one of those four
 * places is not a cap.
 */

/**
 * Most coupons one event or blog post may carry.
 *
 * 🛑 This is a Rule #6 bound, not a style preference. The public event and
 * blog pages resolve these ids in a Server Component, so the number is a
 * direct multiplier on a guest-reachable read. Ten is already generous for a
 * promotion readers are expected to scan; the write schemas reject more, and
 * `couponsRepository.findByIds` re-clamps so a document hand-edited in the
 * Firestore console still cannot widen the read.
 *
 * Raising it means re-checking both: the schemas AND the repository.
 */
export const ATTACHED_COUPON_MAX = 10;

/**
 * The public projection of a coupon when it is attached to content.
 *
 * 🛑 This is an ALLOW-LIST, and the reason it exists is Root Cause #70: a
 * public payload built by spreading a document and deleting keys publishes
 * every field nobody thought to delete — including fields the TypeScript
 * interface never declared. `CouponDocument` carries `usage.currentUsage`,
 * `analytics.totalRevenue`, `analytics.totalDiscount`, the whole
 * `restrictions` block and `createdBy`; none of that is a reader's business,
 * and `analytics.*` is seller revenue.
 *
 * Note the existing `GET /api/coupons` returns whole documents. That is
 * pre-existing and out of scope here — but it is precisely why this path
 * starts with a projection instead of inheriting the habit.
 */
export interface AttachedCoupon {
  id: string;
  code: string;
  name: string;
  description: string;
  /** `percentage` | `fixed` | `free_shipping` | `buy_x_get_y` | `points_earn` */
  type: string;
  /** The headline number: percent for `percentage`, rupees for `fixed`. */
  discountValue: number;
  /** Cap on a percentage discount, in rupees. */
  maxDiscount?: number;
  /** Minimum cart value before the coupon applies, in rupees. */
  minPurchase?: number;
  /** ISO string — `undefined` means no end date, NOT "expired". */
  endsAt?: string;
}
