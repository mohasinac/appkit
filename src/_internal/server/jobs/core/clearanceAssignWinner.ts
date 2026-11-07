import crypto from "node:crypto";
import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../runtime/types";
import type { ProductDocument, PrizeDrawItem } from "../../../../features/products/schemas/firestore";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import {
  ADMIN_AUDIT_LOG_COLLECTION,
  AdminAuditActionValues,
} from "../../../../features/audit-log/schemas/firestore";

const PRODUCT_COLLECTION = "products";
const ORDER_COLLECTION = "orders";

/**
 * Sentinel actor for the allocation record.
 *
 * 🛑 Deliberately NOT a real uid, and the absence is the evidence. The pick is
 * a rule with an RNG attached, not anybody's decision — so if an allocation
 * row ever carried a human actor, THAT would be the finding. Follows the
 * existing `"system:points-expiry"` sentinel convention.
 */
const ALLOCATION_ACTOR_UID = "system:allocation";

export interface AssignClearanceWinnerResult {
  kind: "revealed" | "already_revealed" | "pool_exhausted" | "not_eligible";
  prizeWon?: OrderDocument["prizeWon"];
  /**
   * The `adminAuditLog` row id recording how the item was chosen. Present on
   * a fresh `revealed`; absent on `already_revealed` for an order allocated
   * before this record existed.
   */
  allocationId?: string;
}

/**
 * The single place a clearance winner is ever picked. Called by every
 * trigger point (payment-confirmed for "instant" mode, sellout-detection,
 * and the expiry sweep for "scheduled" mode) — never call the underlying
 * transaction logic anywhere else.
 *
 * Preserves the exact `crypto.randomInt` rejection-sampled fairness RNG that
 * buyers are shown a public GitHub source link for (product.prizeGithubFileUrl)
 * — do not change the selection algorithm.
 *
 * ## 🛑 The allocation is an IMMUTABLE TRACE, not a log line
 *
 * Owner's anti-fraud framing: *"it is randomly generated so we have a trace —
 * no seller can say you got a trash item when in reality you got the prize,
 * because it was not transparent."*
 *
 * `ctx.logger.info` did not deliver that. Logs rotate, are not queryable per
 * order, and are not something a buyer or an adjudicator can be SHOWN. So the
 * pick is now written as an `adminAuditLog` row **inside this same
 * transaction**, and the row's id is stored on the order line as
 * `allocationId`.
 *
 * Three properties make it a trace rather than a note, and all three are
 * load-bearing:
 *
 *  1. **Atomic.** `tx.create` on the audit row commits with the product
 *     update and the order update or not at all. A best-effort write after
 *     the transaction could leave an allocated order with no record of why it
 *     got what it got — the one state this must not be able to reach. It also
 *     cannot produce the inverse (a record of an allocation that did not
 *     happen), which would be worse: it would read as evidence.
 *  2. **Unforgeable by the interested party.** `firestore.rules` is a blanket
 *     deny-all, so `adminAuditLog` is admin-SDK-only, and no code path in the
 *     repo updates a row in it. A seller has no write and no edit.
 *  3. **Attributed to nobody.** `actorUid` is a system sentinel, so the record
 *     asserts that no human chose.
 *
 * `tx.create` (not `tx.set`) is also deliberate: it FAILS if the document
 * already exists, so a retried transaction can never overwrite an existing
 * allocation record. The pre-existing `order.prizeWon` idempotency guard
 * already returns before we reach here on a second run, and the fresh
 * auto-id makes a collision impossible anyway — belt and braces on the one
 * write that must never be silently replaced.
 */
