/*
 * WHY: Shared tester sandbox — one winning bid on the already-ended auction-tester-sandbox-won
 *      (kept separate from the still-biddable auction-tester-sandbox-1 so testers can still
 *      place a live bid on the latter) so testers (and the paired orders-tester-seed-data.ts
 *      auction-win order) can exercise the "winning an auction creates a payable order" flow.
 *      Auto-expires in 7 days, cascading with the parent auction product.
 * WHAT: Exports bidsTesterSeedData — 1 Partial<BidDocument> for the seed runner.
 *
 * EXPORTS:
 *   bidsTesterSeedData — Array of 1 Partial<BidDocument> for the seed runner
 *
 * @tag domain:auctions,bids,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { BidDocument } from "../../auctions/schemas/firestore";
import { testDataExpiresAt } from "./tester-ttl";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const bidsTesterSeedData: Partial<BidDocument>[] = [
  {
    id: "bid-tester-sandbox-won-tester-qa",
    productId: "auction-tester-sandbox-won",
    productTitle: "Test Auction — Already Won",
    userId: "user-tester-qa",
    userName: "QA Tester",
    userEmail: "tester@letitrip.in",
    bidAmount: 15000,
    currency: "INR",
    status: "won",
    isWinning: true,
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  } as unknown as Partial<BidDocument>,
];
