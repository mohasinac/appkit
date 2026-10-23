import type { CouponDocument } from "../../../../features/promotions/schemas";
import type { AttachedCoupon } from "../../../../features/promotions/constants/attached-coupons";

/**
 * `CouponDocument` → the public `AttachedCoupon` shape.
 *
 * 🛑 Built field by field. Never `{ ...doc }` with deletes — that publishes
 * every key nobody thought to remove, including ones the interface does not
 * declare, which is exactly how `adSettings.providerCredentials` and a
 * decrypted WhatsApp token reached public HTML (Root Cause #70).
 *
 * Deliberately NOT carried across, each for its own reason:
 *   usage.*        — `currentUsage` / `totalLimit` is redemption telemetry;
 *                    a reader who learns a code is near its cap learns
 *                    nothing useful and the seller loses a lever.
 *   analytics.*    — `totalRevenue` / `totalDiscount` is seller revenue.
 *   restrictions.* — `applicableProducts` / `excludeCategories` is the
 *                    coupon's internal targeting; checkout enforces it and
 *                    says so there, in context, against a real cart.
 *   createdBy      — a uid.
 *   scope/storeId  — not rendered; see the note in AttachedCouponsSection
 *                    about why the card does not label a seller.
 *   bxgy/tiers     — structured configs with no renderer; adding one is a
 *                    feature, not a projection decision.
 */
export function toAttachedCoupon(doc: CouponDocument): AttachedCoupon {
  return {
    id: doc.id,
    code: doc.code,
    name: doc.name,
    description: doc.description,
    type: doc.type,
    discountValue: doc.discount.value,
    maxDiscount: doc.discount.maxDiscount,
    minPurchase: doc.discount.minPurchase,
    /*
     * ISO, not a `Date`. This crosses a Server → Client Component boundary and
     * a `Date` survives that only because Next serialises it; an ISO string is
     * the shape the renderer actually wants and removes the question.
     *
     * 🛑 Absent means NO END DATE, never "expired". A renderer that treats a
     * missing `endsAt` as expired hides every open-ended coupon.
     */
    endsAt: doc.validity.endDate ? new Date(doc.validity.endDate).toISOString() : undefined,
  };
}