export async function assignClearanceWinner(
  ctx: JobContext,
  args: { orderId: string; productId: string },
): Promise<AssignClearanceWinnerResult> {
  // The `FEATURE_PRIZE_DRAWS` gate here was deleted 2026-10-19 with the other
  // four readers — see the header of `assignSpinPrize.ts`. This one was the
  // worst-shaped of them: it returned `kind: "not_eligible"`, which every
  // caller treats as "this order does not win anything", so with the env var
  // unset a paid clearance entry was silently recorded as a non-winner.
  const { orderId, productId } = args;
  const orderRef = ctx.db.collection(ORDER_COLLECTION).doc(orderId);
  const productRef = ctx.db.collection(PRODUCT_COLLECTION).doc(productId);

  const result = await ctx.db.runTransaction(async (tx) => {
    const [productSnap, orderSnap] = await Promise.all([
      tx.get(productRef),
      tx.get(orderRef),
    ]);
    if (!productSnap.exists || !orderSnap.exists) {
      return { kind: "not_eligible" as const };
    }

    const product = productSnap.data() as ProductDocument;
    const order = orderSnap.data() as OrderDocument;

    // Idempotent — a winner was already assigned to this order.
    if (order.prizeWon) {
      return { kind: "already_revealed" as const, prizeWon: order.prizeWon };
    }

    if (
      order.paymentStatus !== "paid" ||
      order.status === "cancelled" ||
      order.status === "refunded"
    ) {
      return { kind: "not_eligible" as const };
    }

    const items: PrizeDrawItem[] = Array.isArray(product.prizeDrawItems)
      ? [...product.prizeDrawItems]
      : [];
    const unwonIndices: number[] = items
      .map((it, idx) => (it.isWon ? -1 : idx))
      .filter((idx) => idx >= 0);

    if (unwonIndices.length === 0) {
      // Defensive only — preflightChecks already blocks overselling past
      // prizeMaxEntries, so this should be unreachable outside a genuine
      // race between two concurrent checkouts. No auto-refund here (that
      // was the old buyer-claim-deadline behavior, now retired) — just
      // report it so the caller can log/notify.
      return { kind: "pool_exhausted" as const };
    }

    // crypto.randomInt is rejection-sampled and uniform — safe for fairness.
    const pickPosition = crypto.randomInt(0, unwonIndices.length);
    const pickIndex = unwonIndices[pickPosition];
    const winningItem = items[pickIndex];
    items[pickIndex] = { ...winningItem, isWon: true, wonByOrderId: orderId };

    tx.update(productRef, {
      prizeDrawItems: items,
      updatedAt: ctx.now,
    });

    /*
     * The audit ref is allocated BEFORE the order write, because the order
     * line stores its id. `.doc()` with no argument only mints an id locally
     * — no read, no round trip — so this is safe inside a transaction.
     */
    const allocationRef = ctx.db.collection(ADMIN_AUDIT_LOG_COLLECTION).doc();
    const allocationId = allocationRef.id;

    const prizeWon = {
      itemNumber: winningItem.itemNumber,
      title: winningItem.title,
      images: winningItem.images,
      wonAt: ctx.now,
      /*
       * Mirrored onto `prizeWon` as well as the line, because this is the
       * object every reveal UI already reads — a buyer looking at "what you
       * won" can be shown the record id without the page having to re-derive
       * which line it came from.
       */
      allocationId,
    };

    const orderItems = Array.isArray(order.items) ? [...order.items] : [];
    // "prize-draw" kept as a back-compat match for order items written
    // before the clearance rename.
    const revealedItems = orderItems.map((it) =>
      it.listingType === "clearance" || (it.listingType as string) === "prize-draw"
        ? {
            ...it,
            prizeRevealStatus: "revealed" as const,
            /*
             * `revealedAt` and `allocationId` land in the SAME write as the
             * reveal flag. The cancel gate reads the reveal state, so a reveal
             * recorded without its trace would be a window — however short —
             * in which an order is locked and nothing says why.
             */
            revealedAt: ctx.now,
            allocationId,
          }
        : it,
    );

    tx.update(orderRef, {
      prizeWon,
      ...(revealedItems.length > 0 ? { items: revealedItems } : {}),
      updatedAt: ctx.now,
    });

    /*
     * 🛑 The trace itself. `metadata` records WHAT was picked and FROM WHAT —
     * the pool size and the index are what make the claim checkable rather
     * than merely asserted, and `poolSize` is the denominator a fairness audit
     * needs. The winning item's identity is duplicated here on purpose: this
     * row has to stand alone as evidence even if the product's prize pool is
     * later edited, and it is the only copy a seller cannot touch.
     */
    tx.create(allocationRef, {
      actorUid: ALLOCATION_ACTOR_UID,
      actorName: "Platform allocation (RNG)",
      action: AdminAuditActionValues.ALLOCATION_RANDOM_ASSIGN,
      targetType: "orderItem",
      targetId: orderId,
      targetLabel: `${product.title ?? productId} — item #${winningItem.itemNumber}`,
      reason:
        "Server-side uniform random allocation (crypto.randomInt, rejection-sampled). No seller input.",
      metadata: {
        orderId,
        productId,
        itemNumber: winningItem.itemNumber,
        itemTitle: winningItem.title ?? null,
        /* The draw as it stood at the moment of the pick. */
        poolSize: items.length,
        unwonAtPick: unwonIndices.length,
        pickIndex,
        rng: "crypto.randomInt",
        revealedAt: ctx.now.toISOString(),
      },
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });

    return {
      kind: "revealed" as const,
      prizeWon,
      allocationId,
      userId: order.userId,
      productTitle: product.title,
    };
  });

  if (result.kind === "revealed") {
    ctx.logger.info("Prize-draw winner assigned", {
      orderId,
      productId,
      itemNumber: result.prizeWon.itemNumber,
      // The durable record's id, so a log line is a POINTER to the trace
      // rather than a substitute for it.
      allocationId: result.allocationId,
    });
    if (result.userId) {
      try {
        await sendNotification({
          userId: result.userId,
          type: "prize_won",
          priority: "high",
          title: "Your prize is ready!",
          message: `You won "${result.prizeWon.title}" in "${result.productTitle ?? "the draw"}" — check your order for details.`,
          relatedId: orderId,
          relatedType: "order",
          actionUrl: `/user/orders/view/${orderId}`,
        } as never);
      } catch (err) {
        void normalizeError(err);
        ctx.logger.warn("Prize-won notification failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { kind: "revealed", prizeWon: result.prizeWon };
  }

  if (result.kind === "pool_exhausted") {
    ctx.logger.warn("Prize-draw pool exhausted at assignment time", { orderId, productId });
  }

  return result;
}
