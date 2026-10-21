/**
 * How much of an order can still be refunded — the one server-side answer.
 *
 * `refundable-base.ts` is deliberately PURE: it takes `legacyGstPercent` as an
 * argument rather than reading settings, so it stays testable and so a caller
 * cannot accidentally apply today's GST rate to a historical order. That purity
 * is right, and it leaves every server caller needing the same three lines to
 * supply the argument.
 *
 * Three callers now need them — `cancelOrderWithRefund`, `obligationSweep`'s
 * auto-refund branches, and `processRefundAction`'s own cap check — and three
 * copies of a money calculation is Root Cause #75's exact shape. So the
 * settings read lives here, once.
 *
 * 🛑 The read is for ONE case and it is not optional. Orders written before
 * `platformFeeGst` was persisted (2026-10-21) carry no stored fee GST, so it
 * has to be derived from the rate — and if two callers derive it differently,
 * or one skips it, they disagree about the cap. The direction of that
 * disagreement matters: skipping the GST INFLATES the refundable base, so a
 * "refund everything" leaves a sub-rupee residue and the order can never reach
 * `status: "refunded"` — which is D3, reintroduced by omission.
 *
 * A failed settings read degrades to `undefined`, which means legacy orders
 * under-withhold rather than the whole refund failing. That is the safer
 * direction for the buyer and it is visible: the residue shows up as an order
 * stuck short of `refunded`, which R5 in `paymentReconcile` reports.
 */

import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import {
  refundCapacity,
  type RefundCapacity,
  type RefundableOrderLike,
} from "../../../shared/checkout/refundable-base";
import { normalizeError } from "../../../../errors/normalize";

export async function resolveRefundCapacity(
  order: RefundableOrderLike,
): Promise<RefundCapacity> {
  const settings = await siteSettingsRepository.getSingleton().catch((err: unknown) => {
    void normalizeError(err);
    return null;
  });
  return refundCapacity(order, settings?.commissions?.gstPercent);
}
