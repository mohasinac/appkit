/**
 * Per-order-group EMI terms, and the one definition of what is COLLECTED NOW
 * on an instalment order.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 *
 * Four money paths have to agree about an EMI order: the pricing preview (what
 * the buyer is shown), `createOrderForGroup` (COD/manual), the gateway capture
 * in `/api/payment/create-order`, and `createPhonePeGroupOrder` (the order
 * written after that capture). Three of them had no EMI code at all, and the
 * fourth computed its schedule inline — so adding the online tender by copying
 * that block would have produced the exact shape Root Cause #75 is about: a
 * rule reachable by copy-paste, copied, and the copy never learning about the
 * branch added later. `lineTotalFor` was the last instance; this is the same
 * fix applied before the divergence rather than after it.
 *
 * ── 🛑 THE DEFECT THIS CLOSES, which is larger than the refactor ──────────
 *
 * `emiTokenAmount` was written onto every EMI order and had **ZERO readers**,
 * measured across `src` and `appkit/src`. The buyer's manual-payment page asks
 * for `order.amountDue ?? order.total`, and `amountDue` was set only when
 * points applied — so an EMI buyer was asked to transfer the **entire order
 * total up front** *and* handed a schedule of monthly instalments. The token
 * percentage was computed, stored, scheduled around, and never charged.
 *
 * `amountDueNow` below is that fix, and it is deliberately a SUBTRACTION
 * rather than a re-derivation:
 *
 *     orderTotal − remainingBalance
 *   = (subtotal + surcharge + fees) − (principalRemaining + surcharge)
 *   = (subtotal − principalRemaining) + fees
 *   = token + fees
 *
 * Provably the token plus every additive charge, with no second arithmetic to
 * drift from `computeBuyerEmiQuote`'s own. A function that recomputed
 * `tokenPercent × subtotal + …` would be a fifth place rounding money.
 */
import { roundRupees } from "../../../../utils/number.formatter";
import {
  checkEmiEligibility,
  computeBuyerEmiQuote,
  computeEmiSchedule,
  type BuyerEmiQuote,
  type EmiScheduleResult,
  type EmiSettings,
} from "./schedule";

/** What every caller knows about one seller-group at the moment EMI is priced. */
export interface GroupEmiInput {
  /** Already normalised by `resolveEmiChoice` — never derived from a tender. */
  emiOptIn: boolean;
  emiTenureMonths?: number;
  /** The group's GOODS subtotal, before coupon and before any fee. */
  groupSubtotal: number;
  /** `StoreDocument.emiEnabled` for this group's seller. */
  sellerEmiEnabled: boolean;
}

/**
 * The gate, shared so "does EMI apply to this group" is answered identically
 * everywhere.
 *
 * 🛑 Returns a REASON rather than a boolean, because the two callers do
 * opposite things with it: order creation must refuse (an ineligible EMI order
 * that silently becomes a full-price order is money the buyer did not agree
 * to), while the preview must carry on and simply price no surcharge (a
 * preview that throws blanks the Order Summary while the buyer is still
 * choosing). A boolean would have forced each to re-derive the reason.
 */
export type GroupEmiGate =
  | { applies: true }
  | { applies: false; reason: "not_opted_in" | "no_tenure" | "no_settings" | string };

export function groupEmiGate(
  input: GroupEmiInput,
  settings: Pick<EmiSettings, "enabled" | "minOrderValue"> | null | undefined,
): GroupEmiGate {
  if (!input.emiOptIn) return { applies: false, reason: "not_opted_in" };
  if (!input.emiTenureMonths) return { applies: false, reason: "no_tenure" };
  if (!settings) return { applies: false, reason: "no_settings" };
  const eligibility = checkEmiEligibility(input.groupSubtotal, input.sellerEmiEnabled, settings);
  if (!eligibility.eligible) return { applies: false, reason: eligibility.reason };
  return { applies: true };
}

