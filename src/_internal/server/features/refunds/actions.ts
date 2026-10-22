"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
/**
 * processRefundAction — append a refund event to an order.
 *
 * Supports two paths:
 *  - PhonePe: calls the payment provider's `refund()` method — order-keyed
 *    via `order.paymentId` (PhonePe's `merchantOrderId`), never a payment
 *    id — then records the phonepeRefundId on the event.
 *  - Manual: no payment-provider call; records manualTransactionId + optional
 *    proof document URL.
 *
 * Both paths require `confirmIrrevocable: true` from the caller to prevent
 * accidental use — callers must acknowledge the action is non-reversible.
 *
 * Setting `contestable` to false is a side-effect of `orderRepository.postRefundEvent`.
 */

/*
 * `createHash`, not `randomUUID` — see `idempotencyKey` on the input type. A
 * server-minted random id cannot be idempotent, which is what made a
 * double-clicked button issue two real gateway refunds (D2).
 */
import { createHash } from "crypto";
import { getProviders } from "../../../../contracts/registry";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import {
  refundCapacity,
  wouldBeFullRefund,
  MONEY_EPSILON,
} from "../../../shared/checkout/refundable-base";
import { REFUND_CLAIMS_COLLECTION } from "../../../../features/orders/schemas/firestore";
import { normalizeError } from "../../../../errors/normalize";
import { rupeesToPaise } from "../../../../core/money";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import { NotFoundError, ValidationError } from "../../../../errors";
import { serverLogger } from "../../../../monitoring";
import type { OrderRefundEvent, RefundType } from "../../../../features/orders/schemas";
import {
  isFinalSaleExempt,
  RETURN_REASON_LABEL,
  type ReturnReason,
} from "../../../shared/features/orders/return-reasons";
import { REFUND_COPY } from "../../../shared/features/orders/refund-copy";
import { applyRefundDeductionAction } from "../payouts/actions";
/* Phase 7c — the credit note. Swallows its own failures by design: see its 🛑. */
import { issueCreditNoteForRefund } from "../invoicing/credit-note";
import { getAdminDb } from "../../../../providers/db-firebase";
import {
  PRODUCT_COLLECTION,
  PRODUCT_CODES_SUBCOLLECTION,
} from "../../../../features/products/schemas/firestore";

type DigitalCodeItem = { productId: string; listingType?: string };

/**
 * SB-UNI-N — block the refund if any of the order's digital codes has already
 * been claimed (revealed). Throws ValidationError on the first claimed code.
 */
async function assertDigitalCodesNotClaimed(
  orderId: string,
  items: ReadonlyArray<DigitalCodeItem>,
): Promise<void> {
  if (items.length === 0) return;
  const db = getAdminDb();
  for (const item of items) {
    const codesSnap = await db
      .collection(PRODUCT_COLLECTION)
      .doc(item.productId)
      .collection(PRODUCT_CODES_SUBCOLLECTION)
      .where("orderId", "==", orderId)
      .limit(1)
      .get();
    if (codesSnap.empty) continue;
    const codeStatus = codesSnap.docs[0].data()?.status as string | undefined;
    if (codeStatus === "claimed") {
      throw new ValidationError(
        "The digital code for this order has already been revealed and cannot be refunded automatically. Please contact support.",
      );
    }
  }
}

/**
 * SB-UNI-N — fire-and-forget revoke of any AVAILABLE (unclaimed) digital code
 * tied to the refunded order. Failures are logged but never thrown.
 */
function revokeAvailableDigitalCodes(
  orderId: string,
  items: ReadonlyArray<DigitalCodeItem>,
): void {
  if (items.length === 0) return;
  const db = getAdminDb();
  for (const item of items) {
    db.collection(PRODUCT_COLLECTION)
      .doc(item.productId)
      .collection(PRODUCT_CODES_SUBCOLLECTION)
      .where("orderId", "==", orderId)
      .where(ORDER_FIELDS.STATUS, "==", "available")
      .limit(1)
      .get()
      .then((snap) => revokeFirstSnapDoc(snap))
      .catch((e) => serverLogger.error("refund: code query failed", { error: normalizeError(e).message }));
  }
}

function revokeFirstSnapDoc(snap: FirebaseFirestore.QuerySnapshot): void {
  if (snap.empty) return;
  snap.docs[0].ref
    .update({ status: "revoked", updatedAt: new Date() })
    .catch((e) => serverLogger.error("refund: code revoke failed", { error: normalizeError(e).message }));
}

