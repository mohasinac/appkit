/*
 * WHY: Shared tester sandbox — a pre-ACCEPTED offer for the tester persona.
 *      Needed because the offer lifecycle spans two parties: a tester can make
 *      an offer (buyer side) but cannot accept it, since acceptance belongs to
 *      the store that owns the listing (`store-beyblade-arena`, not the
 *      tester's own sandbox store). Without a pre-accepted fixture, the
 *      "checkout at the agreed price" and "offer flips to paid" cases are not
 *      reachable by a single tester at all.
 * WHAT: Exports offersTesterSeedData — 1 Partial<OfferDocument> already in the
 *       `accepted` state, with a live `checkoutDeadline`, so the tester can
 *       drive it straight through the Offers checkout lane.
 *
 * Every date is Date.now()-relative (per CLAUDE.md's tester-fixture standards)
 * so the 4-hour testerSandboxRefresh re-arms it instead of letting it go stale.
 *
 * EXPORTS:
 *   offersTesterSeedData — Array of 1 Partial<OfferDocument> for the seed runner
 *
 * @tag domain:offers,seller,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/manifest.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { OfferDocument } from "../../seller/schemas/firestore";
import { OfferStatusValues } from "../../seller/schemas/firestore";
import { testDataExpiresAt } from "./tester-ttl";

const NOW = new Date();
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);
const hoursFromNow = (n: number) => new Date(NOW.getTime() + n * 3_600_000);

export const offersTesterSeedData: Partial<OfferDocument>[] = [
  {
    id: "offer-tester-sandbox-accepted",
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst Valkyrie",
    productSlug: "product-beyblade-burst-valkyrie",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-tester-qa",
    buyerName: "QA Tester",
    buyerEmail: "tester@letitrip.in",
    listedPrice: 1899,
    offerAmount: 1450,
    // The agreed price. Checkout MUST bill this, not `listedPrice` — that
    // divergence is exactly what the paired checklist case checks.
    lockedPrice: 1450,
    currency: "INR",
    status: OfferStatusValues.ACCEPTED,
    buyerNote: "Sandbox offer — already accepted so testers can drive checkout.",
    sellerNote: "Accepted for QA sandbox testing.",
    expiresAt: hoursFromNow(24),
    acceptedAt: hoursAgo(1),
    respondedAt: hoursAgo(1),
    // Well inside the 48h window so the lane is live for a whole test session.
    checkoutDeadline: hoursFromNow(36),
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
  } as Partial<OfferDocument>,
];
