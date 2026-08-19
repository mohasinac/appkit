/*
 * WHY: Seeds support tickets for the Beyblade marketplace — 8 tickets across all statuses.
 * WHAT: open (2), in_progress (2), waiting_on_user (1), resolved (2), closed (1).
 *
 * EXPORTS:
 *   supportTicketsSeedData — Array of Partial<SupportTicketDocument> for seed runner
 *
 * @tag domain:support
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
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
    userEmail: "rehan.sheikh@example.com",
    userDisplayName: "Rehan Sheikh",
    category: "order_issue",
    subject: "Order delivered but item is missing from the box",
    description:
      "I received order #order-1-20260515-abc123 but the Beyblade Original Dranzer S was not inside — only the outer packaging and bubble wrap were present. Please help.",
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
        "I received my order but the beyblade was missing! The seal was broken on arrival.",
        5,
      ),
      msg(
        "msg-yugi-001-s1",
        "user-admin-letitrip",
        "support",
        "Hi Rehan, we're sorry to hear this. I've raised a claim with the courier. Could you please share a photo of the packaging?",
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
    userEmail: "rehan.sheikh@example.com",
    userDisplayName: "Rehan Sheikh",
    category: "refund_request",
    subject: "Requesting refund for cancelled pre-order",
    description:
      "I placed a pre-order for the Beyblade X BX-08 wave 3 months ago. The store has now closed. I would like a full refund of ₹899.",
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
    userEmail: "vivaan.kapoor@example.com",
    userDisplayName: "Vivaan Kapoor",
    category: "account",
    subject: "Cannot log in — OTP not arriving on new phone number",
    description:
      "I changed my phone number and now OTP for login is going to the old number. I cannot access my account.",
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
        "Hi Vivaan, to verify ownership we need your registered email and last 4 digits of the payment card used on this account. Please reply here.",
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
    userEmail: "rehan.sheikh@example.com",
    userDisplayName: "Rehan Sheikh",
    category: "listing_dispute",
    subject: "Product description says mint but tip is heavily worn",
    description:
      "The Beyblade Metal Storm Pegasus I received has a rounded, sanded-down tip and scratches on the layer. The listing said mint condition. I want to return it.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.RESOLVED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.NORMAL,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg(
        "msg-yugi-003-u1",
        "user-yugi-muto",
        "user",
        "The tip is clearly not mint. Here are photos showing the wear and scratches.",
        12,
      ),
      msg(
        "msg-yugi-003-s1",
        "user-admin-letitrip",
        "support",
        "Thank you for the photos Rehan. We've contacted the seller and initiated a return + full refund.",
        11,
      ),
      msg(
        "msg-yugi-003-s2",
        "user-admin-letitrip",
        "support",
        "Refund of ₹2,499 has been processed back to your original payment method. This ticket is now resolved.",
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
    userEmail: "rehan.sheikh@example.com",
    userDisplayName: "Rehan Sheikh",
    category: "auction_dispute",
    subject: "Winning bid was removed from Dragoon Storm auction",
    description:
      "I won the Beyblade Original Dragoon Storm auction but my winning bid was removed without explanation.",
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
        "Hi Rehan, after reviewing the auction logs we found a duplicate bid was submitted. The correct winning bid remains active. No action needed.",
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
    userEmail: "vivaan.kapoor@example.com",
    userDisplayName: "Vivaan Kapoor",
    category: "general",
    subject: "How do I list a sealed limited-edition beyblade?",
    description:
      "I want to list my sealed limited-edition Metal Lightning L-Drago with the authenticity certificate visible and verified. What are the steps?",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.OPEN,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.LOW,
    messages: [
      msg(
        "msg-kaiba-002-u1",
        "user-seto-kaiba",
        "user",
        "I've read the FAQ but couldn't find the exact authenticity verification requirements for sealed pieces.",
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
    userEmail: "rehan.sheikh@example.com",
    userDisplayName: "Rehan Sheikh",
    category: "scam_report",
    subject: "Seller sent empty box and is now unreachable",
    description:
      "I paid ₹2,999 for a Beyblade Burst Regalia Genesis via Razorpay. The seller has not responded in 7 days and the tracking shows the box was 40g — way too light for a sealed spinner.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.RESOLVED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg("msg-yugi-005-u1", "user-yugi-muto", "user",
        "I have the weight receipt from Delhivery. 40g is impossible for a sealed beyblade. The seller is not replying on messages or phone.",
        10),
      msg("msg-yugi-005-s1", "user-admin-letitrip", "support",
        "Hi Rehan, I have escalated this to our admin team for review as it qualifies as a potential fraud case. You will hear back within 24 hours.",
        9),
      msg("msg-yugi-005-a1", "user-admin-letitrip", "support",
        "Hi Rehan, this is the LetItRip admin. I have reviewed the shipment weight log and the seller communication history. We are initiating a full refund of ₹2,999 under our buyer protection policy. The seller account has been suspended pending investigation.",
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
    userEmail: "vivaan.kapoor@example.com",
    userDisplayName: "Vivaan Kapoor",
    category: "account",
    subject: "My account was flagged — I believe it was a mistake",
    description:
      "My account was flagged 2 days ago. I received no email explanation. I have never violated any policy. Please review.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.IN_PROGRESS,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg("msg-kaiba-003-u1", "user-seto-kaiba", "user",
        "I'm a legitimate buyer. I have a clean order history and never had a single complaint. Please explain the flag.",
        2),
      msg("msg-kaiba-003-a1", "user-admin-letitrip", "support",
        "Hi Vivaan, your account was flagged as part of an automatic fraud check triggered by an unusual login pattern. I am manually reviewing your account history. Please share the last 4 digits of the card used for your most recent Razorpay payment for verification.",
        1),
    ],
    createdAt: daysBack(2),
    updatedAt: daysBack(1),
  },
];