export type ProcessRefundInput = {
  orderId: string;
  /*
   * 🛑 `type` was REMOVED on 2026-10-22. Do not reinstate it.
   *
   * It was a required `RefundType` that every caller had to guess, and this
   * function then computed the REAL answer four lines later anyway —
   * `wouldBeFullRefund(order, amount, legacyGstPercent)`. Five callers, five
   * different guesses: three hardcoded a literal, the admin route
   * re-implemented the predicate *without* the legacy GST percent (so it could
   * disagree with the authoritative one on any pre-2026-10-21 order), and
   * `POST /api/orders/[id]/refund` took it straight from the REQUEST BODY — a
   * client-supplied label on a money record.
   *
   * The stored `type` has no reader anywhere in the codebase; it is a label on
   * the refund entry. So it is now derived from the `isFull` this function
   * already owns, and the label can no longer contradict it. Root Cause #75 —
   * export the computed value, never a factor the caller must recombine.
   */
  /** Decimal rupees. Must be > 0 and ≤ remaining refundable amount on the order. */
  amount: number;
  /**
   * Coded reason. Replaced a free-text `reason: string` — final sale has to
   * refuse a change-of-mind return while always allowing a "didn't get what I
   * paid for" claim, and that decision cannot be made against prose.
   */
  reasonCode: ReturnReason;
  /** Optional human elaboration, stored alongside the code. */
  reasonNote?: string;
  /** Product/item ids affected (for partial refunds). */
  itemIds?: string[];
  /** Required: caller must explicitly confirm this action is irrevocable. */
  confirmIrrevocable: true;
  /** uid of the user processing the refund (admin / seller). */
  refundedBy: string;
  /**
   * 🛑 REQUIRED (D2). The caller's stable key for this logical refund.
   *
   * `refundId` used to be a server-side `randomUUID()` per call, which can
   * never be idempotent: a double-clicked button minted two ids and issued
   * **two real gateway refunds**. The entry id is now
   * `sha256(idempotencyKey)`, so a retry reproduces the identical entry and
   * the claim document refuses the second attempt.
   *
   * Required rather than optional ON PURPOSE — an optional key with a
   * `randomUUID()` fallback is the old bug wearing a new name, and it would
   * be reached by exactly the callers that forgot.
   *
   * What to pass: the submitting UI generates ONE uuid per form OPEN (so a
   * double-click reuses it and a genuine second refund gets a new one);
   * server-initiated paths use a NATURAL key — the out-of-stock auto-refund
   * uses `oos_{merchantOrderId}`, which also makes it idempotent across
   * checkout retries, a money fix in its own right.
   */
  idempotencyKey: string;
} & (
  | {
      method: "phonepe";
      /** The order's PhonePe merchantOrderId (order.paymentId) — PhonePe refunds are order-keyed, never payment-keyed. */
      phonepeOrderId: string;
      manualTransactionId?: never;
      proofDocumentUrl?: never;
      proofDocumentMimeType?: never;
    }
  | {
      method: "manual";
      phonepeOrderId?: never;
      manualTransactionId?: string;
      proofDocumentUrl?: string;
      proofDocumentMimeType?: string;
    }
);

