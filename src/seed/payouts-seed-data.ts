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

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/*
 * 🛑 RE-POPULATED 2026-10-30 as EXPLICIT TEST DATA, with the owner's
 * confirmation for this audit sweep. `orderIds` point at the orders written
 * in `orders-seed-data.ts` (also re-populated the same session).
 */
export const payoutsSeedData: Partial<PayoutPlain>[] = [
  {
    id: "payout-test-payout-1",
    payeeType: "store",
    storeId: "store-beyblade-arena",
    sellerName: "Beyblade Arena",
    sellerEmail: "tyson@beybladearena.in",
    amount: 2500,
    grossAmount: 2625,
    platformFee: 125,
    platformFeeRate: 5,
    currency: "INR",
    status: "pending",
    paymentMethod: "bank_transfer",
    orderIds: ["order-test-standard-001"],
    createdAt: daysAgo(2),
  },
  {
    id: "payout-test-payout-2",
    payeeType: "store",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "store@letitrip.in",
    amount: 4250,
    grossAmount: 4500,
    platformFee: 250,
    platformFeeRate: 5,
    currency: "INR",
    status: "processing",
    paymentMethod: "upi",
    orderIds: ["order-test-offer-accepted-001"],
    createdAt: daysAgo(5),
  },
];
