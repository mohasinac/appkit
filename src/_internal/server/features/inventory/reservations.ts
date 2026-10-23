/**
 * Hold stock for something that is not an order yet.
 *
 * ## What this is for
 *
 * The plan's Part 6 (shared purchase) names this "the largest hidden cost",
 * and it is the only one of its three prerequisites that had NOTHING behind
 * it. See the schema file for why the existing order-keyed mechanism cannot
 * serve a multi-day arrangement.
 *
 * ## 🛑 Every function here moves the row and the counter TOGETHER
 *
 * `availableQuantity` is what a buyer can take; the gap between it and
 * `stockQuantity` is the outstanding hold (`resolveStockResync`'s own words).
 * A reservation row written without the decrement holds nothing at all, and a
 * decrement written without a row is a hold nothing can expire — so both
 * happen inside ONE `runTransaction`, with the product read inside it so two
 * concurrent reserves cannot both see the same `availableQuantity`.
 *
 * ## 🛑 Firestore wants every READ before every WRITE
 *
 * So `endReservation` reads the reservation AND the product up front, even
 * on the consume path where the product read is thrown away. The natural
 * shape — read the reservation, decide, then read the product — throws
 * `Firestore transactions require all reads to be executed before all
 * writes`, and only at runtime, which is exactly the class of fault
 * `restoreStockForOrder`'s header already warns about one directory over.
 *
 * ## Why it writes `availableQuantity` EXPLICITLY
 *
 * `ProductRepository.update`'s `resolveStockResync` returns `{}` the moment a
 * write names `availableQuantity` — deliberately, so the checkout decrement,
 * the stock-restore job and `updateAvailableQuantity` stay authoritative over
 * their own number. This is a fourth member of that set and takes the same
 * deal: it is the one deciding the value, so the resync must keep its hands
 * off it. (These writes go through the raw collection rather than the
 * repository for the same reason `deriveTaxonomy` reads categories through
 * `this.db` — a transaction needs the ref, not a repository method.)
 */

import { getAdminDb } from "../../../../providers/db-firebase";
import { ValidationError } from "../../../../errors/validation-error";
import { NotFoundError } from "../../../../errors/not-found-error";
import { ConflictError } from "../../../../errors/conflict-error";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import { STOCK_RESERVATION_FIELDS } from "../../../../constants/field-names";
import {
  RESERVATION_DEFAULT_TTL_HOURS,
  RESERVATION_MAX_TTL_HOURS,
  STOCK_RESERVATION_COLLECTION,
  type ReservationHolderKind,
  type StockReservationDocument,
} from "../../../../features/inventory/schemas/stock-reservation";

export interface ReserveStockInput {
  productId: string;
  quantity: number;
  holderKind: ReservationHolderKind;
  holderId: string;
  createdBy: string;
  /** Defaults to `RESERVATION_DEFAULT_TTL_HOURS`; capped at the 30-day ceiling. */
  ttlHours?: number;
}

/**
 * Take a hold. Returns the reservation id.
 *
 * 🛑 Refuses rather than over-reserving. A seller's stock is a real number of
 * real objects, so "reserve 5, only 3 left" is a **409** — the request is
 * well-formed and the world moved, which is the same distinction the lottery
 * config write makes for a slot somebody has already pulled.
 */
export async function reserveStock(input: ReserveStockInput): Promise<string> {
  const quantity = Math.floor(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new ValidationError("Reserve at least one unit.");
  }

  const ttlHours = clampTtl(input.ttlHours);
  const db = getAdminDb();
  const productRef = db.collection(PRODUCT_COLLECTION).doc(input.productId);
  const reservationRef = db.collection(STOCK_RESERVATION_COLLECTION).doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(productRef);
    if (!snap.exists) throw new NotFoundError("Product not found.");

    const available = readAvailable(snap.data());
    if (available < quantity) {
      throw new ConflictError(
        `Only ${Math.max(0, available)} left — cannot hold ${quantity}.`,
      );
    }

    const now = new Date();
    const doc: Omit<StockReservationDocument, "id"> = {
      productId: input.productId,
      quantity,
      holderKind: input.holderKind,
      holderId: input.holderId,
      createdBy: input.createdBy,
      status: "held",
      expiresAt: new Date(now.getTime() + ttlHours * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    };

    tx.set(reservationRef, doc);
    tx.update(productRef, { availableQuantity: available - quantity, updatedAt: now });
  });

  return reservationRef.id;
}

