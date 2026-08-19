/*
 * WHY: Seeds offers for the Beyblade marketplace — 8 offers across all statuses.
 * WHAT: pending (2), accepted (1), declined (1), countered (1), expired (1), withdrawn (1), paid (1).
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

import type { OfferDocument } from "../features/seller/schemas/firestore";
import { OfferStatusValues } from "../features/seller/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const offersSeedData: Partial<OfferDocument>[] = [
  // ── 1. PENDING — Rehan → Beyblade Arena — Burst Valkyrie ────────────────
  {
    id: "offer-yugi-burst-valkyrie-pending",
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst Valkyrie",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-yugi-muto",
    buyerName: "Rehan Sheikh",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 1899,
    offerAmount: 1500,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Would you accept ₹1,500 for the Burst Valkyrie?",
    expiresAt: daysFromNow(3),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },

  // ── 2. COUNTERED — Rehan → Beyblade Arena — Metal Storm Pegasus ─────────
  {
    id: "offer-yugi-metal-storm-pegasus-countered",
    productId: "product-beyblade-metal-storm-pegasus",
    productTitle: "Beyblade Metal Storm Pegasus",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-yugi-muto",
    buyerName: "Rehan Sheikh",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 2499,
    offerAmount: 2000,
    counterAmount: 2250,
    currency: "INR",
    status: OfferStatusValues.COUNTERED,
    buyerNote: "₹2,000 — will you take it?",
    sellerNote: "Best I can do is ₹2,250.",
    expiresAt: daysFromNow(2),
    respondedAt: daysAgo(1),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },

  // ── 3. PAID — Admin → Beyblade Arena — X Knife Shinobi (order placed) ───
  {
    id: "offer-admin-x-knife-shinobi-paid",
    productId: "product-beyblade-x-knife-shinobi",
    productTitle: "Beyblade X Knife Shinobi",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-admin-letitrip",
    buyerName: "LetItRip Admin",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 2999,
    offerAmount: 2600,
    lockedPrice: 2600,
    currency: "INR",
    status: OfferStatusValues.PAID,
    buyerNote: "Would you accept ₹2,600 for the X Knife Shinobi?",
    sellerNote: "Accepted. Thank you!",
    expiresAt: daysAgo(3),
    acceptedAt: daysAgo(12),
    respondedAt: daysAgo(12),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(11),
  },

  // ── 4. DECLINED — Rehan → Beyblade Arena — Burst Regalia Genesis ────────
  {
    id: "offer-yugi-regalia-genesis-declined",
    productId: "product-beyblade-burst-regalia-genesis",
    productTitle: "Beyblade Burst Regalia Genesis",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-yugi-muto",
    buyerName: "Rehan Sheikh",
    buyerEmail: "rehan.sheikh@gmail.com",
    listedPrice: 3499,
    offerAmount: 2500,
    currency: "INR",
    status: OfferStatusValues.DECLINED,
    buyerNote: "Offering ₹2,500 — slightly above my budget.",
    sellerNote: "Sorry, we cannot go below ₹3,200 for this piece.",
    expiresAt: daysAgo(5),
    respondedAt: daysAgo(8),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(8),
  },

  // ── 5. EXPIRED — Vivaan → Beyblade Arena — X Wizard Arrow ───────────────
  {
    id: "offer-kaiba-x-wizard-arrow-expired",
    productId: "product-beyblade-x-wizard-arrow",
    productTitle: "Beyblade X Wizard Arrow",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-seto-kaiba",
    buyerName: "Vivaan Kapoor",
    buyerEmail: "vivaan.kapoor@gmail.com",
    listedPrice: 1699,
    offerAmount: 1300,
    currency: "INR",
    status: OfferStatusValues.EXPIRED,
    buyerNote: "₹1,300 — let me know.",
    expiresAt: daysAgo(2),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(2),
  },

  // ── 6. WITHDRAWN — Admin → Beyblade Arena — Original Driger V ───────────
  {
    id: "offer-admin-driger-v-withdrawn",
    productId: "product-beyblade-original-driger-v",
    productTitle: "Beyblade Original Driger V",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-admin-letitrip",
    buyerName: "LetItRip Admin",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 1999,
    offerAmount: 1600,
    currency: "INR",
    status: OfferStatusValues.WITHDRAWN,
    buyerNote: "Offering ₹1,600 for the Driger V.",
    expiresAt: daysAgo(3),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
  },

  // ── 7. ACCEPTED — Vivaan → Beyblade Arena — Original Dranzer S (pending payment) ──
  {
    id: "offer-kaiba-dranzer-s-accepted",
    productId: "product-beyblade-original-dranzer-s",
    productTitle: "Beyblade Original Dranzer S",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-seto-kaiba",
    buyerName: "Vivaan Kapoor",
    buyerEmail: "vivaan.kapoor@gmail.com",
    listedPrice: 1799,
    offerAmount: 1500,
    lockedPrice: 1500,
    currency: "INR",
    status: OfferStatusValues.ACCEPTED,
    buyerNote: "₹1,500 final offer on the sealed Dranzer S.",
    sellerNote: "Accepted! Please complete payment within 24 hours.",
    expiresAt: daysFromNow(1),
    acceptedAt: daysAgo(0),
    respondedAt: daysAgo(0),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  },

  // ── 8. PENDING — Admin → Beyblade Arena — Metal Lightning L-Drago ───────
  {
    id: "offer-admin-l-drago-pending",
    productId: "auction-beyblade-metal-lightning-l-drago",
    productTitle: "Beyblade Metal Lightning L-Drago",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    buyerUid: "user-admin-letitrip",
    buyerName: "LetItRip Admin",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 5200,
    offerAmount: 4700,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Interested in this piece. Would you accept ₹4,700?",
    expiresAt: daysFromNow(3),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
