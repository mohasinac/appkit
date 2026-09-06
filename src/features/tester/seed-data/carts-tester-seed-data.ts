/*
 * WHY: Shared tester sandbox — the LOCKED cart line a settled auction leaves behind.
 * WHAT: One cart for user-tester-qa holding the win from auction-tester-sandbox-won.
 *
 * 🛑 WHY THIS FILE HAD TO EXIST.
 *
 * The sandbox seeded a won auction, its winning bid, and a delivered order made
 * from it — the shape settlement produced BEFORE Root Cause #60, when it wrote an
 * order document directly. That order was in a shape no orders list could render
 * and no checkout could accept, so a winner had no way to pay at all; the fix
 * routed a win through the CART as a locked line instead.
 *
 * The fixtures were never updated to match. So `win-auction` — the case whose
 * label is literally "creates a payable locked cart line, not a stuck order" —
 * could not pass: /user/bids offered "Pay now", it led to /checkout?lane=auction,
 * and the cart was empty. Found by the tester 2026-09-06, which is exactly the
 * kind of thing a case can only prove by being run.
 *
 * The delivered order fixture STAYS. It is the "win already completed" state and
 * other cases read it. This adds the missing "win awaiting payment" state.
 *
 * 🛑 `isAuctionWin` is not decoration. `laneOf()` keys on `isAuctionWin || bidId`
 * and ignores `listingType` and `locked` entirely — a line without it lands in the
 * STANDARD lane, so the Won Auctions tab stays empty while a non-removable line
 * sits in the ordinary cart. Both fields are set here so the lane is unambiguous.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/manifest.ts
 * @tag sideEffects:none
 */

import type { CartDocument } from "../../cart/schemas/firestore";
import { testDataExpiresAt } from "./tester-ttl";

const NOW = new Date();
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);

/** The cart document id IS the user id — one cart per account. */
export const cartsTesterSeedData: Partial<CartDocument>[] = [
  {
    id: "user-tester-qa",
    userId: "user-tester-qa",
    items: [
      {
        itemId: "cartitem-tester-sandbox-auction-won",
        productId: "auction-tester-sandbox-won",
        productTitle: "Test Auction — Already Won",
        price: 15000,
        currency: "INR",
        quantity: 1,
        storeId: "store-tester-qa-seller",
        storeName: "Tester QA Seller",
        listingType: "auction",
        // Both, deliberately — see the lane note in the header.
        isAuctionWin: true,
        bidId: "bid-tester-sandbox-won-tester-qa",
        // A win is non-removable and fixed-quantity: settlement is the only writer
        // of this line, and declining to pay is handled by the forfeit sweep rather
        // than by the buyer deleting it.
        locked: true,
        lockedPrice: 15000,
        addedAt: hoursAgo(2),
        updatedAt: hoursAgo(2),
      },
    ],
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  } as unknown as Partial<CartDocument>,
];
