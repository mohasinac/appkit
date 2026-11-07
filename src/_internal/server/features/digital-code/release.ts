/**
 * Manual release — the deferred-fulfilment half of `digital-code` (1.37).
 *
 * ## Why this is a SEPARATE module from `pool.ts`
 *
 * `pool.ts` owns the pool: what is in it, who may add to it, and the counters
 * derived from it. This owns one ORDER's journey through a fulfilment that
 * waits for a person. They are different lifetimes — a pool outlives every
 * order against it — and keeping them apart is what stops the release path
 * growing its own notion of "claimed" beside the pool's.
 *
 * ## The feature, and the defect it closes
 *
 * `digitalCode.codeDeliveryMethod` is seller-settable (`"auto-claim" |
 * "manual-email"`), is on the seller form, is validated by the request schema,
 * and two seeded products already carry `"manual-email"` — but **no fulfilment
 * path had ever read it.** Checkout decided with
 * `listingType === "digital-code"` and auto-claimed a code regardless, so a
 * seller who chose manual release got instant issue anyway.
 *
 * The instant path is untouched and must keep working: it already works, and
 * it stays the behaviour for every `"auto-claim"` listing. This is the second
 * path ALONGSIDE it, selected by `fulfilmentModeFor()` in the order workflow
 * registry — a capability plus a per-listing opt-in, never a type comparison.
 *
 * @tag domain:products
 * @tag layer:server-feature
 * @tag access:server-only
 * @tag sideEffects:firestore-write
 */

import { getAdminDb } from "../../../../providers/db-firebase/admin";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { ValidationError } from "../../../../errors";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import {
  PRODUCT_COLLECTION,
  PRODUCT_CODES_SUBCOLLECTION,
} from "../../../../features/products/schemas/firestore";
import { recountPool } from "./pool";

const ORDER_COLLECTION = "orders";

/**
 * Mark a paid line as awaiting a human release.
 *
 * 🛑 The state has to be WRITTEN, not inferred from "no code claimed yet".
 * Absence is ambiguous: a line with no claimed entry looks the same whether
 * the seller has yet to release it or the pool was simply empty and the claim
 * silently failed — which is exactly the failure mode this feature's pool
 * previously had (`claimDigitalCode: code pool exhausted`, logged and
 * swallowed, order completed normally). One of those is a normal state the
 * buyer should be told about; the other is an incident. They must not look
 * alike.
 *
 * Idempotent: re-running on an already-`released` line leaves it alone, so a
 * retried checkout cannot walk a delivered line backwards.
 */
export async function markAwaitingRelease(
  orderId: string,
  productId: string,
): Promise<void> {
  const db = getAdminDb();
  const orderRef = db.collection(ORDER_COLLECTION).doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return;
    const items = (snap.data()?.items ?? []) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return;
    let touched = false;
    const next = items.map((it) => {
      if (it.productId !== productId) return it;
      if (it.fulfilmentState === "released") return it;
      if (it.fulfilmentState === "pending_release") return it;
      touched = true;
      return { ...it, fulfilmentState: "pending_release" };
    });
    if (!touched) return;
    tx.update(orderRef, { items: next, updatedAt: new Date() });
  });
}

export interface ReleaseDigitalContentResult {
  kind: "released" | "already_released" | "pool_exhausted" | "not_pending";
  available?: number;
  total?: number;
}

/**
 * Release a manual-fulfilment line: claim one pool entry for the order and
 * flip the line to `released`.
 *
 * ## 🛑 Deliberately the SAME claim semantics as the instant path
 *
 * It takes one `available` entry under a transaction that re-reads the entry's
 * status, so two staff pressing Release at once cannot hand out two codes for
 * one line. The only difference from auto-claim is WHO triggers it and WHEN —
 * not what happens. Two code paths that claim differently would eventually
 * disagree about what "claimed" means, and the pool is the one place that
 * cannot afford that.
 *
 * ## Why it refuses rather than fixes
 *
 * - **`not_pending`** — the line was never marked awaiting release, so this is
 *   not a manual-fulfilment line and releasing it would deliver content on a
 *   path with no record of a decision. The caller resolves the mode through
 *   `fulfilmentModeFor()`; this guards against reaching it anyway.
 * - **`pool_exhausted`** — reported, never silently swallowed. The old
 *   auto-claim logged a warning and returned, leaving a completed order with
 *   nothing delivered. A seller pressing Release must be TOLD there is nothing
 *   to release, because they are the only person who can add one.
 *
 * `releasedBy` is recorded because this is a human act on someone else's paid
 * order — the one thing the instant path has no equivalent of.
 */
export async function releaseDigitalContentForOrder(
  orderId: string,
  productId: string,
  actorUid: string,
): Promise<ReleaseDigitalContentResult> {
  const db = getAdminDb();
  const orderRef = db.collection(ORDER_COLLECTION).doc(orderId);
  const codesRef = db
    .collection(PRODUCT_COLLECTION)
    .doc(productId)
    .collection(PRODUCT_CODES_SUBCOLLECTION);

  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new ValidationError("Order not found.");
  const items = (orderSnap.data()?.items ?? []) as Array<Record<string, unknown>>;
  const line = items.find((it) => it.productId === productId);
  if (!line) throw new ValidationError("That listing is not on this order.");
  if (line.fulfilmentState === "released") return { kind: "already_released" };
  if (line.fulfilmentState !== "pending_release") return { kind: "not_pending" };

  const available = await codesRef
    .where(ORDER_FIELDS.STATUS, "==", "available")
    .limit(1)
    .get();
  if (available.empty) {
    serverLogger.warn("releaseDigitalContent: pool exhausted", { productId, orderId });
    return { kind: "pool_exhausted" };
  }
  const codeRef = available.docs[0].ref;

  const now = new Date();
  let released = false;
  await db.runTransaction(async (tx) => {
    const [latestCode, latestOrder] = await Promise.all([
      tx.get(codeRef),
      tx.get(orderRef),
    ]);
    // Re-read both: the entry may have been claimed by a concurrent release,
    // and the line may have been released by one.
    if (!latestCode.exists || latestCode.data()?.status !== "available") return;
    const latestItems = (latestOrder.data()?.items ?? []) as Array<Record<string, unknown>>;
    const latestLine = latestItems.find((it) => it.productId === productId);
    if (!latestLine || latestLine.fulfilmentState !== "pending_release") return;

    tx.update(codeRef, {
      status: "claimed",
      orderId,
      claimedAt: now,
      updatedAt: now,
    });
    tx.update(orderRef, {
      items: latestItems.map((it) =>
        it.productId === productId
          ? { ...it, fulfilmentState: "released", releasedAt: now, releasedBy: actorUid }
          : it,
      ),
      updatedAt: now,
    });
    released = true;
  });

  if (!released) return { kind: "already_released" };

  // Same non-fatal recount as the instant path — a failed count must never
  // undo a release the buyer can now act on.
  const counts = await recountPool(productId).catch((e) => {
    void normalizeError(e);
    serverLogger.error("releaseDigitalContent: recount failed", {
      error: normalizeError(e).message,
      productId,
    });
    return undefined;
  });

  return { kind: "released", ...(counts ?? {}) };
}
