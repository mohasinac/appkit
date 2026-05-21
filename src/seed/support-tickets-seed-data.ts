/*
 * WHY: Seeds support tickets for YGO marketplace — 8 tickets across all statuses.
 * WHAT: open (2), in_progress (2), waiting_on_user (1), resolved (2), closed (1).
 *
 * EXPORTS:
 *   supportTicketsSeedData — Array of Partial<SupportTicketDocument> for seed runner
 *
 * @tag domain:support
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { SupportTicketDocument, TicketMessage } from "../features/support/schemas/firestore";
import { SUPPORT_TICKET_FIELDS } from "../constants/field-names";

function msg(
  id: string,
  authorId: string,
  authorRole: TicketMessage["authorRole"],
  body: string,
  daysAgo: number,
): TicketMessage {
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return { id, authorId, authorRole, body, createdAt };
}

const BASE = Date.now();
function daysBack(n: number) {
  return new Date(BASE - n * 24 * 60 * 60 * 1000);
}

export const supportTicketsSeedData: Partial<SupportTicketDocument>[] = [
  // ── 1. Order issue — in progress ─────────────────────────────────────────
  {
    id: "ticket-yugi-order-001",
    userId: "user-yugi-muto",
    userEmail: "yugi.muto@example.com",
    userDisplayName: "Yugi Muto",
    category: "order_issue",
    subject: "Order delivered but item is missing from the box",
    description:
      "I received order #order-1-20260515-abc123 but the Dark Magician LOB card was not inside — only the outer packaging and bubble wrap were present. Please help.",
    orderId: "order-1-20260515-abc123",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.IN_PROGRESS,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg(
        "msg-yugi-001-u1",
        "user-yugi-muto",
        "user",
        "I received my order but the card was missing! The seal was broken on arrival.",
        5,
      ),
      msg(
        "msg-yugi-001-s1",
        "user-admin-letitrip",
        "support",
        "Hi Yugi, we're sorry to hear this. I've raised a claim with the courier. Could you please share a photo of the packaging?",
        4,
      ),
      msg(
        "msg-yugi-001-u2",
        "user-yugi-muto",
        "user",
        "Photos attached. The outer tape was clearly cut and resealed.",
        3,
      ),
    ],
    createdAt: daysBack(5),
    updatedAt: daysBack(3),
  },

  // ── 2. Open ticket — refund request ───────────────────────────────────────
  {
    id: "ticket-yugi-refund-001",
    userId: "user-yugi-muto",
    userEmail: "yugi.muto@example.com",
    userDisplayName: "Yugi Muto",
    category: "refund_request",
    subject: "Requesting refund for cancelled pre-order",
    description:
      "I placed a pre-order for the Konami 25th Anniversary Rarity Collection 3 months ago. The store has now closed. I would like a full refund of ₹3,999.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.OPEN,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.NORMAL,
    messages: [
      msg(
        "msg-yugi-002-u1",
        "user-yugi-muto",
        "user",
        "The store closed without shipping. I paid via Razorpay. Transaction ID: pay_test_abc123.",
        2,
      ),
    ],
    createdAt: daysBack(2),
    updatedAt: daysBack(2),
  },

  // ── 3. Waiting on user — account recovery ─────────────────────────────────
  {
    id: "ticket-kaiba-account-001",
    userId: "user-seto-kaiba",
    userEmail: "seto.kaiba@example.com",
    userDisplayName: "Seto Kaiba",
    category: "account",
    subject: "Cannot log in — OTP not arriving on new phone number",
    description:
      "I changed my phone number and now OTP for login is going to the old number. I cannot access my seller dashboard.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.WAITING_ON_USER,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.NORMAL,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg(
        "msg-kaiba-001-u1",
        "user-seto-kaiba",
        "user",
        "I'm locked out. My old number is no longer active.",
        7,
      ),
      msg(
        "msg-kaiba-001-s1",
        "user-admin-letitrip",
        "support",
        "Hi Kaiba, to verify ownership we need your registered email and last 4 digits of the payment card used on this account. Please reply here.",
        6,
      ),
    ],
    createdAt: daysBack(7),
    updatedAt: daysBack(6),
  },

  // ── 4. Resolved — listing dispute ─────────────────────────────────────────
  {
    id: "ticket-yugi-dispute-001",
    userId: "user-yugi-muto",
    userEmail: "yugi.muto@example.com",
    userDisplayName: "Yugi Muto",
    category: "listing_dispute",
    subject: "Product description says near mint but card is heavily played",
    description:
      "The Mirror Force MRD 1st Edition I received is scratched and has edge wear. The listing said near mint. I want to return it.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.RESOLVED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.NORMAL,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg(
        "msg-yugi-003-u1",
        "user-yugi-muto",
        "user",
        "The card is clearly not near mint. Here are photos showing the scratches and whitening.",
        12,
      ),
      msg(
        "msg-yugi-003-s1",
        "user-admin-letitrip",
        "support",
        "Thank you for the photos Yugi. We've contacted the seller and initiated a return + full refund.",
        11,
      ),
      msg(
        "msg-yugi-003-s2",
        "user-admin-letitrip",
        "support",
        "Refund of ₹15,000 has been processed back to your original payment method. This ticket is now resolved.",
        8,
      ),
    ],
    resolvedAt: daysBack(8),
    createdAt: daysBack(12),
    updatedAt: daysBack(8),
  },

  // ── 5. Closed — auction dispute (terminal) ────────────────────────────────
  {
    id: "ticket-yugi-auction-001",
    userId: "user-yugi-muto",
    userEmail: "yugi.muto@example.com",
    userDisplayName: "Yugi Muto",
    category: "auction_dispute",
    subject: "Winning bid was removed from Blue-Eyes auction",
    description:
      "I won the Blue-Eyes White Dragon LOB 1st Ed PSA 10 auction but my winning bid was removed without explanation.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.CLOSED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.LOW,
    messages: [
      msg(
        "msg-yugi-004-u1",
        "user-yugi-muto",
        "user",
        "My winning bid was cancelled. I have a screenshot.",
        20,
      ),
      msg(
        "msg-yugi-004-s1",
        "user-admin-letitrip",
        "support",
        "Hi Yugi, after reviewing the auction logs we found a duplicate bid was submitted. The correct winning bid remains active. No action needed.",
        18,
      ),
      msg(
        "msg-yugi-004-u2",
        "user-yugi-muto",
        "user",
        "Understood, thanks for clarifying.",
        17,
      ),
    ],
    closedAt: daysBack(17),
    createdAt: daysBack(20),
    updatedAt: daysBack(17),
  },

  // ── 6. Open — general inquiry ─────────────────────────────────────────────
  {
    id: "ticket-kaiba-general-001",
    userId: "user-seto-kaiba",
    userEmail: "seto.kaiba@example.com",
    userDisplayName: "Seto Kaiba",
    category: "general",
    subject: "How do I list graded slabs with PSA verification?",
    description:
      "I want to list my PSA 10 Blue-Eyes White Dragon with the PSA cert number visible and verified. What are the steps?",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.OPEN,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.LOW,
    messages: [
      msg(
        "msg-kaiba-002-u1",
        "user-seto-kaiba",
        "user",
        "I've read the FAQ but couldn't find the exact grading verification requirements for PSA slabs.",
        1,
      ),
    ],
    createdAt: daysBack(1),
    updatedAt: daysBack(1),
  },

  // ── 7. Resolved — escalated fraud report (admin handled) ──────────────────
  {
    id: "ticket-yugi-fraud-001",
    userId: "user-yugi-muto",
    userEmail: "yugi.muto@example.com",
    userDisplayName: "Yugi Muto",
    category: "scam_report",
    subject: "Seller sent empty box and is now unreachable",
    description:
      "I paid ₹8,499 for a Dark Magician Girl IOC 1st Edition via Razorpay. The seller from Kaiba Corp has not responded in 7 days and the tracking shows the box was 200g — way too light for a graded slab.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.RESOLVED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg("msg-yugi-005-u1", "user-yugi-muto", "user",
        "I have the weight receipt from Delhivery. 200g is impossible for a graded slab. The seller is not replying on messages or phone.",
        10),
      msg("msg-yugi-005-s1", "user-admin-letitrip", "support",
        "Hi Yugi, I have escalated this to our admin team for review as it qualifies as a potential fraud case. You will hear back within 24 hours.",
        9),
      msg("msg-yugi-005-a1", "user-admin-letitrip", "support",
        "Hi Yugi, this is the LetItRip admin. I have reviewed the shipment weight log and the seller communication history. We are initiating a full refund of ₹8,499 under our buyer protection policy. The seller account has been suspended pending investigation.",
        8),
      msg("msg-yugi-005-u2", "user-yugi-muto", "user",
        "Thank you so much. I really appreciate the quick escalation.",
        7),
    ],
    resolvedAt: daysBack(7),
    createdAt: daysBack(10),
    updatedAt: daysBack(7),
  },

  // ── 8. In-progress — seller store suspension appeal (admin handling) ──────
  {
    id: "ticket-kaiba-ban-appeal-001",
    userId: "user-seto-kaiba",
    userEmail: "seto.kaiba@example.com",
    userDisplayName: "Seto Kaiba",
    category: "account",
    subject: "My store was suspended — I believe it was a mistake",
    description:
      "My store Kaiba Corp Card Vault was suspended 2 days ago. I received no email explanation. I have 100% positive reviews and have never violated any policy. Please review.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.IN_PROGRESS,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg("msg-kaiba-003-u1", "user-seto-kaiba", "user",
        "I run a legitimate business. I have verified reviews and never had a single complaint. Please explain the suspension.",
        2),
      msg("msg-kaiba-003-a1", "user-admin-letitrip", "support",
        "Hi Kaiba, your store was suspended as part of an automatic fraud flag triggered by a buyer report. I am manually reviewing your transaction history and the specific report. Please share your business GST number and a copy of your most recent bank statement showing the Razorpay settlements for verification.",
        1),
    ],
    createdAt: daysBack(2),
    updatedAt: daysBack(1),
  },
];
