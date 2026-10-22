/**
 * "Is this order waiting on OUR courier problem?" — one predicate, so the
 * obligation engine, the seller's UI and the admin digest cannot disagree.
 *
 * Deliberately a function over the document rather than a stored boolean: a
 * denormalised `isCourierBlocked` mirror drifts the first time a write path
 * forgets it (Root Cause #42), and the field it derives from is right there.
 */

import type { OrderDocument } from "../schemas/firestore";

/** The subset actually read, so callers need not hold a whole order. */
export interface CourierBlockBearing {
  courierBlock?: OrderDocument["courierBlock"];
  shippingDate?: Date | null;
}

/**
 * True while a courier booking we attempted is still unresolved.
 *
 * 🛑 A block is CLEARED by the parcel actually going out, not by anything
 * clearing the field. So a `shippingDate` wins over a stale `courierBlock`:
 * if the seller gave up waiting and posted it themselves, the order is
 * dispatched and the block is history, even if nobody deleted it. Reading the
 * field alone would pause the dispatch clock forever on an order that had in
 * fact shipped.
 */
export function hasOpenCourierBlock(order: CourierBlockBearing): boolean {
  if (!order.courierBlock) return false;
  return !order.shippingDate;
}
