/*
 * WHY: Seeds offers for the Beyblade marketplace — every status, plus a real
 *      multi-round negotiation. Before W2 a counter-offer created an unlinked
 *      document, so no fixture could demonstrate a chain and the timeline had
 *      nothing to render.
 * WHAT: 10 offers. pending (2), accepted (1), declined (1), countered (1),
 *       expired (1), withdrawn (3 — one a genuine walk-away, two superseded
 *       rounds of the Metal Storm Pegasus chain), paid (1).
 *
 * ## The Metal Storm Pegasus chain
 *
 * Three linked documents ending at the pre-existing `…-countered` id, so the
 * final round keeps the id every other fixture and checklist case already
 * refers to and `appkit-seed delete` still cleans the whole chain up:
 *
 *   …-r1 (withdrawn, superseded by r2) → …-r2 (withdrawn, superseded by the
 *   countered offer) → …-countered (round 3, live)
 *
 * Two withdrawn plus one live keeps `hasActiveOffer` consistent, and three
 * rounds makes the 3-offer chain cap demonstrable.
 *
 * ## One fixture deliberately has NO statusHistory
 *
 * `offer-kaiba-x-wizard-arrow-expired` is left history-less on purpose — see
 * the comment at that fixture. It is the only way the timeline's legacy branch
 * is testable, and it is the exact shape of every offer written before W2.
 *
 * EXPORTS:
 *   offersSeedData — Array of Partial<OfferDocument> for seed runner
 *
 * @tag domain:offers,seller
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { withOfferSearchTxt } from "./_helpers/search-txt-wrappers";
import type { OfferDocument } from "../features/seller/schemas/firestore";
import { OfferStatusValues } from "../features/seller/schemas/firestore";
import type { StatusChangeEntry } from "../_internal/shared/history/index";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

/**
 * One history entry, in the same delta shape `withHistory()` produces at
 * runtime — so a seeded timeline and a real one render identically.
 *
 * `actorUid` is the only identity a history entry may ever carry. Never a name
 * or an email: `encryptPiiFields` is a flat top-level loop that does not
 * descend into arrays, so a PII value placed inside `statusHistory` would be
 * written to Firestore in plaintext and never decrypted on the way back out.
 */
function entry(
  at: Date,
  actorRole: StatusChangeEntry["actorRole"],
  trigger: string,
  changes: StatusChangeEntry["changes"],
  extra: { actorUid?: string; note?: string; reason?: string } = {},
): StatusChangeEntry {
  return { at, actorRole, trigger, changes, ...extra };
}

const BUYER_YUGI = "user-yugi-muto";
const BUYER_KAIBA = "user-seto-kaiba";
const BUYER_ADMIN = "user-admin-letitrip";
const STORE = "store-beyblade-arena";
const PEGASUS_CHAIN_ROOT = "offer-yugi-metal-storm-pegasus-r1";