/**
 * End a hold and PUT THE UNITS BACK — the holder changed their mind, an admin
 * took it back, or the sweep found it expired.
 */
export async function releaseReservation(
  reservationId: string,
  opts: { status?: "released" | "expired"; reason?: string } = {},
): Promise<void> {
  await endReservation(reservationId, opts.status ?? "released", true, opts.reason);
}

/**
 * End a hold and KEEP the units off the shelf — the arrangement completed and
 * an order now owns them.
 *
 * 🛑 This is the one path that must NOT restore. The order's own decrement is
 * what holds the units from here, so restoring first would hand the same
 * stock to the next buyer for the moment between the two writes — and if the
 * order write never lands, restoring would have been right. That race is why
 * the caller should place the order and consume in one flow it can reason
 * about; this function exists so it can do that rather than calling release
 * and hoping.
 */
export async function consumeReservation(reservationId: string): Promise<void> {
  await endReservation(reservationId, "consumed", false);
}

/**
 * Release every hold a holder owns. Used when a shared purchase is cancelled
 * or abandoned — the arrangement knows its own id, and should not have to
 * remember which reservations it took.
 */
export async function releaseReservationsForHolder(
  holderKind: ReservationHolderKind,
  holderId: string,
  reason?: string,
): Promise<number> {
  const db = getAdminDb();
  const snap = await db
    .collection(STOCK_RESERVATION_COLLECTION)
    .where(STOCK_RESERVATION_FIELDS.HOLDER_KIND, "==", holderKind)
    .where(STOCK_RESERVATION_FIELDS.HOLDER_ID, "==", holderId)
    .where(STOCK_RESERVATION_FIELDS.STATUS, "==", "held")
    .get();

  let released = 0;
  for (const doc of snap.docs) {
    try {
      await endReservation(doc.id, "released", true, reason);
      released += 1;
    } catch (error) {
      const normalized = normalizeError(error);
      /*
       * One bad row must not strand the rest. A holder with eight holds and
       * one deleted product should still get the other seven back.
       */
      serverLogger.warn("releaseReservationsForHolder: skipped one", {
        reservationId: doc.id,
        message: normalized.message,
      });
    }
  }
  return released;
}

/**
 * The sweep. Expire every hold past its `expiresAt` and restore its units.
 *
 * 🛑 Bounded, and the bound is REPORTED. A silent cap reads as "nothing left
 * to expire" on the one run where it mattered — the same lie a truncated
 * recount tells (Root Cause #102).
 */
export async function expireDueReservations(
  limit = 200,
): Promise<{ scanned: number; expired: number; truncated: boolean }> {
  const db = getAdminDb();
  const snap = await db
    .collection(STOCK_RESERVATION_COLLECTION)
    .where(STOCK_RESERVATION_FIELDS.STATUS, "==", "held")
    .where(STOCK_RESERVATION_FIELDS.EXPIRES_AT, "<=", new Date())
    .orderBy(STOCK_RESERVATION_FIELDS.EXPIRES_AT, "asc")
    .limit(limit)
    .get();

  let expired = 0;
  for (const doc of snap.docs) {
    try {
      await endReservation(doc.id, "expired", true, "TTL elapsed");
      expired += 1;
    } catch (error) {
      const normalized = normalizeError(error);
      serverLogger.warn("expireDueReservations: skipped one", {
        reservationId: doc.id,
        message: normalized.message,
      });
    }
  }

  return { scanned: snap.size, expired, truncated: snap.size === limit };
}

