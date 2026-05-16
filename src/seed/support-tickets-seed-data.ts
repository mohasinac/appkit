/**
 * Support Tickets Seed Data — 6 tickets across all statuses and categories.
 *
 * Covers: open, in_progress, waiting_on_user, resolved, closed (2).
 * Users: mix of buyers (rahul-sharma, priya-patel, arjun-singh, meera-nair).
 * Employee assignee: user-simran-kaur (employee role).
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
    id: "ticket-rahul-order-001",
    userId: "user-rahul-sharma",
    userEmail: "rahul.sharma@example.com",
    userDisplayName: "Rahul Sharma",
    category: "order_issue",
    subject: "Order delivered but item is missing from the box",
    description:
      "I received order #order-rahul-001-pokemon-etb but the ETB box arrived empty — only the outer packaging was present. Please help.",
    orderId: "order-rahul-001-pokemon-etb",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.IN_PROGRESS,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-simran-kaur",
    assignedToName: "Simran Kaur",
    messages: [
      msg(
        "msg-rahul-001-u1",
        "user-rahul-sharma",
        "user",
        "I received my order but it was empty! The seal was broken on arrival.",
        5,
      ),
      msg(
        "msg-rahul-001-s1",
        "user-simran-kaur",
        "support",
        "Hi Rahul, we're sorry to hear this. I've raised a claim with the courier. Could you please share a photo of the packaging?",
        4,
      ),
      msg(
        "msg-rahul-001-u2",
        "user-rahul-sharma",
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
    id: "ticket-priya-refund-001",
    userId: "user-priya-patel",
    userEmail: "priya.patel@example.com",
    userDisplayName: "Priya Patel",
    category: "refund_request",
    subject: "Requesting refund for cancelled pre-order",
    description:
      "I placed a pre-order for the Nendoroid Rem figure 3 months ago. The store has now closed. I would like a full refund of ₹2,499.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.OPEN,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.NORMAL,
    messages: [
      msg(
        "msg-priya-001-u1",
        "user-priya-patel",
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
    id: "ticket-arjun-account-001",
    userId: "user-arjun-singh",
    userEmail: "arjun.singh@example.com",
    userDisplayName: "Arjun Singh",
    category: "account",
    subject: "Cannot log in — OTP not arriving on new phone number",
    description:
      "I changed my phone number and now OTP for login is going to the old number. I cannot access my account.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.WAITING_ON_USER,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.NORMAL,
    assignedTo: "user-simran-kaur",
    assignedToName: "Simran Kaur",
    messages: [
      msg(
        "msg-arjun-001-u1",
        "user-arjun-singh",
        "user",
        "I'm locked out. My old number is no longer active.",
        7,
      ),
      msg(
        "msg-arjun-001-s1",
        "user-simran-kaur",
        "support",
        "Hi Arjun, to verify ownership we need your registered email and last 4 digits of the payment card used on this account. Please reply here.",
        6,
      ),
    ],
    createdAt: daysBack(7),
    updatedAt: daysBack(6),
  },

  // ── 4. Resolved — listing dispute ─────────────────────────────────────────
  {
    id: "ticket-meera-dispute-001",
    userId: "user-meera-nair",
    userEmail: "meera.nair@example.com",
    userDisplayName: "Meera Nair",
    category: "listing_dispute",
    subject: "Product description says mint condition but item is heavily played",
    description:
      "The Beyblade BX-01 I received is scratched and worn. The listing said mint/unused. I want to return it.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.RESOLVED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.NORMAL,
    assignedTo: "user-simran-kaur",
    assignedToName: "Simran Kaur",
    messages: [
      msg(
        "msg-meera-001-u1",
        "user-meera-nair",
        "user",
        "The item is clearly not mint. Here are photos showing the scratches.",
        12,
      ),
      msg(
        "msg-meera-001-s1",
        "user-simran-kaur",
        "support",
        "Thank you for the photos Meera. We've contacted the seller and initiated a return + full refund.",
        11,
      ),
      msg(
        "msg-meera-001-s2",
        "user-simran-kaur",
        "support",
        "Refund of ₹1,200 has been processed back to your original payment method. This ticket is now resolved.",
        8,
      ),
    ],
    resolvedAt: daysBack(8),
    createdAt: daysBack(12),
    updatedAt: daysBack(8),
  },

  // ── 5. Closed — auction dispute (terminal) ────────────────────────────────
  {
    id: "ticket-rahul-auction-001",
    userId: "user-rahul-sharma",
    userEmail: "rahul.sharma@example.com",
    userDisplayName: "Rahul Sharma",
    category: "auction_dispute",
    subject: "Winning bid was removed from auction",
    description:
      "I won the PSA 9 Charizard auction but my winning bid was removed without explanation.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.CLOSED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.LOW,
    messages: [
      msg(
        "msg-rahul-002-u1",
        "user-rahul-sharma",
        "user",
        "My winning bid was cancelled. I have a screenshot.",
        20,
      ),
      msg(
        "msg-rahul-002-s1",
        "user-simran-kaur",
        "support",
        "Hi Rahul, after reviewing the auction logs we found a duplicate bid was submitted. The correct winning bid remains active. No action needed.",
        18,
      ),
      msg(
        "msg-rahul-002-u2",
        "user-rahul-sharma",
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
    id: "ticket-kavya-general-001",
    userId: "user-kavya-iyer",
    userEmail: "kavya.iyer@example.com",
    userDisplayName: "Kavya Iyer",
    category: "general",
    subject: "How do I become a verified seller?",
    description:
      "I would like to start selling Pokémon cards on LetItRip. What are the steps to get verified and open a store?",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.OPEN,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.LOW,
    messages: [
      msg(
        "msg-kavya-001-u1",
        "user-kavya-iyer",
        "user",
        "I've read the FAQ but couldn't find the exact verification requirements.",
        1,
      ),
    ],
    createdAt: daysBack(1),
    updatedAt: daysBack(1),
  },

  // ── 7. Resolved — escalated fraud report (admin handled) ──────────────────
  {
    id: "ticket-meera-fraud-002",
    userId: "user-meera-nair",
    userEmail: "meera.nair@example.com",
    userDisplayName: "Meera Nair",
    category: "scam_report",
    subject: "Seller sent empty box and is now unreachable",
    description:
      "I paid Rs 8,499 for a S.H.Figuarts Broly via Razorpay. The seller (store-beyblade-arena) has not responded in 7 days and the tracking shows the box was 200g — way too light for the figure.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.RESOLVED,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg("msg-meera-002-u1", "user-meera-nair", "user",
        "I have the weight receipt from Delhivery. 200g is impossible for this figure. The seller is not replying on messages or phone.",
        10),
      msg("msg-meera-002-s1", "user-simran-kaur", "support",
        "Hi Meera, I have escalated this to our admin team for review as it qualifies as a potential fraud case. You will hear back within 24 hours.",
        9),
      msg("msg-meera-002-a1", "user-admin-letitrip", "support",
        "Hi Meera, this is the LetItRip admin. I have reviewed the shipment weight log and the seller communication history. We are initiating a full refund of Rs 8,499 under our buyer protection policy. The seller account has been suspended pending investigation.",
        8),
      msg("msg-meera-002-u2", "user-meera-nair", "user",
        "Thank you so much. I really appreciate the quick escalation.",
        7),
    ],
    resolvedAt: daysBack(7),
    createdAt: daysBack(10),
    updatedAt: daysBack(7),
  },

  // ── 8. In-progress — seller account ban appeal (admin handling) ────────────
  {
    id: "ticket-rohit-ban-appeal-001",
    userId: "user-rohit-joshi",
    userEmail: "rohit.joshi@example.com",
    userDisplayName: "Rohit Joshi",
    category: "account",
    subject: "My store was suspended — I believe it was a mistake",
    description:
      "My store Beyblade Arena was suspended 2 days ago. I received no email explanation. I have 100% positive reviews and have never violated any policy. Please review.",
    status: SUPPORT_TICKET_FIELDS.STATUS_VALUES.IN_PROGRESS,
    priority: SUPPORT_TICKET_FIELDS.PRIORITY_VALUES.HIGH,
    assignedTo: "user-admin-letitrip",
    assignedToName: "LetItRip Admin",
    messages: [
      msg("msg-rohit-001-u1", "user-rohit-joshi", "user",
        "I run a legitimate business. I have 47 verified reviews and never had a single complaint. Please explain the suspension.",
        2),
      msg("msg-rohit-001-a1", "user-admin-letitrip", "support",
        "Hi Rohit, your store was suspended as part of an automatic fraud flag triggered by a buyer report. I am manually reviewing your transaction history and the specific report. Please share your business GST number and a copy of your most recent bank statement showing the Razorpay settlements for verification.",
        1),
    ],
    createdAt: daysBack(2),
    updatedAt: daysBack(1),
  },
];
