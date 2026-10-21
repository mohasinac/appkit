/**
 * The payout hold — how long a seller's money is held after delivery, and the
 * ONE place that number is decided.
 *
 * WHY: there were three payout paths and one intended hold, honoured by zero
 *      of the three (D25).
 *
 *      · `weeklyPayoutEligibility` (Saturday) queried
 *        `payoutStatus == "eligible" && status == "delivered"` with **no time
 *        cutoff at all**, so it paid out an order delivered yesterday.
 *      · `autoPayoutEligibility` (daily) applied a 7-day window, but computed
 *        it with CALENDAR days while calling them business days — measured,
 *        that reached 4 calendar days less far back than it should on a
 *        Monday, so a "7 business day" hold was really about 5.
 *      · The manual seller "Request payout" (`seller-actions.ts`) had no time
 *        check whatsoever.
 *
 *      And `commissions.payoutHoldDays` — the admin-facing setting that looks
 *      like it controls all this — was read by NOTHING. It is seeded **2**,
 *      which is the trap below.
 *
 * WHAT: `resolvePayoutHoldDays(commissions, returns)` → the honoured number,
 *       and `payoutCutoff(...)` → the instant to compare an order's delivery
 *       anchor against.
 */

import {
  businessDayCutoff,
  type BusinessDayOptions,
} from "../time/business-days";

/**
 * The hold can never be shorter than any window during which money can still
 * flow back OUT of the order.
 *
 * 🛑 WIRING `payoutHoldDays` NAIVELY MAKES THINGS WORSE, which is why this
 * function exists rather than a bare settings read. The setting is seeded at
 * **2 days**; the hardcoded window it would replace is **7**; and the
 * sale-protection claim window is **7 days** (168h). So honouring the stored
 * value as-is would *shorten* the hold from 7 to 2 and release a seller's
 * money four days before the buyer's protection claim window even closes —
 * i.e. we would have sold cover we had already paid out against.
 *
 * The floor is therefore `max(returnWindow, claimWindow)`, and the setting can
 * only ever EXTEND it. An admin who wants a shorter hold has to shorten the
 * return window first, which is the honest ordering of that decision.
 */
export const PAYOUT_HOLD_FLOOR_DAYS = 7;

export interface PayoutHoldInputs {
  /** `siteSettings.commissions` — `payoutHoldDays` is the only field read. */
  payoutHoldDays?: number;
  /** `siteSettings.returns.windowDays` — the buyer's return window. */
  returnWindowDays?: number;
  /** Longest protection claim window in HOURS, if protections are enabled. */
  maxClaimWindowHours?: number;
}

export interface ResolvedPayoutHold {
  /** Business days actually honoured. */
  days: number;
  /** Which input won, so a log line can say why. */
  source: "setting" | "floor";
  /** The floor that applied, for the same reason. */
  floor: number;
}

/**
 * Resolve the honoured hold.
 *
 * Returns the SOURCE as well as the number, deliberately: a hold silently
 * raised from the admin's configured 2 to a floor of 7 reads as a bug to
 * whoever set it, so the job logs which one applied rather than leaving the
 * seller and the admin to disagree about it.
 */
export function resolvePayoutHoldDays(inputs: PayoutHoldInputs): ResolvedPayoutHold {
  const claimDays = inputs.maxClaimWindowHours
    ? Math.ceil(inputs.maxClaimWindowHours / 24)
    : 0;
  const floor = Math.max(
    PAYOUT_HOLD_FLOOR_DAYS,
    inputs.returnWindowDays ?? 0,
    claimDays,
  );
  const configured = inputs.payoutHoldDays;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > floor) {
    return { days: Math.floor(configured), source: "setting", floor };
  }
  return { days: floor, source: "floor", floor };
}

/**
 * The cutoff instant: an order whose delivery anchor is at or before this is
 * past its hold.
 *
 * 🛑 BUSINESS days, via `businessDayCutoff` — weekends and the Indian holiday
 * list. The previous implementation subtracted calendar days, so every hold
 * spanning a weekend released early.
 */
export function payoutCutoff(
  inputs: PayoutHoldInputs,
  opts?: BusinessDayOptions,
  now?: Date,
): { cutoff: Date; hold: ResolvedPayoutHold } {
  const hold = resolvePayoutHoldDays(inputs);
  return { cutoff: businessDayCutoff(hold.days, opts, now), hold };
}
