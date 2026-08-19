/*
 * WHY: Seeds scammer profiles for the collectibles marketplace — 3 profiles covering the full status workflow.
 * WHAT: 1 verified, 1 pending_review, 1 rejected. Fictional Beyblade-related scam scenarios.
 *
 * EXPORTS:
 *   scammersSeedData — Array of Partial<ScammerDocument> for seed runner
 *
 * @tag domain:scams
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { ScammerDocument } from "../features/scams/schemas/firestore";
import { SCAMMER_FIELDS } from "../constants/field-names";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date("2026-05-10T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const scammersSeedData: Partial<ScammerDocument>[] = [
  // ── 1. Verified — advance payment ghost ──────────────────────────────────────
  {
    id: "scammer-fake-lob-seller",
    seoSlug: "scammer-fake-lob-seller",
    displayNames: ["Bey_King_India", "Rare Blades Official"],
    phones: ["9876543210", "8765432109"],
    upiIds: ["9876543210@paytm", "beykingblades@okicici"],
    emails: ["beykingblades.fake@gmail.com"],
    socialMedia: [
      { platform: "instagram", handle: "bey_king_india_official", url: "https://instagram.com/bey_king_india_official" },
      { platform: "whatsapp", handle: "9876543210" },
    ],
    scamType: "advance_payment_ghost",
    scamPlatform: "whatsapp",
    description:
      "Seller listed an original-series Dranzer S sealed launcher set on a Facebook group for ₹2,500 — significantly below market. When I messaged, he asked for ₹500 advance to 'hold' the set before shipping. After I paid via UPI (9876543210@paytm), he went silent. The account name on UPI matched 'Bey King'. Later found 2 more people in the same group who had the same experience with the same UPI ID.",
    amountLost: 500,
    itemInvolved: "Beyblade Original Dranzer S — Sealed Launcher Set",
    evidence: [seedExtMedia("https://picsum.photos/seed/scammer-evidence-beyking-chat-screenshot-20260402/800/600")],
    reportedBy: "user-yugi-muto",
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
    id: "scammer-fake-takara-tomy-preorder",
    seoSlug: "scammer-fake-takara-tomy-preorder",
    displayNames: ["TakaraTomy_Agent_India", "TT India Blades"],
    phones: ["7654321098"],
    upiIds: ["takaratomyagentindia@ybl"],
    emails: ["takaratomy.agent.india@gmail.com"],
    socialMedia: [
      { platform: "instagram", handle: "takaratomy_agent_india_official" },
      { platform: "telegram", handle: "takaratomy_agent_india" },
    ],
    scamType: "fake_preorder_listing",
    scamPlatform: "instagram",
    description:
      "Account posed as an authorized pre-order agent for the upcoming Beyblade X BX-08 wave. Collected ₹800 from me for a 'guaranteed allocation slot' via UPI. Instagram profile had ~4,000 followers (likely bought) and fake order screenshots. After payment, the account blocked me. Similar reports found on Reddit r/BeybladeIndia.",
    amountLost: 800,
    itemInvolved: "Beyblade X BX-08 Wave (fake pre-order)",
    evidence: [],
    reportedBy: "user-seto-kaiba",
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
      "Sold a sealed Beyblade Burst Regalia Genesis on OLX, buyer claims item never arrived but tracking shows delivered. Buyer opened a scam report. Seller provided courier tracking + photograph of sealed package at drop-off. Report rejected after review.",
    amountLost: 0,
    itemInvolved: "Beyblade Burst Regalia Genesis — Sealed",
    evidence: [],
    reportedBy: "user-yugi-muto",
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