/**
 * The buyer-visible quote for one group, or `null` when EMI does not apply.
 *
 * For the preview and for the gateway CAPTURE amount — neither needs the
 * platform/seller surcharge split, and neither should be able to print it.
 */
export function groupEmiQuote(
  input: GroupEmiInput,
  settings:
    | (Pick<EmiSettings, "enabled" | "minOrderValue" | "tokenPercent" | "billingDay" | "surchargePercentPerMonth">)
    | null
    | undefined,
  purchaseDate?: Date,
): BuyerEmiQuote | null {
  if (!settings) return null;
  if (!groupEmiGate(input, settings).applies) return null;
  return computeBuyerEmiQuote(input.groupSubtotal, input.emiTenureMonths!, settings, purchaseDate);
}

/**
 * The server-side schedule for one group, including the surcharge split that
 * is persisted onto the order. For the two order WRITERS only.
 */
export function groupEmiSchedule(
  input: GroupEmiInput,
  settings: EmiSettings | null | undefined,
  purchaseDate?: Date,
): EmiScheduleResult | null {
  if (!settings) return null;
  if (!groupEmiGate(input, settings).applies) return null;
  return computeEmiSchedule(input.groupSubtotal, input.emiTenureMonths!, settings, purchaseDate);
}

/**
 * What is actually collected at checkout: the order total, less any points
 * tendered, less whatever has been deferred into instalments.
 *
 * 🛑 Composes with the points tender rather than replacing it. Both reduce
 * what is collected and they are independent, so an EMI order part-funded by
 * points must subtract both — writing `total − remainingBalance` would hand
 * back the points discount, and `total − pointsApplied` alone is the bug this
 * function exists to fix. Floored at zero: points can cover at most half an
 * order, so the sum cannot genuinely go negative, and clamping means a future
 * change to that cap degrades to "collect nothing" rather than to a refund.
 */
export function amountDueNow(args: {
  orderTotal: number;
  pointsApplied: number;
  /** `EmiScheduleResult.remainingBalance`, or 0 on a non-EMI order. */
  emiRemainingBalance: number;
}): number {
  return roundRupees(
    Math.max(0, args.orderTotal - args.pointsApplied - args.emiRemainingBalance),
  );
}

/**
 * The `emi*` fields written onto an order document.
 *
 * 🛑 One builder for both creation paths. These are eleven fields that have to
 * be written identically by `createOrderForGroup` and
 * `createPhonePeGroupOrder`, and the second one carried **none of them** —
 * every order paid online lost its instalment plan entirely. Two hand-written
 * copies is the create-vs-create axis of Root Cause #39, and these two
 * functions have already drifted once before over add-on fees (#65).
 */
export function emiOrderFields(
  schedule: EmiScheduleResult | null,
  emiTenureMonths: number | undefined,
): {
  emiEnabled?: true;
  emiTenureMonths?: number;
  emiTokenAmount?: number;
  emiSurchargeAmount?: number;
  emiSurchargeSellerShare?: number;
  emiInstallments?: Array<{ index: number; dueDate: Date; amount: number; status: "pending" }>;
  emiRemainingBalance?: number;
  emiComplete?: false;
} {
  if (!schedule) return {};
  return {
    emiEnabled: true,
    emiTenureMonths,
    emiTokenAmount: schedule.tokenAmount,
    emiSurchargeAmount: schedule.surchargeAmount,
    /*
     * Persisted even though it moves no money at checkout: it is the
     * platform/seller split of the surcharge, and the payout run needs it to
     * credit the seller their share. It was discarded on every EMI order until
     * it was added here. 🛑 It is `PRIVATE_*_FIELDS` — it belongs on the
     * document and must never reach a buyer-facing projection.
     */
    emiSurchargeSellerShare: schedule.surchargeSellerShare,
    emiInstallments: schedule.installments.map((i) => ({
      index: i.index,
      dueDate: i.dueDate,
      amount: i.amount,
      status: "pending" as const,
    })),
    emiRemainingBalance: schedule.remainingBalance,
    emiComplete: false,
  };
}
