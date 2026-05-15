/**
 * Scammer Profiles Seed Data — LetItRip Scam Registry
 *
 * 3 seed profiles covering the full status workflow:
 *   1. scammer-rahul-advance-payment     — verified (fully populated, used for UI dev)
 *   2. scammer-fake-pokemon-seller-upi   — pending_review (tests admin queue)
 *   3. scammer-mistaken-identity-case    — rejected (tests false-report workflow)
 *
 * Subcollection seed (incidents, comments, contests) is tracked as part of SCAM9.
 * The denormalized count fields (incidentCount, commentCount, contestCount) on
 * these documents reflect what would exist after subcollection seed runs.
 *
 * All phones / UPI IDs / emails are fictional but formatted like real Indian data.
 * Slug prefix: scammer-
 */

import type { ScammerDocument } from "../features/scams/schemas/firestore";
import { SCAMMER_FIELDS } from "../constants/field-names";

const NOW = new Date("2026-05-10T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const scammersSeedData: Partial<ScammerDocument>[] = [
  // ── 1. Verified — advance payment ghost ──────────────────────────────────────
  {
    id: "scammer-rahul-advance-payment",
    seoSlug: "scammer-rahul-advance-payment",
    displayNames: ["Rahul Sharma", "RS Toys", "RS Trading"],
    phones: ["9876543210", "8765432109"],
    upiIds: ["9876543210@paytm", "rstoys@okicici"],
    emails: ["rstoys.fake@gmail.com"],
    socialMedia: [
      { platform: "instagram", handle: "rs_toys_official", url: "https://instagram.com/rs_toys_official" },
      { platform: "whatsapp", handle: "9876543210" },
    ],
    scamType: "advance_payment_ghost",
    scamPlatform: "whatsapp",
    description:
      "Seller listed a Charizard VSTAR SAR on a Facebook group for ₹3,500 — significantly below market. When I messaged, he asked for ₹1,000 advance to 'hold' the card before shipping. After I paid via UPI (9876543210@paytm), he went silent. The account name on UPI matched 'Rahul S'. Later found 2 more people in the same group who had the same experience with the same UPI ID.",
    amountLost: 100000, // ₹1,000 in paise
    itemInvolved: "Charizard VSTAR SAR (Pokémon Scarlet & Violet)",
    evidence: ["/media/scammer-evidence-rahul-chat-screenshot-20260402.jpg"],
    reportedBy: "user-rahul-sharma",
    reportedByAnon: false,
    status: SCAMMER_FIELDS.STATUS_VALUES.VERIFIED,
    verifiedBy: "user-admin-letitrip",
    verifiedAt: daysAgo(20),
    verificationNote: "Confirmed 3 separate victims with same UPI ID. Profile verified.",
    relatedScammerIds: [],
    mergedFromIds: [],
    tags: ["repeat_offender", "high_value"],
    views: 147,
    incidentCount: 2,
    commentCount: 3,
    contestCount: 0,
    isContested: false,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(20),
  },

  // ── 2. Pending review — fake pre-order listing ────────────────────────────────
  {
    id: "scammer-fake-pokemon-seller-upi",
    seoSlug: "scammer-fake-pokemon-seller-upi",
    displayNames: ["Pokemon_King_India", "PK India Toys"],
    phones: ["7654321098"],
    upiIds: ["pokemonkingindia@ybl"],
    emails: ["pokemon.king.india@gmail.com"],
    socialMedia: [
      { platform: "instagram", handle: "pokemon_king_india_official" },
      { platform: "telegram", handle: "pokemon_king_india" },
    ],
    scamType: "fake_preorder_listing",
    scamPlatform: "instagram",
    description:
      "Account posed as an authorized pre-order agent for the upcoming Pokémon Scarlet & Violet 151 reprint. Collected ₹2,200 from me for a 'guaranteed slot' via UPI. Instagram profile had ~4,000 followers (likely bought) and fake order screenshots. After payment, the account blocked me. Similar reports found on Reddit r/IndianPokemon.",
    amountLost: 220000, // ₹2,200 in paise
    itemInvolved: "Pokémon 151 Reprint Pre-order (fake)",
    evidence: [],
    reportedBy: "user-arjun-singh",
    reportedByAnon: true,
    status: "pending_review",
    relatedScammerIds: [],
    mergedFromIds: [],
    tags: [],
    views: 12,
    incidentCount: 0,
    commentCount: 0,
    contestCount: 0,
    isContested: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // ── 3. Rejected — mistaken identity ───────────────────────────────────────────
  {
    id: "scammer-mistaken-identity-case",
    seoSlug: "scammer-mistaken-identity-case",
    displayNames: ["Vikram M", "Vikram Mehta"],
    phones: ["9988776655"],
    upiIds: ["vikramm@okaxis"],
    emails: [],
    socialMedia: [],
    scamType: "empty_box_ship",
    scamPlatform: "olx",
    description:
      "Sold a Hot Wheels set on OLX, buyer claims item never arrived but tracking shows delivered. Buyer opened a scam report. Seller provided courier tracking + photograph of sealed package at drop-off. Report rejected after review.",
    amountLost: 0,
    itemInvolved: "Hot Wheels Retro Entertainment Set",
    evidence: [],
    reportedBy: "user-anjali-verma",
    reportedByAnon: false,
    status: SCAMMER_FIELDS.STATUS_VALUES.REJECTED,
    verifiedBy: "user-admin-letitrip",
    verifiedAt: daysAgo(8),
    verificationNote:
      "Seller provided courier proof. Likely delivery dispute, not fraud. Rejected.",
    relatedScammerIds: [],
    mergedFromIds: [],
    tags: [],
    views: 4,
    incidentCount: 0,
    commentCount: 1,
    contestCount: 1,
    isContested: false,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(8),
  },
];
