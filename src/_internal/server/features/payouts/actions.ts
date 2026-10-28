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
 * applyRefundDeductionAction — deduct a refund from a seller's pending payout.
 *
 * Called after processRefundAction succeeds:
 *   1. Locate the most recent pending payout for the order's store.
 *   2. If found and it covers the refunded order, apply the deduction.
 *   3. Otherwise the money cannot be recovered automatically — record it.
 *
 * deductedAmount = refundedAmount × (1 − platformFeeRate).
 * The platform keeps its fee share on every refund.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 🛑 THIS DOCSTRING USED TO CONTAIN A FALSE CLAIM, and it was load-bearing
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Step 3 read:
 *
 *   > If no pending payout exists (already settled), return applied:false —
 *   > the reduced net revenue is automatically reflected in the next payout
 *   > cycle because the order revenue was never re-added.
 *
 * **There is no such mechanism.** Verified 2026-10-21: there is no
 * `sellerLedger`, no running balance, no carry-forward of any kind anywhere in
 * the codebase, and each payout's `grossAmount` is computed fresh as
 * `ordersTaxableValue(<this batch of newly delivered orders>)`. A refund on an
 * order whose payout has ALREADY SETTLED is therefore never recovered — the
 * seller keeps money for goods that came back, and nothing records that a
 * clawback was attempted and failed.
 *
 * That claim is why the caller could reasonably write
 * `.catch(() => {/* best-effort *\/})` and discard the result: the comment
 * said the money was handled elsewhere. It was not.
 *
 * So the return type is now a DESTINATION rather than a boolean. Two reasons,
 * and the second is the durable one:
 *
 *   1. It names where the money went, which is the question an operator
 *      actually has.
 *   2. A discriminated union with no `applied: false` member means the
 *      "ignore the result" shape no longer type-checks into silence — the
 *      caller has to acknowledge the unrecovered case. Making the bug
 *      UNCOMPILABLE is stronger than asking nobody to reintroduce it.
 *
 * 🛑 This does NOT recover the money. Automatic recovery needs a seller
 * ledger that can hold a negative balance and net it against the next payout,
 * which is Phase 11 (books) and is deliberately not smuggled in here. What
 * this change buys is that the loss is now VISIBLE — a durable row with the
 * store, the order and the amount — instead of silently absorbed.
 */

import { payoutRepository } from "../../../../features/payments/repository/payout.repository";
import { serverErrorsRepository } from "../../../../features/server-errors/repository/server-errors.repository";
import { ValidationError } from "../../../../errors";
import { roundRupees } from "../../../../utils/number.formatter";
import { formatMoney } from "../../../../utils/number.formatter";

export type ApplyRefundDeductionInput = {
  storeId: string;
  orderId: string;
  refundId: string;
  /** Gross refund amount, decimal rupees. */
  refundedAmount: number;
  /** Platform fee rate (0–1). Defaults to DEFAULT_PLATFORM_FEE_RATE (0.05). */
  platformFeeRate?: number;
  reason: string;
};

/**
 * Where the clawback landed.
 *
 * 🛑 Deliberately has NO `{ applied: false }` member. That shape is what let
 * four lines of caller code treat "we could not recover the money" as an
 * unremarkable outcome. Every variant here names a destination, and
 * `unrecovered` is explicit about being a debt rather than a non-event.
 *
 * `applied` is kept as the discriminant for source compatibility with the two
 * existing readers, so this is a widening rather than a rename.
 */
export type ApplyRefundDeductionResult =
  /** Netted off a pending payout before it was sent. The good case. */
  | { applied: true; to: "payout"; payoutId: string; netAmount: number }
  /**
   * The payout has already settled, or this order was not in it. The seller
   * holds money for returned goods and WE CANNOT TAKE IT BACK from here.
   * `recordedAs` is the durable row an operator can act on.
   */
  | {
      applied: false;
      to: "unrecovered";
      reason: "no_pending_payout" | "order_not_in_payout";
      storeId: string;
      orderId: string;
      amount: number;
      recordedAs: string;
    };

export async function applyRefundDeductionAction(
  input: ApplyRefundDeductionInput,
): Promise<ActionResult<ApplyRefundDeductionResult>> {
  return wrapAction(async () => {
    if (input.refundedAmount <= 0) {
        throw new ValidationError("Refund amount must be positive");
      }

      const feeRate = input.platformFeeRate ?? 0.05;
      const deductedAmount = roundRupees(input.refundedAmount * (1 - feeRate));

      const pending = await payoutRepository.findPendingByStore(input.storeId);
      const unrecoverable: "no_pending_payout" | "order_not_in_payout" | null = !pending
        ? "no_pending_payout"
        : !pending.orderIds.includes(input.orderId)
          ? "order_not_in_payout"
          : null;

      if (unrecoverable) {
        /*
         * The seller has already been paid for an order that came back. Record
         * it durably — this is the money, and a `warn` would scroll past in a
         * log buffer that drops at ~4 KB/s.
         *
         * `/admin/maintenance/payment-rollbacks` already filters on
         * `PAYMENT_ROLLBACK_*`, so this surfaces there with no new page.
         *
         * `record()` is documented never to throw, so this cannot turn a
         * failed clawback into a failed refund — the refund has already been
         * posted and must not be rolled back by an accounting side effect.
         */
        const code = `PAYMENT_ROLLBACK_${unrecoverable.toUpperCase()}`;
        await serverErrorsRepository().record({
          source: "vercel",
          route: "applyRefundDeductionAction",
          code,
          message:
            `Clawback of ${formatMoney(deductedAmount)} for order ${input.orderId} (store ${input.storeId}) could not be applied: ${unrecoverable}. ` +
            `The seller retains this amount for returned goods; there is no automatic recovery until a seller ledger exists.`,
          requestId: input.refundId,
        });
        return {
          applied: false as const,
          to: "unrecovered" as const,
          reason: unrecoverable,
          storeId: input.storeId,
          orderId: input.orderId,
          amount: deductedAmount,
          recordedAs: code,
        };
      }

      // `pending` is non-null here: `unrecoverable` is only null when it is set.
      const updated = await payoutRepository.applyRefundDeduction(pending!.id, {
        orderId: input.orderId,
        refundId: input.refundId,
        refundedAmount: input.refundedAmount,
        deductedAmount,
        reason: input.reason,
      });

      return {
        applied: true as const,
        to: "payout" as const,
        payoutId: updated.id,
        netAmount: updated.netAmount ?? updated.amount,
      };
  });
}
