/*
 * WHY: Payout fixtures. Production has none, so this is empty.
 * WHAT: Empty. The export is kept so the loader's import resolves.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
 *
 * EXPORTS:
 *   payoutsSeedData — Array of Partial<PayoutPlain> for seed runner
 *
 * @tag domain:payouts,payments
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

import type { PayoutPlain, PayoutRefundDeduction } from "../features/payments/schemas";
import type { FieldChange, StatusChangeEntry } from "../_internal/shared/history/types";
import {
  DEFAULT_PLATFORM_FEE_RATE,
} from "../features/payments/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/**
 * A payout timeline entry, for the W18 `statusHistory` fixtures below.
 *
 * Dates come from the file's own `daysAgo()` helper, never `Date.now()` at
 * import time in an ID position — Root Cause #25. `actorUid` only, never a
 * name: `withHistory` scrubs PII from real writes and a fixture that carried
 * a name would be the one place the rule is broken.
 */
function entry(
  at: Date,
  actorRole: "system" | "admin",
  trigger: string,
  changes: Record<string, FieldChange>,
  extra?: { reason?: string; actorUid?: string },
): StatusChangeEntry {
  return { at, actorRole, trigger, changes, ...extra };
}

function payoutAmounts(grossINR: number) {
  const grossAmount = grossINR;
  const platformFee = Math.round(grossAmount * DEFAULT_PLATFORM_FEE_RATE * 100) / 100;
  const amount = grossAmount - platformFee;
  return { grossAmount, platformFee, amount };
}

function seedDeduction(
  orderId: string,
  refundId: string,
  refundedAmount: number,
  reason: string,
  daysAgoN: number,
): PayoutRefundDeduction {
  const deductedAmount = Math.round(refundedAmount * (1 - DEFAULT_PLATFORM_FEE_RATE) * 100) / 100;
  return { orderId, refundId, refundedAmount, deductedAmount, reason, appliedAt: daysAgo(daysAgoN) };
}

export const payoutsSeedData: Partial<PayoutPlain>[] = [];