export async function processRefundAction(
  input: ProcessRefundInput,
): Promise<ActionResult<{ success: true; refundId: string }>> {
  return wrapAction(async () => {
    const order = await orderRepository.findById(input.orderId);
      if (!order) throw new NotFoundError(`Order ${input.orderId} not found`);
    
      if (input.amount <= 0) throw new ValidationError("Refund amount must be positive");

      /*
       * One settings read, and only for the LEGACY case: orders written before
       * `platformFeeGst` was persisted (2026-10-21) need their fee's GST
       * derived, and deriving it from a rate we had to look up is still far
       * better than D32's mistake of deriving the whole fee from a live
       * percentage. Orders written after that date ignore this value entirely.
       *
       * Accepted cost: one read on an operator-initiated, rare action. The
       * alternative — skipping it — would under-withhold on legacy orders,
       * which sounds buyer-friendly but inflates `refundableBase`, so a
       * "refund everything" would leave a residue and the order would never
       * reach `status: "refunded"` (the D3 defect, reintroduced).
       */
      const siteSettings = await siteSettingsRepository.getSingleton().catch((err: unknown) => {
        void normalizeError(err);
        return null;
      });

      /*
       * ── D1: the cap is the REMAINING balance, not the order total ────────
       *
       * This read `input.amount > order.totalPrice`, i.e. it compared each
       * refund against the whole order — while the function's own docstring
       * promised "≤ remaining refundable amount". So on a ₹600 order, ₹500 and
       * then another ₹500 BOTH passed: ₹1,000 refunded, two real gateway
       * calls, both successful.
       *
       * 🛑 The ceiling is `refundableBase`, not `totalPrice`: the platform fee
       * is non-refundable by policy, which the product already tells the buyer
       * (`REFUND_COPY.request.acknowledgments[2]`).
       *
       * This check is the EARLY, friendly one — it gives the operator a useful
       * message before any provider call. It is NOT the authority: the real
       * cap is re-evaluated inside `reserveRefund`'s transaction, because a
       * check outside a transaction is TOCTOU and two concurrent requests
       * could each see a clear cap and both proceed. That is exactly how the
       * double refund above was reachable even with a correct comparison.
       */
      const capacity = refundCapacity(order, siteSettings?.commissions?.gstPercent);
      if (input.amount > capacity.remaining + MONEY_EPSILON) {
        throw new ValidationError(
          `Refund of ₹${input.amount.toFixed(2)} exceeds the ₹${capacity.remaining.toFixed(2)} still refundable on this order` +
            (capacity.withheld > 0
              ? ` (₹${capacity.withheld.toFixed(2)} platform fee is non-refundable).`
              : "."),
        );
      }
    
      // Guard: non-refundable orders (prize draws, bundles). A property of the
      // listing TYPE, decided by the platform — checked first because it
      // admits no exception, not even a seller-fault one.
      if (order.isNonRefundable) {
        throw new ValidationError("This order is marked non-refundable and cannot be refunded.");
      }

      /*
       * Guard: final sale.
       *
       * Unlike `isNonRefundable` this is per-LINE and reason-dependent. A
       * seller-fault claim is never blocked, however the listing was sold —
       * "no returns" is a statement about changing your mind, not a waiver of
       * the seller's obligation to ship what was described.
       *
       * Read from the ORDER's snapshot, never from the product: the buyer
       * agreed to the terms shown at checkout, and re-reading the live product
       * would let a seller flip the switch afterwards.
       */
      if (!isFinalSaleExempt(input.reasonCode)) {
        const scopedItems = input.itemIds?.length
          ? (order.items ?? []).filter((i) => input.itemIds!.includes(i.productId))
          : (order.items ?? []);
        if (scopedItems.some((i) => i.finalSale === true)) {
          throw new ValidationError(REFUND_COPY.request.finalSaleBlockedMessage);
        }
      }
    
      // SB-UNI-N — digital-code refund gate: block if code is already claimed (revealed).
      const digitalCodeItems = (order.items ?? []).filter(
        (i) => (i.listingType ?? "standard") === "digital-code",
      );
      await assertDigitalCodesNotClaimed(input.orderId, digitalCodeItems);
    
      /*
       * ── D2: IDEMPOTENCY ──────────────────────────────────────────────────
       *
       * `const refundId = randomUUID()` was generated SERVER-SIDE, per call.
       * A server-minted id can never be idempotent: a double-clicked button
       * produced two different ids and therefore **two real gateway refunds**.
       *
       * The id is now derived from the caller's `idempotencyKey`, so a retry
       * of the same logical request produces the identical entry. The client
       * generates one key per form OPEN, so a double-click reuses it while a
       * genuine second refund gets a new one.
       *
       * Truncated to 32 chars to stay comfortably inside a Firestore document
       * id while keeping ~128 bits of the digest — collision risk is
       * negligible and a collision degrades to "treated as a retry", which is
       * the safe direction.
       */
      const refundId = createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 32);
      const now = new Date();

      /*
       * The at-most-once gate, BEFORE any provider call. Same `.create()`
       * fails-if-exists primitive the gateway order claim uses — the fourth
       * use of it in this codebase.
       *
       * 🛑 Claimed first and released on nothing. A claim that outlives a
       * crash is deliberate: it is what stops a retry from issuing a second
       * provider call for a refund that may already have succeeded. An
       * unsettled claim older than an hour is what the reconciler looks for
       * (Phase 4 R3), and resolving it means READING the gateway, never
       * guessing.
       */
      const claimRef = getAdminDb().collection(REFUND_CLAIMS_COLLECTION).doc(refundId);
      try {
        await claimRef.create({
          orderId: input.orderId,
          amount: input.amount,
          state: "claimed",
          claimedAt: now,
          claimedBy: input.refundedBy,
        });
      } catch (claimErr) {
        void normalizeError(claimErr);
        /*
         * Already claimed. Return the WINNER's refundId as a SUCCESS, not an
         * error — the refund either happened or is in flight, and an error
         * here makes the operator click again, which is the behaviour this
         * whole mechanism exists to stop.
         */
        serverLogger.info("refund: duplicate idempotency key — returning the existing refund", {
          orderId: input.orderId,
          refundId,
        });
        return { success: true as const, refundId };
      }

      /*
       * ── D3: `isFull` measured against the REFUNDABLE BASE ────────────────
       *
       * This was `input.amount >= order.totalPrice`, which is unreachable once
       * the platform fee is withheld: the largest possible refund is strictly
       * LESS than `totalPrice`, so an order could **never** reach
       * `status: "refunded"` and stayed fully refundable forever. It also
       * ignored prior partial refunds entirely — ₹300 then ₹200 of ₹500 left
       * the order open.
       */
      const isFull = wouldBeFullRefund(order, input.amount, siteSettings?.commissions?.gstPercent);

      const event: OrderRefundEvent = {
        refundId,
        // Derived from the authoritative `isFull` above, never from a caller.
        type: isFull ? "full" : "partial",
        amount: input.amount,
        ...(input.itemIds?.length ? { itemIds: input.itemIds } : {}),
        reasonCode: input.reasonCode,
        // `reason` stays the human-readable string every existing refund row
        // and every rendering of RefundHistoryTable already reads. It is now
        // DERIVED from the code rather than typed freehand, so the two can
        // never disagree about why a refund happened.
        reason: input.reasonNote
          ? `${RETURN_REASON_LABEL[input.reasonCode]} — ${input.reasonNote}`
          : RETURN_REASON_LABEL[input.reasonCode],
        refundedAt: now,
        refundedBy: input.refundedBy,
        ...(input.method === "manual" && input.manualTransactionId
          ? { manualTransactionId: input.manualTransactionId }
          : {}),
        ...(input.method === "manual" && input.proofDocumentUrl
          ? {
              proofDocumentUrl: input.proofDocumentUrl,
              proofDocumentMimeType: input.proofDocumentMimeType,
            }
          : {}),
      };

      /*
       * ── D6: TWO-PHASE WRITE AROUND THE PROVIDER CALL ─────────────────────
       *
       * The old sequence was: call the gateway, then `postRefundEvent`, which
       * does `findById` then `[...existing, event]`. Two problems.
       *
       * (a) The append is a read-then-write, so two concurrent refunds both
       *     read the same array and the second **loses the first's event
       *     entirely**.
       * (b) A crash between the gateway call and the write leaves money gone
       *     from the gateway and NO RECORD of it on our side — unrecoverable
       *     without manually reading the provider.
       *
       * Reserve (transactional, cap enforced inside) → provider call (outside
       * any transaction, because a transaction RETRIES its body and a retried
       * network call is a second refund) → settle. This is the only ordering
       * in which "money left and we do not know" is impossible: a crash now
       * leaves a `reserved` entry plus an unsettled claim, which is a
       * detectable, resolvable state.
       */
      await orderRepository.reserveRefund(input.orderId, event, {
        refundableBase: capacity.base,
        epsilon: MONEY_EPSILON,
      });

      let gatewayRefundId: string | undefined;
      let gatewayName: string | undefined;
      if (input.method === "phonepe") {
        const payment = getProviders().payment;
        if (!payment) throw new ValidationError("Payment provider not configured");
        try {
          const result = await payment.refund(input.phonepeOrderId, rupeesToPaise(input.amount));
          gatewayRefundId = result.id;
          gatewayName = payment.name;
        } catch (providerErr) {
          void normalizeError(providerErr);
          /*
           * Release the reservation by settling it `failed`, so the amount
           * returns to the refundable balance — `committedRefundTotal` skips
           * failed entries, which is why no explicit release exists to forget.
           * Then rethrow: the operator must know the gateway refused.
           */
          await orderRepository
            .settleRefund(input.orderId, refundId, {
              status: "failed",
              failureReason:
                providerErr instanceof Error ? providerErr.message : String(providerErr),
            })
            .catch((settleErr: unknown) => {
              void normalizeError(settleErr);
              serverLogger.error("refund: could not mark a failed reservation — it will hold the balance until reconciled", {
                orderId: input.orderId,
                refundId,
              });
            });
          await claimRef
            .update({ state: "failed", settledAt: new Date() })
            .catch(() => {/* the reconciler resolves an unsettled claim */});
          throw providerErr;
        }
      }

      /*
       * ── D7: the gateway id, recorded gateway-BLIND and provider-specific ──
       *
       * Razorpay's refund id used to be written to `phonepeRefundId`
       * unconditionally (`phonepeRefundId = result.id`, no branch), while the
       * declared `razorpayRefundId` was written by nothing — so a Razorpay
       * refund existed in their dashboard with no way to tie it to ours.
       *
       * `gatewayRefundId` is what a reconciler reads and needs no knowledge of
       * which provider ran. The provider-specific field is populated too, by
       * the provider that actually produced the id, for an operator searching
       * one dashboard.
       */
      await orderRepository.settleRefund(
        input.orderId,
        refundId,
        {
          status: "processed",
          ...(gatewayRefundId ? { gatewayRefundId } : {}),
          ...(gatewayName ? { gateway: gatewayName } : {}),
          providerFields:
            gatewayRefundId && gatewayName === "razorpay"
              ? { razorpayRefundId: gatewayRefundId }
              : gatewayRefundId
                ? { phonepeRefundId: gatewayRefundId }
                : {},
        },
        isFull,
      );

      await claimRef
        .update({ state: "settled", settledAt: new Date() })
        .catch((err: unknown) => {
          void normalizeError(err);
          // Harmless: the refund is recorded. An unsettled claim only means
          // the reconciler will look at it once and find it already done.
          serverLogger.warn("refund: claim not marked settled", { refundId });
        });

      /*
       * ── PHASE 7c: the credit note that documents this reversal ────────────
       *
       * 🛑 HERE, at settlement, and not at reservation. A credit note numbered
       * when the entry was reserved would leave a numbered reversal in the
       * series on every provider failure — for money that never moved, with a
       * number that cannot be withdrawn.
       *
       * 🛑 AWAITED but never allowed to throw (the issuer swallows its own
       * failures and says so). The money has already left the gateway by this
       * line; raising here would report a successful refund as failed, and an
       * operator would retry a refund that already happened. A missing credit
       * note is a reporting gap a backfill can close; a double refund is not.
       *
       * No renderer is passed, so this NUMBERS the reversal without producing
       * a PDF. That is what the GSTR-1 export needs — it reconciles numbers
       * and amounts. The buyer's PDF follows the invoice's own lazy pattern
       * when a surface asks for it.
       */
      const settledOrder = await orderRepository.findById(input.orderId);
      const settledEvent = settledOrder?.refunds?.find((r) => r.refundId === refundId);
      if (settledOrder && settledEvent) {
        await issueCreditNoteForRefund(settledOrder, settledEvent);
      }


      // SB-UNI-N — revoke any available (unclaimed) digital codes linked to this order.
      revokeAvailableDigitalCodes(input.orderId, digitalCodeItems);
    
      /*
       * Clawback — deduct from the store's pending payout if one exists.
       *
       * 🛑 Still fire-and-forget on the FAILURE path, and that part is
       * correct: the refund event is already posted and the buyer's money is
       * already moving, so an accounting side effect must never roll it back.
       *
       * What changed on 2026-10-21 is that the RESULT is no longer discarded.
       * This read `.catch(() => {})` with no `.then`, on the strength of the
       * action's own docstring claiming an unrecovered clawback was "reflected
       * in the next payout cycle" — which is false, verified: there is no
       * seller ledger and each payout is computed fresh from a new batch of
       * delivered orders, so the seller simply keeps money for goods that came
       * back (D10). The action now records that case durably and returns a
       * destination; this logs which one, so a refund and its clawback can be
       * followed in one place.
       */
      if (order.storeId) {
        applyRefundDeductionAction({
          storeId: order.storeId,
          orderId: input.orderId,
          refundId,
          refundedAmount: input.amount,
          // Same derived string the refund event records, so the payout
          // deduction and the refund history read identically.
          reason: event.reason,
        })
          .then((res) => {
            if (!res.ok) {
              serverLogger.error("clawback action failed", {
                orderId: input.orderId,
                refundId,
              });
              return;
            }
            if (res.data.applied) {
              serverLogger.info("clawback netted off a pending payout", {
                orderId: input.orderId,
                payoutId: res.data.payoutId,
              });
            } else {
              /*
               * The seller has been paid for returned goods. Loud, because
               * there is no automatic recovery — `recordedAs` names the
               * durable row at /admin/maintenance/payment-rollbacks.
               */
              serverLogger.error("clawback UNRECOVERED — seller retains refunded amount", {
                orderId: input.orderId,
                storeId: res.data.storeId,
                amount: res.data.amount,
                reason: res.data.reason,
                recordedAs: res.data.recordedAs,
              });
            }
          })
          .catch((clawbackErr: unknown) => {
            void normalizeError(clawbackErr);
            serverLogger.error("clawback threw", { orderId: input.orderId, refundId });
          });
      }
    
      return { success: true, refundId };
  });
}
