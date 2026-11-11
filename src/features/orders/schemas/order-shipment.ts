/**
 * Outbound shipments — the parcels an order actually goes out in.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 WHY THIS EXISTS: ONE ORDER COULD ONLY EVER BE ONE PARCEL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Dispatch lived as flat fields on the order — one `trackingNumber`, one
 * `shippingCarrier`, one `deliveryDate`. A seller shipping half an order today
 * and the rest tomorrow had nowhere to say so, and multi-parcel was modelled by
 * splitting into multiple ORDERS (`order-splitter.ts`), which splits per SELLER
 * and cannot express one seller splitting their own lines.
 *
 * Owner, 2026-11-11: *"he ships A1, B1 and C1 together in shipment 1 but forgot
 * to ship A's 2nd item, so he has to ship it again as a new shipment on the
 * A2, which they have to update on their shipments dashboard."*
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 CONTENTS ARE `{ lineId, quantity }` — NOT AN ARRAY OF IDS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * An `itemIds[]` cannot say *which of the two A units* went in which parcel.
 * That matters because a per-item dispute is quantity-scoped — *"1 of my 2
 * never arrived"* — and is only adjudicable if the parcels recorded the split.
 * The dispute side and this side have to use the same scoping or no claim can
 * be settled against the evidence.
 *
 * ⚠ The same reasoning as `OrderDocumentItem.lineId`: the line is the subject,
 * and here it is a line *and a count*.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠ NAME COLLISION — READ BEFORE ADDING ANYTHING NEAR THIS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `features/shipments/` already exists and is **inbound procurement** —
 * `procurementShipments`, `shipmentLots`, `shipmentItems`. Its `ShipmentItem`
 * carries `shipmentId`/`lotId` and has **no `orderId` at all**. It is a
 * different feature that happens to share an English word. Do not extend it,
 * and do not reuse its constants: this collection is `orderShipments`.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const ORDER_SHIPMENT_COLLECTION = "orderShipments" as const;
export const ORDER_SHIPMENT_ID_PREFIX = "oship-" as const;

/**
 * Where a parcel has got to.
 *
 * 🛑 A state MACHINE, so these stay code rather than config — they drive
 * transitions, the seller's work queue and the dispute window. An operator
 * inventing a status produces a parcel nothing can move, which is the line
 * this project's own rule draws: *the machinery is code, the choice is config*.
 *
 * ⚠ `lost` is deliberately distinct from `returned`. A parcel the courier
 * cannot find and one the courier gave back are different facts with different
 * remedies, and collapsing them is how a seller gets blamed for an RTO.
 */
export const ORDER_SHIPMENT_STATUS = [
  "pending",
  "in_transit",
  "delivered",
  "returned",
  "lost",
] as const;

export type OrderShipmentStatus = (typeof ORDER_SHIPMENT_STATUS)[number];

/**
 * One line, and HOW MANY of it, in this parcel.
 *
 * ⚠ `lineId` and not `productId` — two bundle rows can carry the same product
 * and a parcel has to be able to name one of them. Historical orders have no
 * `lineId`; readers resolve `lineId ?? productId`, same as `selectOrderLines`.
 */
export interface OrderShipmentLine {
  lineId: string;
  /** 🛑 Units of that line IN THIS PARCEL — never the ordered quantity. */
  quantity: number;
}

export interface OrderShipmentDocument extends BaseDocument {
  orderId: string;
  /**
   * Denormalised so the seller's dashboard and the admin queue can list
   * parcels without joining through the order — the same reasoning
   * `protectionClaims.storeId` already carries.
   */
  storeId?: string;
  contents: OrderShipmentLine[];
  status: OrderShipmentStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  /**
   * 🛑 PER PARCEL, and this is the field the whole dispute model needs.
   *
   * An item's dispute window is derived from **its own parcel's** delivery
   * date. With one flat `deliveryDate` per order, two items delivered a week
   * apart got the same deadline — so a per-item window was not merely
   * unimplemented, it was unrepresentable.
   */
  deliveredAt?: Date;
  estimatedDeliveryAt?: Date;
  /** Free text from the seller — "second parcel, the backordered unit". */
  note?: string;
}

export const ORDER_SHIPMENT_INDEXED_FIELDS: string[] = ["orderId", "storeId", "status"];