export const offersSeedData: Partial<OfferDocument>[] = [
  // ── 1. PENDING — Rehan → Beyblade Arena — Burst Valkyrie ────────────────
  {
    id: "offer-yugi-burst-valkyrie-pending",
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst Valkyrie",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-yugi-muto",
    buyerName: "Mock User 3",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 999,
    offerAmount: 780,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Would you accept ₹780 for the Burst Valkyrie?",
    expiresAt: daysFromNow(3),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    statusHistory: [
      entry(daysAgo(0), "buyer", "makeOffer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: null, to: 780 },
      }, { actorUid: BUYER_YUGI, note: "Would you accept ₹780 for the Burst Valkyrie?" }),
    ],
  },

  // ── 2. COUNTERED — Rehan → Beyblade Arena — Metal Storm Pegasus ─────────
  {
    id: "offer-yugi-metal-storm-pegasus-countered",
    productId: "product-beyblade-metal-storm-pegasus",
    productTitle: "Beyblade Metal Storm Pegasus",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-yugi-muto",
    buyerName: "Mock User 3",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 1299,
    offerAmount: 1000,
    counterAmount: 1150,
    currency: "INR",
    status: OfferStatusValues.COUNTERED,
    buyerNote: "₹1,000 — will you take it?",
    sellerNote: "Best I can do is ₹1,150.",
    expiresAt: daysFromNow(2),
    respondedAt: daysAgo(1),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    // Round 3 — the live end of the chain. Keeping the original id here (rather
    // than appending an `…-r3`) means every existing reference and checklist
    // href still resolves, and `appkit-seed delete` still removes the lot.
    previousOfferId: "offer-yugi-metal-storm-pegasus-r2",
    chainRootOfferId: PEGASUS_CHAIN_ROOT,
    counterRound: 3,
    statusHistory: [
      entry(daysAgo(3), "buyer", "counterOfferByBuyer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: 900, to: 1000 },
        previousOfferId: { from: null, to: "offer-yugi-metal-storm-pegasus-r2" },
      }, { actorUid: BUYER_YUGI, note: "₹1,000 — will you take it?" }),
      entry(daysAgo(1), "seller", "respondToOffer:counter", {
        status: { from: "pending", to: "countered" },
        counterAmount: { from: null, to: 1150 },
      }, { actorUid: STORE, note: "Best I can do is ₹1,150." }),
    ],
  },

  // ── 2a. Metal Storm Pegasus — ROUND 1 (superseded, not a walk-away) ─────
  {
    id: PEGASUS_CHAIN_ROOT,
    productId: "product-beyblade-metal-storm-pegasus",
    productTitle: "Beyblade Metal Storm Pegasus",
    storeId: STORE,
    storeName: "Beyblade Arena",
    buyerUid: BUYER_YUGI,
    buyerName: "Mock User 3",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 1299,
    offerAmount: 800,
    counterAmount: 1200,
    currency: "INR",
    // `withdrawn` PLUS `supersededByOfferId` is what makes the timeline render
    // this round neutral ("Superseded") instead of negative ("Withdrawn").
    // `superseded` is a render key, deliberately never an eighth OfferStatus —
    // an eighth value would add a filter chip matching zero stored rows.
    status: OfferStatusValues.WITHDRAWN,
    buyerNote: "Starting at ₹800 for the Storm Pegasus.",
    sellerNote: "₹1,200 and it's yours.",
    expiresAt: daysAgo(6),
    respondedAt: daysAgo(7),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
    supersededByOfferId: "offer-yugi-metal-storm-pegasus-r2",
    chainRootOfferId: PEGASUS_CHAIN_ROOT,
    counterRound: 1,
    statusHistory: [
      entry(daysAgo(9), "buyer", "makeOffer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: null, to: 800 },
      }, { actorUid: BUYER_YUGI, note: "Starting at ₹800 for the Storm Pegasus." }),
      entry(daysAgo(8), "seller", "respondToOffer:counter", {
        status: { from: "pending", to: "countered" },
        counterAmount: { from: null, to: 1200 },
      }, { actorUid: STORE, note: "₹1,200 and it's yours." }),
      entry(daysAgo(7), "buyer", "counterOfferByBuyer:supersede", {
        status: { from: "countered", to: "withdrawn" },
        supersededByOfferId: { from: null, to: "offer-yugi-metal-storm-pegasus-r2" },
      }, { actorUid: BUYER_YUGI, reason: "Superseded by the buyer's counter" }),
    ],
  },

  // ── 2b. Metal Storm Pegasus — ROUND 2 (superseded) ──────────────────
  {
    id: "offer-yugi-metal-storm-pegasus-r2",
    productId: "product-beyblade-metal-storm-pegasus",
    productTitle: "Beyblade Metal Storm Pegasus",
    storeId: STORE,
    storeName: "Beyblade Arena",
    buyerUid: BUYER_YUGI,
    buyerName: "Mock User 3",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 1299,
    offerAmount: 900,
    counterAmount: 1175,
    currency: "INR",
    status: OfferStatusValues.WITHDRAWN,
    buyerNote: "Can you meet me at ₹900?",
    sellerNote: "₹1,175 is as low as I can go.",
    expiresAt: daysAgo(3),
    respondedAt: daysAgo(3),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(3),
    previousOfferId: PEGASUS_CHAIN_ROOT,
    supersededByOfferId: "offer-yugi-metal-storm-pegasus-countered",
    chainRootOfferId: PEGASUS_CHAIN_ROOT,
    counterRound: 2,
    statusHistory: [
      entry(daysAgo(7), "buyer", "counterOfferByBuyer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: 800, to: 900 },
        previousOfferId: { from: null, to: PEGASUS_CHAIN_ROOT },
      }, { actorUid: BUYER_YUGI, note: "Can you meet me at ₹900?" }),
      entry(daysAgo(4), "seller", "respondToOffer:counter", {
        status: { from: "pending", to: "countered" },
        counterAmount: { from: null, to: 1175 },
      }, { actorUid: STORE, note: "₹1,175 is as low as I can go." }),
      entry(daysAgo(3), "buyer", "counterOfferByBuyer:supersede", {
        status: { from: "countered", to: "withdrawn" },
        supersededByOfferId: { from: null, to: "offer-yugi-metal-storm-pegasus-countered" },
      }, { actorUid: BUYER_YUGI, reason: "Superseded by the buyer's counter" }),
    ],
  },

  // ── 3. PAID — Admin → Beyblade Arena — X Knife Shinobi (order placed) ───
  {
    id: "offer-admin-x-knife-shinobi-paid",
    productId: "product-beyblade-x-knife-shinobi",
    productTitle: "Beyblade X Knife Shinobi",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-admin-letitrip",
    buyerName: "Mock User 1",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 949,
    offerAmount: 800,
    lockedPrice: 800,
    currency: "INR",
    status: OfferStatusValues.PAID,
    buyerNote: "Would you accept ₹800 for the X Knife Shinobi?",
    sellerNote: "Accepted. Thank you!",
    expiresAt: daysAgo(3),
    checkoutDeadline: daysAgo(10),
    acceptedAt: daysAgo(12),
    respondedAt: daysAgo(12),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(11),
    statusHistory: [
      entry(daysAgo(14), "buyer", "makeOffer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: null, to: 800 },
      }, { actorUid: BUYER_ADMIN, note: "Would you accept ₹800 for the X Knife Shinobi?" }),
      entry(daysAgo(12), "seller", "respondToOffer:accept", {
        status: { from: "pending", to: "accepted" },
        lockedPrice: { from: null, to: 800 },
      }, { actorUid: STORE, note: "Accepted. Thank you!" }),
      entry(daysAgo(11), "system", "finalizeLockedLines", {
        status: { from: "accepted", to: "paid" },
      }),
    ],
  },

  // ── 4. DECLINED — Rehan → Beyblade Arena — Burst Regalia Genesis ────────
  {
    id: "offer-yugi-regalia-genesis-declined",
    productId: "product-beyblade-burst-regalia-genesis",
    productTitle: "Beyblade Burst Regalia Genesis",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-yugi-muto",
    buyerName: "Mock User 3",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 1399,
    offerAmount: 1050,
    currency: "INR",
    status: OfferStatusValues.DECLINED,
    // Both notes quoted prices from the pre-Beyblade catalogue this seed was
    // narrowed away from, so a ₹1,050 offer read as "offering ₹2,500".
    buyerNote: "Offering ₹1,050 — slightly above my budget.",
    sellerNote: "Sorry, we cannot go below ₹1,300 for this piece.",
    expiresAt: daysAgo(5),
    respondedAt: daysAgo(8),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(8),
    statusHistory: [
      entry(daysAgo(10), "buyer", "makeOffer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: null, to: 1050 },
      }, { actorUid: BUYER_YUGI, note: "Offering ₹1,050 — slightly above my budget." }),
      entry(daysAgo(8), "seller", "respondToOffer:decline", {
        status: { from: "pending", to: "declined" },
      }, { actorUid: STORE, note: "Sorry, we cannot go below ₹1,300 for this piece." }),
    ],
  },

  // ── 5. EXPIRED — Vivaan → Beyblade Arena — X Wizard Arrow ───────────────
  {
    id: "offer-kaiba-x-wizard-arrow-expired",
    productId: "product-beyblade-x-wizard-arrow",
    productTitle: "Beyblade X Wizard Arrow",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-seto-kaiba",
    buyerName: "Mock User 2",
    buyerEmail: "vivaan.kapoor@gmail.com",
    listedPrice: 899,
    offerAmount: 700,
    currency: "INR",
    status: OfferStatusValues.EXPIRED,
    buyerNote: "₹700 — let me know.",
    expiresAt: daysAgo(2),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(2),
    // NO `statusHistory`, deliberately. This is the ONLY fixture exercising the
    // timeline's legacy branch, and it is exactly the shape of every offer
    // written before W2. Its "Expired" step renders with an em-dash and no
    // date — `expireMany` never wrote a timestamp, `updatedAt` means "last
    // write of any kind", and `expiresAt` is a deadline rather than an event,
    // so any date shown here would be fabricated. Do not "complete" this one.
  },

  // ── 6. WITHDRAWN — Admin → Beyblade Arena — Original Driger V ───────────
  {
    id: "offer-admin-driger-v-withdrawn",
    productId: "product-beyblade-original-driger-v",
    productTitle: "Beyblade Original Driger V",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-admin-letitrip",
    buyerName: "Mock User 1",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 1799,
    offerAmount: 1450,
    currency: "INR",
    status: OfferStatusValues.WITHDRAWN,
    buyerNote: "Offering ₹1,450 for the Driger V.",
    expiresAt: daysAgo(3),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
    // No `supersededByOfferId` — a genuine walk-away, so this renders as
    // "Withdrawn" (negative). Contrast with the two Pegasus rounds above.
    statusHistory: [
      entry(daysAgo(7), "buyer", "makeOffer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: null, to: 1450 },
      }, { actorUid: BUYER_ADMIN, note: "Offering ₹1,450 for the Driger V." }),
      entry(daysAgo(5), "buyer", "withdrawOffer", {
        status: { from: "pending", to: "withdrawn" },
      }, { actorUid: BUYER_ADMIN }),
    ],
  },

  // ── 7. ACCEPTED — Vivaan → Beyblade Arena — Original Dranzer S (pending payment) ──
  {
    id: "offer-kaiba-dranzer-s-accepted",
    productId: "product-beyblade-original-dranzer-s",
    productTitle: "Beyblade Original Dranzer S",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-seto-kaiba",
    buyerName: "Mock User 2",
    buyerEmail: "vivaan.kapoor@gmail.com",
    listedPrice: 1499,
    offerAmount: 1250,
    lockedPrice: 1250,
    currency: "INR",
    status: OfferStatusValues.ACCEPTED,
    buyerNote: "₹1,250 final offer on the sealed Dranzer S.",
    sellerNote: "Accepted! Please complete payment within 24 hours.",
    expiresAt: daysFromNow(1),
    // Without this the offer is invisible to findExpiredAccepted() and the
    // seller/admin "Buyer must pay by" row never renders — the field is what
    // makes an accepted offer a CLAIM ON A CLOCK rather than an open promise.
    checkoutDeadline: daysFromNow(2),
    acceptedAt: daysAgo(0),
    respondedAt: daysAgo(0),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
    statusHistory: [
      entry(daysAgo(1), "buyer", "makeOffer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: null, to: 1250 },
      }, { actorUid: BUYER_KAIBA, note: "₹1,250 final offer on the sealed Dranzer S." }),
      entry(daysAgo(0), "seller", "respondToOffer:accept", {
        status: { from: "pending", to: "accepted" },
        lockedPrice: { from: null, to: 1250 },
        checkoutDeadline: { from: null, to: daysFromNow(2) },
      }, { actorUid: STORE, note: "Accepted! Please complete payment within 24 hours." }),
    ],
  },

  // ── 8. PENDING — Admin → Beyblade Arena — Metal Lightning L-Drago ───────
  {
    id: "offer-admin-flame-sagittario-pending",
    productId: "product-beyblade-metal-flame-sagittario",
    productTitle: "Beyblade Metal Flame Sagittario",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-admin-letitrip",
    buyerName: "Mock User 1",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 1199,
    offerAmount: 950,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Interested in this piece. Would you accept ₹950?",
    expiresAt: daysFromNow(3),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    statusHistory: [
      entry(daysAgo(1), "buyer", "makeOffer", {
        status: { from: null, to: "pending" },
        offerAmount: { from: null, to: 950 },
      }, { actorUid: BUYER_ADMIN, note: "Interested in this piece. Would you accept ₹950?" }),
    ],
  },
// Derived through the wrapper, never per record — an inline literal is how
// five product seed files shipped their last fixture with no tokens.
].map(withOfferSearchTxt);
