/*
 * WHY: Seeds scammer profiles for the collectibles marketplace — 5 profiles covering the full status workflow
 *      plus real fixtures for the "related scammer profiles" feature (2026-08-19).
 * WHAT: 3 verified, 1 pending_review, 1 rejected. Fictional Beyblade-related scam scenarios.
 *       Profiles #1 and #4 share scamType "advance_payment_ghost" (verified "Similar Scam Reports"
 *       discovery). Profiles #4 and #5 cross-link via relatedScammerIds (verified "Related Profiles" —
 *       same operator, two aliases) — deliberately NOT linked to #1, since #1 is a different person
 *       who happens to use the same scam pattern, not the same identity.
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
import { withScammerSearchTxt } from "./_helpers/search-txt-wrappers";
import { SCAMMER_FIELDS } from "../constants/field-names";
import { seedPhoto } from "./_helpers/media";
import type { FieldChange, StatusChangeEntry } from "../_internal/shared/history/types";

const NOW = new Date("2026-05-10T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/**
 * A timeline entry for the W18 `statusHistory` fixtures.
 *
 * 🛑 `actorUid` only. A scammer profile is built ENTIRELY out of identifying
 * details, which is why `SCAMMER_HISTORY_PII_FIELDS` is the longest scrub
 * list of any adopter — a fixture carrying a name here would be modelling the
 * exact leak the primitive exists to prevent.
 */
function entry(
  at: Date,
  actorRole: "system" | "admin",
  trigger: string,
  changes: Record<string, FieldChange>,
  extra?: { reason?: string; note?: string; actorUid?: string },
): StatusChangeEntry {
  return { at, actorRole, trigger, changes, ...extra };
}

// Annotated HERE, not on the export, so the literal is contextually typed as
// Partial<ScammerDocument> before `.map` sees it. Without this TS infers a
// union of the individual object shapes and rejects the wrapper's generic —
// and the error points at the map call rather than at the field that actually
// diverged.
const scammerRows: Partial<ScammerDocument>[] = [
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
    evidence: [seedPhoto("scammer-evidence-beyking-chat-screenshot-20260402", 800, 600)],
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
    /*
     * pending_review -> rejected, with the note that decided it.
     *
     * `verifiedBy`/`verifiedAt` hold only the LAST decision, so a profile
     * that was verified, removed, then re-verified kept no trace of the
     * middle. This is the fixture the "decision history" panel reads.
     */
    statusHistory: [
      entry(daysAgo(15), "system", "publicScamReport", {
        status: { from: null, to: "pending_review" },
      }),
      entry(
        daysAgo(8),
        "admin",
        "adminScammerPatch",
        {
          status: { from: "pending_review", to: "rejected" },
          verifiedBy: { from: null, to: "user-admin-letitrip" },
          verificationNote: {
            from: null,
            to: "Seller provided courier proof. Likely delivery dispute, not fraud. Rejected.",
          },
        },
        {
          actorUid: "user-admin-letitrip",
          reason: "Seller provided courier proof. Likely delivery dispute, not fraud. Rejected.",
        },
      ),
    ],
  },

  // ── 4. Verified — advance payment ghost (same scamType as #1, different person) ──
  {
    id: "scammer-fake-metal-fusion-preorder-agent",
    seoSlug: "scammer-fake-metal-fusion-preorder-agent",
    displayNames: ["MetalFusion_PreorderAgent", "MF Beyblade Imports"],
    phones: ["9123456780"],
    upiIds: ["mfpreorderagent@ybl"],
    emails: ["mf.preorder.agent@gmail.com"],
    socialMedia: [
      { platform: "whatsapp", handle: "9123456780" },
    ],
    scamType: "advance_payment_ghost",
    scamPlatform: "whatsapp",
    description:
      "Ran a WhatsApp broadcast offering a bulk import batch of Metal Fight Beyblade tops at below-market prices, collecting ₹650 'booking' advances via UPI before shipping. Went silent after payment. Same operator resurfaced days later under a backup Telegram account (see related profile) using an identical script.",
    amountLost: 650,
    itemInvolved: "Metal Fight Beyblade BB-43 Flame Sagittario — bulk import batch",
    evidence: [seedPhoto("scammer-evidence-mf-preorder-agent-chat-20260420", 800, 600)],
    reportedBy: "user-seto-kaiba",
    reportedByAnon: false,
    status: SCAMMER_FIELDS.STATUS_VALUES.VERIFIED,
    verifiedBy: "user-admin-letitrip",
    verifiedAt: daysAgo(10),
    verificationNote: "Confirmed via chat logs; UPI/phone pattern matches the linked backup-account profile.",
    relatedScammerIds: ["scammer-fake-metal-fusion-backup-account"],
    mergedFromIds: [],
    tags: ["repeat_offender"],
    views: 58,
    incidentCount: 0,
    commentCount: 0,
    contestCount: 0,
    isContested: false,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(10),
  },

  // ── 5. Verified — same operator as #4 under a backup alias ────────────────────
  {
    id: "scammer-fake-metal-fusion-backup-account",
    seoSlug: "scammer-fake-metal-fusion-backup-account",
    displayNames: ["MF_Backup_Store", "MetalFusion Backup"],
    phones: ["9123456781"],
    upiIds: ["mfbackupstore@oksbi"],
    emails: [],
    socialMedia: [
      { platform: "telegram", handle: "mf_backup_store" },
    ],
    scamType: "advance_payment_ghost",
    scamPlatform: "telegram",
    description:
      "Same scammer as MetalFusion_PreorderAgent, resurfaced under a backup Telegram account after the WhatsApp profile went cold. Identical advance-payment script, this time for a Storm Pegasus import batch.",
    amountLost: 400,
    itemInvolved: "Metal Fight Beyblade BB-28 Storm Pegasus — bulk import batch",
    evidence: [],
    reportedBy: "user-yugi-muto",
    reportedByAnon: false,
    status: SCAMMER_FIELDS.STATUS_VALUES.VERIFIED,
    verifiedBy: "user-admin-letitrip",
    verifiedAt: daysAgo(9),
    verificationNote: "Same operator as scammer-fake-metal-fusion-preorder-agent — profiles linked, not merged (both kept for evidence trail).",
    relatedScammerIds: ["scammer-fake-metal-fusion-preorder-agent"],
    mergedFromIds: [],
    tags: ["repeat_offender"],
    views: 22,
    incidentCount: 0,
    commentCount: 0,
    contestCount: 0,
    isContested: false,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },
];

// Derived through the wrapper, never per record — an inline literal is how
// five product seed files shipped their last fixture with no tokens.
export const scammersSeedData: Partial<ScammerDocument>[] =
  scammerRows.map(withScammerSearchTxt);