/** How many units of `lineId` this set of parcels accounts for. */
export function shippedQuantityFor(
  shipments: readonly Pick<OrderShipmentDocument, "contents">[],
  lineId: string,
): number {
  let n = 0;
  for (const s of shipments) {
    for (const c of s.contents ?? []) {
      if (c.lineId === lineId) n += c.quantity;
    }
  }
  return n;
}

export interface LineFulfilment {
  lineId: string;
  ordered: number;
  cancelled: number;
  shipped: number;
  /** Still owed to the buyer. Never negative — see `oversold` for the error case. */
  owed: number;
  /** 🛑 True when more was shipped than was ever owed. A data error, not a state. */
  oversold: boolean;
}

/**
 * What each line still owes, across every parcel.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 THE INVARIANT: `shipped + cancelled ≤ ordered`, PER LINE
 * ────────────────────────────────────────────────────────────────────────────
 *
 * This is the owner's *"he has to properly say which ones were done and which
 * didn't"* expressed as arithmetic. An order cannot be marked fully dispatched
 * while any line still owes units, and a line in no parcel is precisely the
 * state that makes a refund argument unresolvable — the seller says it went,
 * the buyer says it did not, and nothing recorded either.
 *
 * ⚠ `cancelled` is subtracted because `OrderDocumentItem.cancelledQuantity`
 * already exists and a cancelled unit is not owed. Forgetting it would leave
 * every partially-cancelled order permanently "incomplete" and un-dispatchable.
 *
 * 🛑 `oversold` is reported rather than clamped. More shipped than ordered is a
 * data error — a double-entered parcel, or a line edited after dispatch — and
 * silently flooring it to zero would hide the one case a human must look at.
 * `owed` still floors, so callers that only gate on "is anything owed" behave
 * sanely either way.
 */
export function lineFulfilment(
  items: readonly { lineId?: string; productId: string; quantity: number; cancelledQuantity?: number }[],
  shipments: readonly Pick<OrderShipmentDocument, "contents">[],
): LineFulfilment[] {
  return items.map((item) => {
    const lineId = item.lineId ?? item.productId;
    const ordered = item.quantity;
    const cancelled = item.cancelledQuantity ?? 0;
    const shipped = shippedQuantityFor(shipments, lineId);
    const remaining = ordered - cancelled - shipped;
    return {
      lineId,
      ordered,
      cancelled,
      shipped,
      owed: Math.max(0, remaining),
      oversold: remaining < 0,
    };
  });
}

/**
 * Is every line accounted for — nothing still owed, nothing oversold?
 *
 * ⚠ The gate on "mark this order dispatched". Refusing here is what turns
 * *"did A's second unit ever ship?"* from an argument into a fact the system
 * already knows.
 */
export function isFullyShipped(
  items: readonly { lineId?: string; productId: string; quantity: number; cancelledQuantity?: number }[],
  shipments: readonly Pick<OrderShipmentDocument, "contents">[],
): boolean {
  const rows = lineFulfilment(items, shipments);
  return rows.length > 0 && rows.every((r) => r.owed === 0 && !r.oversold);
}

/**
 * Why a proposed parcel cannot be accepted, or `null` when it can.
 *
 * ⚠ Validates against what is ALREADY shipped, so two parcels cannot each
 * claim the same unit. A seller correcting a mistake deletes the wrong parcel
 * rather than shipping the unit twice.
 */
export function validateShipmentContents(
  items: readonly { lineId?: string; productId: string; quantity: number; cancelledQuantity?: number }[],
  existing: readonly Pick<OrderShipmentDocument, "contents">[],
  proposed: readonly OrderShipmentLine[],
): string | null {
  if (!proposed.length) return "A parcel must contain at least one item.";

  const byLine = new Map(lineFulfilment(items, existing).map((r) => [r.lineId, r]));
  const seen = new Set<string>();

  for (const line of proposed) {
    if (seen.has(line.lineId)) {
      // Two entries for one line in a single parcel — almost certainly a UI
      // bug, and silently summing them would hide it.
      return `This parcel lists the same item twice (${line.lineId}).`;
    }
    seen.add(line.lineId);

    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return `Quantity for ${line.lineId} must be a whole number of at least 1.`;
    }
    const row = byLine.get(line.lineId);
    if (!row) return `${line.lineId} is not part of this order.`;
    if (line.quantity > row.owed) {
      return row.owed === 0
        ? `${line.lineId} has already been shipped in full.`
        : `Only ${row.owed} of ${line.lineId} ${row.owed === 1 ? "is" : "are"} still to ship.`;
    }
  }
  return null;
}
