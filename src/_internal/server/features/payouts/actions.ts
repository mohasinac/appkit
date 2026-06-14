"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
/**
 * applyRefundDeductionAction — deduct a refund from a seller's pending payout.
 *
 * Called fire-and-forget after processRefundAction succeeds:
 *   1. Locate the most recent pending payout for the order's store.
 *   2. If found and it covers the refunded order, apply the deduction.
 *   3. If no pending payout exists (already settled), return applied:false —
 *      the reduced net revenue is automatically reflected in the next payout
 *      cycle because the order revenue was never re-added.
 *
 * deductedAmount = refundedAmount × (1 − platformFeeRate).
 * The platform keeps its fee share on every refund.
 */

import { payoutRepository } from "../../../../repositories";
import { ValidationError } from "../../../../errors";

export type ApplyRefundDeductionInput = {
  storeId: string;
  orderId: string;
  refundId: string;
  /** Gross refund amount in paise. */
  refundedAmountInPaise: number;
  /** Platform fee rate (0–1). Defaults to DEFAULT_PLATFORM_FEE_RATE (0.05). */
  platformFeeRate?: number;
  reason: string;
};

export type ApplyRefundDeductionResult =
  | { applied: true; payoutId: string; netAmount: number }
  | { applied: false; reason: string };

export async function applyRefundDeductionAction(
  input: ApplyRefundDeductionInput,
): Promise<ActionResult<ApplyRefundDeductionResult>> {
  return wrapAction(async () => {
    if (input.refundedAmountInPaise <= 0) {
        throw new ValidationError("Refund amount must be positive");
      }
    
      const feeRate = input.platformFeeRate ?? 0.05;
      const deductedAmount = Math.round(input.refundedAmountInPaise * (1 - feeRate));
    
      const pending = await payoutRepository.findPendingByStore(input.storeId);
      if (!pending) {
        return { applied: false, reason: "no_pending_payout" };
      }
    
      if (!pending.orderIds.includes(input.orderId)) {
        return { applied: false, reason: "order_not_in_payout" };
      }
    
      const updated = await payoutRepository.applyRefundDeduction(pending.id, {
        orderId: input.orderId,
        refundId: input.refundId,
        refundedAmount: input.refundedAmountInPaise,
        deductedAmount,
        reason: input.reason,
      });
    
      return { applied: true, payoutId: updated.id, netAmount: updated.netAmount ?? updated.amount };
  });
}
