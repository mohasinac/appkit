/*
 * WHY: Seeds offers for YGO marketplace — 8 offers across all statuses.
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
  // ── 1. PENDING — Yugi → Kaiba — Dark Magician Girl IOC ──────────────────
  {
    id: "offer-yugi-dmg-ioc-pending",
    productId: "product-dark-magician-girl-ioc",
    productTitle: "Dark Magician Girl IOC 1st Edition (NM)",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    buyerUid: "user-yugi-muto",
    buyerName: "Yugi Muto",
    buyerEmail: "yugi.muto@letitrip.in",
    listedPrice: 8999,
    offerAmount: 7500,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Would you accept ₹7,500 for the Dark Magician Girl?",
    expiresAt: daysFromNow(3),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },

  // ── 2. COUNTERED — Yugi → Kaiba — Pot of Greed LOB ──────────────────────
  {
    id: "offer-yugi-pot-of-greed-countered",
    productId: "product-pot-of-greed-lob",
    productTitle: "Pot of Greed LOB 1st Edition (NM)",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    buyerUid: "user-yugi-muto",
    buyerName: "Yugi Muto",
    buyerEmail: "yugi.muto@letitrip.in",
    listedPrice: 14999,
    offerAmount: 12000,
    counterAmount: 13500,
    currency: "INR",
    status: OfferStatusValues.COUNTERED,
    buyerNote: "₹12,000 — will you take it?",
    sellerNote: "Best I can do is ₹13,500.",
    expiresAt: daysFromNow(2),
    respondedAt: daysAgo(1),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },

  // ── 3. PAID — Admin → Kaiba — Chaos Emperor Dragon IOC (order placed) ───
  {
    id: "offer-admin-ced-ioc-paid",
    productId: "product-chaos-emperor-dragon-ioc",
    productTitle: "Chaos Emperor Dragon — Envoy of the End IOC 1st Ed",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    buyerUid: "user-admin-letitrip",
    buyerName: "LetItRip Admin",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 24999,
    offerAmount: 22000,
    lockedPrice: 22000,
    currency: "INR",
    status: OfferStatusValues.PAID,
    buyerNote: "Would you accept ₹22,000 for the CED?",
    sellerNote: "Accepted. Thank you!",
    expiresAt: daysAgo(3),
    acceptedAt: daysAgo(12),
    respondedAt: daysAgo(12),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(11),
  },

  // ── 4. DECLINED — Yugi → Admin — Mirror Force MRD ───────────────────────
  {
    id: "offer-yugi-mirror-force-declined",
    productId: "product-mirror-force-mrd-1st",
    productTitle: "Mirror Force MRD 1st Edition (NM)",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    buyerUid: "user-yugi-muto",
    buyerName: "Yugi Muto",
    buyerEmail: "yugi.muto@letitrip.in",
    listedPrice: 15000,
    offerAmount: 10000,
    currency: "INR",
    status: OfferStatusValues.DECLINED,
    buyerNote: "Offering ₹10,000 — slightly above my budget.",
    sellerNote: "Sorry, we cannot go below ₹13,999 for this card.",
    expiresAt: daysAgo(5),
    respondedAt: daysAgo(8),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(8),
  },

  // ── 5. EXPIRED — Kaiba → Admin — Raigeki LOB ────────────────────────────
  {
    id: "offer-kaiba-raigeki-expired",
    productId: "product-raigeki-lob-nm",
    productTitle: "Raigeki LOB 1st Edition (NM)",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    buyerUid: "user-seto-kaiba",
    buyerName: "Seto Kaiba",
    buyerEmail: "seto.kaiba@letitrip.in",
    listedPrice: 7999,
    offerAmount: 6000,
    currency: "INR",
    status: OfferStatusValues.EXPIRED,
    buyerNote: "₹6,000 — let me know.",
    expiresAt: daysAgo(2),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(2),
  },

  // ── 6. WITHDRAWN — Admin → Kaiba — Exodia Right Arm ─────────────────────
  {
    id: "offer-admin-exodia-arm-withdrawn",
    productId: "product-exodia-right-arm-lob",
    productTitle: "Right Arm of the Forbidden One LOB 1st Ed",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    buyerUid: "user-admin-letitrip",
    buyerName: "LetItRip Admin",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 4999,
    offerAmount: 4000,
    currency: "INR",
    status: OfferStatusValues.WITHDRAWN,
    buyerNote: "Offering ₹4,000 for the Right Arm piece.",
    expiresAt: daysAgo(3),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
  },

  // ── 7. ACCEPTED — Kaiba → Admin — Starter Deck Yugi (pending payment) ───
  {
    id: "offer-kaiba-starter-deck-accepted",
    productId: "product-starter-deck-yugi-sealed",
    productTitle: "Starter Deck Yugi — Sealed (2002)",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    buyerUid: "user-seto-kaiba",
    buyerName: "Seto Kaiba",
    buyerEmail: "seto.kaiba@letitrip.in",
    listedPrice: 5999,
    offerAmount: 4999,
    lockedPrice: 4999,
    currency: "INR",
    status: OfferStatusValues.ACCEPTED,
    buyerNote: "₹4,999 final offer on the sealed Starter Deck.",
    sellerNote: "Accepted! Please complete payment within 24 hours.",
    expiresAt: daysFromNow(1),
    acceptedAt: daysAgo(0),
    respondedAt: daysAgo(0),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  },

  // ── 8. PENDING — Admin → Kaiba — Blue-Eyes Ultimate Dragon ──────────────
  {
    id: "offer-admin-beud-pending",
    productId: "product-blue-eyes-ultimate-dragon",
    productTitle: "Blue-Eyes Ultimate Dragon LOB 1st Ed",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    buyerUid: "user-admin-letitrip",
    buyerName: "LetItRip Admin",
    buyerEmail: "admin@letitrip.in",
    listedPrice: 39999,
    offerAmount: 35000,
    currency: "INR",
    status: OfferStatusValues.PENDING,
    buyerNote: "Interested in this piece. Would you accept ₹35,000?",
    expiresAt: daysFromNow(3),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
