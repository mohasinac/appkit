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

import type { PayoutPlain } from "../features/payments/schemas";

export const payoutsSeedData: Partial<PayoutPlain>[] = [];