/** Units currently held on a product, for an admin explaining an unbuyable listing. */
export async function activeReservationsForProduct(
  productId: string,
): Promise<StockReservationDocument[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(STOCK_RESERVATION_COLLECTION)
    .where(STOCK_RESERVATION_FIELDS.PRODUCT_ID, "==", productId)
    .where(STOCK_RESERVATION_FIELDS.STATUS, "==", "held")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StockReservationDocument);
}

function clampTtl(hours: number | undefined): number {
  if (hours === undefined) return RESERVATION_DEFAULT_TTL_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new ValidationError("A hold must last longer than zero hours.");
  }
  return Math.min(hours, RESERVATION_MAX_TTL_HOURS);
}

/**
 * 🛑 `?? stockQuantity` and NOT `?? 0`.
 *
 * `availableQuantity` is optional on rows written before it existed, and
 * treating an absent value as zero would refuse every reservation on a
 * fully-stocked legacy listing — a sold-out answer for a product that has
 * stock, which reads as a stock bug rather than a schema gap.
 */
function readAvailable(data: unknown): number {
  const product = (data ?? {}) as { availableQuantity?: number; stockQuantity?: number };
  return product.availableQuantity ?? product.stockQuantity ?? 0;
}

/**
 * The one write path. Every transition goes through here so the
 * row-and-counter pairing cannot be forgotten by a new caller — the same
 * argument `deriveLinePrice` makes inside the cart repository.
 */
async function endReservation(
  reservationId: string,
  status: "consumed" | "released" | "expired",
  restore: boolean,
  reason?: string,
): Promise<void> {
  const db = getAdminDb();
  const reservationRef = db.collection(STOCK_RESERVATION_COLLECTION).doc(reservationId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reservationRef);
    if (!snap.exists) throw new NotFoundError("Reservation not found.");

    const reservation = snap.data() as StockReservationDocument;
    /*
     * 🛑 Idempotent by STATUS, not by a flag. The sweep and a manual release
     * can reach the same row in the same second; a second restore would
     * invent units that do not exist, which is worse than a hold that lingers
     * one sweep longer.
     */
    if (reservation.status !== "held") return;

    /*
     * Read the product BEFORE the first write, even when `restore` is false
     * and the value is discarded — see this file's header. One wasted read on
     * the consume path buys a function whose transaction shape cannot be
     * broken by a later edit reordering the branches.
     */
    const productRef = db.collection(PRODUCT_COLLECTION).doc(reservation.productId);
    const productSnap = restore ? await tx.get(productRef) : null;

    const now = new Date();
    tx.update(reservationRef, {
      status,
      endedAt: now,
      updatedAt: now,
      ...(reason ? { endedReason: reason } : {}),
    });

    if (!restore) return;

    if (!productSnap?.exists) {
      /*
       * The product is gone, so there is no counter to restore — but the row
       * still has to close, or the sweep retries it forever. Recorded rather
       * than thrown: an orphaned hold is a data problem, not a reason to fail
       * the release of the others beside it.
       */
      serverLogger.warn("endReservation: product missing, counter not restored", {
        reservationId,
        productId: reservation.productId,
      });
      return;
    }

    const product = productSnap.data() as { availableQuantity?: number; stockQuantity?: number };
    const available = readAvailable(product);
    const stock = product.stockQuantity ?? available;
    /*
     * 🛑 Clamped at `stockQuantity`. A seller who lowered stock while units
     * were held would otherwise get an `availableQuantity` ABOVE their own
     * stock on release — a listing offering more than exists, which is the
     * one direction a stock bug must never go.
     */
    tx.update(productRef, {
      availableQuantity: Math.min(stock, available + reservation.quantity),
      updatedAt: now,
    });
  });
}
