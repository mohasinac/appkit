/**
 * A HOLD on stock that is not yet an order.
 *
 * ## 🛑 Why this has to exist before S5b (Part 6)
 *
 * The plan calls this "the largest hidden cost" of the shared-purchase work,
 * and the reason is that today there is no way to hold stock at all. The only
 * mechanism is: `onOrderCreate` decrements `availableQuantity`, and
 * `pendingOrderTimeout` puts it back if the buyer does not pay inside the
 * 15-minute window. Both are keyed to an ORDER.
 *
 * A shared purchase runs for DAYS while co-buyers pay. With no primitive,
 * either the coordinator places an order up front — which starts a 15-minute
 * payment clock on a multi-day agreement — or nothing is held, and the item is
 * sold out from under the arrangement by an ordinary buyer who happened to
 * check out first. Neither is a product.
 *
 * ## The invariant, and where it already lives
 *
 * `products.repository.ts` already states it:
 *
 *     reserved = stockQuantity - availableQuantity
 *
 * …as the comment on `resolveStockResync` puts it, *"the difference between
 * the two IS the outstanding reservation"*. This collection does not invent a
 * new idea; it makes that difference ADDRESSABLE — every held unit gets a row
 * saying who holds it and until when, instead of being an anonymous gap
 * between two numbers that only an order can close.
 *
 * 🛑 So a reservation MUST move `availableQuantity` in the same transaction
 * that writes its row. A row without the decrement holds nothing; a decrement
 * without a row is the anonymous gap again, and nothing can expire it.
 *
 * ## Why a TTL rather than a cancel button
 *
 * A hold with no expiry is a leak: the holder closes the tab, and those units
 * are off the shelf until a human notices. `expiresAt` means the worst case is
 * bounded by the sweep interval, and the seller never has to ask anyone to
 * release anything.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const STOCK_RESERVATION_COLLECTION = "stockReservations";

/**
 * Who is holding, and therefore what releases it.
 *
 * 🛑 A plain `holderId: string` was the first draft and it is wrong: the sweep
 * and the release path both need to know WHICH system owns the hold before
 * they can decide whether it is still legitimate. A discriminator makes
 * "release every hold belonging to arrangement X" expressible; an opaque id
 * makes it a string-prefix convention nobody enforces.
 */
export const RESERVATION_HOLDER_KINDS = ["shared-purchase", "manual"] as const;
export type ReservationHolderKind = (typeof RESERVATION_HOLDER_KINDS)[number];

/**
 * 🛑 `cart` and `order` are deliberately NOT holder kinds.
 *
 * A cart holds nothing today — adding an item does not decrement anything —
 * and making it hold would silently turn every abandoned cart into held
 * stock. An order already has its own hold through `onOrderCreate` +
 * `pendingOrderTimeout`; a second mechanism over the same units would
 * double-decrement, which is exactly the class of bug `resolveStockResync`'s
 * delta exists to prevent. Add a kind only when the thing that owns it also
 * owns its release.
 */

export const RESERVATION_STATUSES = ["held", "consumed", "released", "expired"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface StockReservationDocument extends BaseDocument {
  productId: string;
  /** Denormalised so the sweep can restore stock without reading the product first. */
  quantity: number;
  holderKind: ReservationHolderKind;
  /** The arrangement / manual-hold id. Scoped by `holderKind`, never globally unique. */
  holderId: string;
  /** Who asked for it — an Auth uid, for the audit trail and for admin release. */
  createdBy: string;
  status: ReservationStatus;
  /**
   * 🛑 The whole point. A hold with no expiry is a leak: the holder closes the
   * tab and the units are gone until a human notices.
   */
  expiresAt: Date;
  /**
   * Set when the hold ENDS, whichever way it ended. One field rather than
   * three (`consumedAt`/`releasedAt`/`expiredAt`) because `status` already
   * says which, and three nullable dates is three chances for the one that
   * matters to be the one nobody set.
   */
  endedAt?: Date;
  /** Free text on a manual release — why an admin took the hold back. */
  endedReason?: string;
}

/** Default hold, when a caller names none. */
export const RESERVATION_DEFAULT_TTL_HOURS = 72;

/**
 * 🛑 A ceiling, and it is load-bearing rather than defensive.
 *
 * A caller may pass any TTL it likes, which makes "hold this for a year" one
 * typo away — and a year-long hold is indistinguishable from permanently
 * deleted stock, because nothing in the UI shows a seller why their own
 * product is unbuyable. 30 days is longer than any agreement window Part 6
 * contemplates and short enough that a mistake self-heals.
 */
export const RESERVATION_MAX_TTL_HOURS = 24 * 30;

/** A reservation is only holding stock while it is `held` and unexpired. */
export function isReservationActive(
  reservation: Pick<StockReservationDocument, "status" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (reservation.status !== "held") return false;
  const expires = toDate(reservation.expiresAt);
  return expires !== null && expires.getTime() > now.getTime();
}

/**
 * Firestore hands back a `Timestamp`, a `Date` or an ISO string depending on
 * the path a document took to get here, and the adapter that normalises those
 * is not reachable from this file. Returning `null` on anything unparseable is
 * the honest answer — and callers treat an unparseable expiry as NOT active,
 * so the failure mode is a hold released early rather than one held forever.
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export { toDate as reservationExpiryDate };
