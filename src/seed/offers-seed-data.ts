/*
 * WHY: Offer fixtures. Production has none, so this is empty.
 * WHAT: Empty. The export and `withOfferSearchTxt` pipeline are kept.
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
 *   offersSeedData — Array of Partial<OfferPlain> for seed runner
 *
 * @tag domain:offers,seller
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { withOfferSearchTxt } from "./_helpers/search-txt-wrappers";
/*
 * 🛑 `OfferPlain`: these fixtures hold REAL plaintext and `seed-cli` encrypts
 * the PII fields on write through the same `OFFER_PII_FIELDS` map the
 * repository uses. The document type now declares those fields
 * `Encrypted<string>`, so typing this array as the document would assert that
 * these literals are ciphertext.
 */
import type { OfferPlain } from "../features/seller/schemas/firestore";
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

export const offersSeedData: Partial<OfferPlain>[] = [// ── 2a. Metal Storm Pegasus — ROUND 1 (superseded, not a walk-away) ─────
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
  },// Derived through the wrapper, never per record — an inline literal is how
// five product seed files shipped their last fixture with no tokens.
].map(withOfferSearchTxt);
