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
 * so each seed run re-arms it instead of letting it go stale.
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
import { windowOffset } from "./tester-window";

const NOW = new Date();
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);

/*
 * Deadlines expressed as fractions of the testing window rather than fixed hours.
 *
 * "An accepted offer past its checkoutDeadline cannot be checked out" is a real
 * checklist case, and a fixed 36-hour deadline makes it untestable in any session
 * shorter than a day and a half. Fractions scale with TESTER_WINDOW_MINUTES, so the
 * lapse actually happens while someone is watching.
 *
 * OUTLASTS_RUN is deliberately greater than 1: the "still live" offers must NOT
 * lapse mid-run, or every other offer case starts failing for the wrong reason.
 */
const OUTLASTS_RUN = 2;
const LAPSES_MID_RUN = 1 / 3;
const CHECKOUT_LAPSES_MID_RUN = 1 / 6;

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
    // Realigned 2026-08-24: this carried listedPrice 1899 / offer 1450 against
    // a product that costs ₹999 — an offer ABOVE the listing price, which
    // `makeOffer` would reject outright. Same stale-snapshot drift the main
    // offers seed had.
    listedPrice: 999,
    offerAmount: 780,
    // The agreed price. Checkout MUST bill this, not `listedPrice` — that
    // divergence is exactly what the paired checklist case checks.
    lockedPrice: 780,
    currency: "INR",
    status: OfferStatusValues.ACCEPTED,
    buyerNote: "Sandbox offer — already accepted so testers can drive checkout.",
    sellerNote: "Accepted for QA sandbox testing.",
    expiresAt: windowOffset(OUTLASTS_RUN),
    acceptedAt: hoursAgo(1),
    respondedAt: hoursAgo(1),
    // Well inside the 48h window so the lane is live for a whole test session.
    checkoutDeadline: windowOffset(OUTLASTS_RUN),
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
  } as Partial<OfferDocument>,

  /**
   * COUNTERED. The buyer-accepts-a-counter path had no fixture at all, so
   * `acceptCounterOffer` was unreachable for a tester working solo.
   */
  {
    id: "offer-tester-sandbox-countered",
    productId: "product-beyblade-metal-storm-pegasus",
    productTitle: "Beyblade Metal Storm Pegasus",
    productSlug: "product-beyblade-metal-storm-pegasus",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-tester-qa",
    buyerName: "QA Tester",
    buyerEmail: "tester@letitrip.in",
    listedPrice: 1299,
    offerAmount: 1000,
    counterAmount: 1150,
    currency: "INR",
    status: OfferStatusValues.COUNTERED,
    buyerNote: "Sandbox offer — seller has countered, accept it to test the counter path.",
    sellerNote: "Counter: ₹1,150.",
    expiresAt: windowOffset(OUTLASTS_RUN),
    respondedAt: hoursAgo(1),
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
  } as Partial<OfferDocument>,

  /**
   * ACCEPTED with a deliberately SHORT window, so the live countdown and the
   * "pay before it closes" case are observable inside one test session rather
   * than needing a 36-hour wait.
   */
  {
    id: "offer-tester-sandbox-expiring",
    productId: "product-beyblade-x-wizard-arrow",
    productTitle: "Beyblade X Wizard Arrow",
    productSlug: "product-beyblade-x-wizard-arrow",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-tester-qa",
    buyerName: "QA Tester",
    buyerEmail: "tester@letitrip.in",
    listedPrice: 899,
    offerAmount: 700,
    lockedPrice: 700,
    currency: "INR",
    status: OfferStatusValues.ACCEPTED,
    buyerNote: "Sandbox offer — accepted with a short checkout window.",
    sellerNote: "Accepted. Pay soon!",
    expiresAt: windowOffset(LAPSES_MID_RUN),
    acceptedAt: hoursAgo(0),
    respondedAt: hoursAgo(0),
    checkoutDeadline: windowOffset(CHECKOUT_LAPSES_MID_RUN),
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(0),
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
  } as Partial<OfferDocument>,

  /**
   * PENDING. Two cases need this: withdrawing an offer, and the
   * "you already have an active offer on this item" rejection when the tester
   * tries to offer on the same listing again.
   */
  {
    id: "offer-tester-sandbox-pending",
    productId: "product-beyblade-original-driger-v",
    productTitle: "Beyblade Original Driger V",
    productSlug: "product-beyblade-original-driger-v",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-tester-qa",
    buyerName: "QA Tester",
    buyerEmail: "tester@letitrip.in",
    listedPrice: 1799,
    offerAmount: 1450,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Sandbox offer — still pending, withdraw it to test that path.",
    expiresAt: windowOffset(OUTLASTS_RUN),
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
  } as Partial<OfferDocument>,

  /**
   * The SELLER side. Every fixture above has the tester as the buyer, so
   * accept / decline / counter at /store/offers were unreachable for them —
   * you cannot respond to your own offer. This one is addressed TO the
   * tester's own sandbox store from a different persona.
   */
  {
    id: "offer-tester-sandbox-inbound",
    productId: "product-tester-standard-1",
    productTitle: "Test Gadget — Standard Listing #1",
    productSlug: "product-tester-standard-1",
    storeId: "store-tester-qa-seller",
    storeName: "Tester QA Seller",
    buyerUid: "user-yugi-muto",
    buyerName: "Mock User 3",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 150,
    offerAmount: 120,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Sandbox inbound offer — accept, counter, or decline it from your store dashboard.",
    expiresAt: windowOffset(OUTLASTS_RUN),
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
  } as Partial<OfferDocument>,
];
