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

/*
 * 🛑 RE-POPULATED 2026-10-30 as EXPLICIT TEST DATA, with the owner's
 * confirmation for this audit sweep.
 */
const NOW = new Date();
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawOffersSeedData: Partial<OfferPlain>[] = [
  {
    id: "offer-valkyrie-pending",
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst B-34 Victory Valkyrie Boost Variable",
    buyerUid: "user-meera-bey",
    buyerName: "Meera Blader",
    buyerEmail: "meera.blader@gmail.com",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    offerAmount: 800,
    listedPrice: 999,
    currency: "INR",
    status: "pending",
    expiresAt: daysFromNow(2),
  },
  {
    id: "offer-xtreme-stadium-accepted",
    productId: "beyblade-x-xtreme-stadium-bx-10-copy",
    productTitle: "Beyblade X Xtreme Stadium (BX-10) (Copy)",
    buyerUid: "user-rohit-collector",
    buyerName: "Rohit Collector",
    buyerEmail: "rohit.collect@gmail.com",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    offerAmount: 4000,
    listedPrice: 4500,
    lockedPrice: 4000,
    currency: "INR",
    status: "accepted",
    expiresAt: daysFromNow(3),
    acceptedAt: daysAgo(1),
    checkoutDeadline: daysFromNow(2),
  },
  {
    id: "offer-regalia-genesis-countered",
    productId: "product-beyblade-burst-regalia-genesis",
    productTitle: "Beyblade Burst Xeno Xcalibur Magnet Loop",
    buyerUid: "user-ananya-collector",
    buyerName: "Ananya Patel",
    buyerEmail: "ananya.patel@gmail.com",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    offerAmount: 1000,
    listedPrice: 1399,
    counterAmount: 1200,
    currency: "INR",
    status: "countered",
    expiresAt: daysFromNow(2),
    respondedAt: daysAgo(1),
  },
  {
    id: "offer-valtryek-declined",
    productId: "product-beyblade-burst-valtryek-v3-sold-out",
    productTitle: "Beyblade Burst God Valkyrie 6Vortex Reboot (Sold Out)",
    buyerUid: "user-meera-bey",
    buyerName: "Meera Blader",
    buyerEmail: "meera.blader@gmail.com",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    offerAmount: 500,
    listedPrice: 899,
    currency: "INR",
    status: "declined",
    expiresAt: daysAgo(1),
    respondedAt: daysAgo(2),
    sellerNote: "Too low for an already-discounted sold-out item.",
  },
];

export const offersSeedData = _rawOffersSeedData.map(withOfferSearchTxt);
