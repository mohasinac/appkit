/*
 * WHY: Seeds buyer ↔ seller conversations for the Beyblade marketplace.
 * WHAT: 6 conversations covering condition queries, offer negotiation, prize-draw fairness, shipping delays, returns, bulk orders, tracking.
 *
 * EXPORTS:
 *   conversationsSeedData — Array of Partial<ConversationDocument> for seed runner
 *
 * @tag domain:messages
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { ConversationDocument } from "../features/messages/schemas/firestore";

const NOW = new Date();
const minsAgo = (n: number) => new Date(NOW.getTime() - n * 60_000);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const conversationsSeedData: Partial<ConversationDocument>[] = [
  // ── 1. Metal Lightning L-Drago — Pre-purchase condition query ────────────
  {
    id: "conv-l-drago-yugi-kaiba-001",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Mock User 3",
    sellerDisplayName: "Mock User 6",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    productId: "auction-beyblade-metal-lightning-l-drago",
    productTitle: "Beyblade Metal Lightning L-Drago",
    messages: [
      {
        id: "msg-001-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Hi! Is this a sharp, unrounded tip or has it seen a lot of stadium battles? I'm buying for my collection, not battling, so I want to know the tip wear before I bid.",
        isRead: true,
        sentAt: daysAgo(3),
      },
      {
        id: "msg-001-2",
        senderId: "user-tyson-blader",
        senderRole: "seller",
        body: "Hey Rehan! The tip is factory-sharp with visible grooves — barely used, maybe 10 launches total. No cracks on the layer. This came direct from a sealed Metal Fight booster. Happy to share close-up photos on WhatsApp if you DM me before bidding.",
        isRead: true,
        sentAt: daysAgo(3),
      },
      {
        id: "msg-001-3",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "That sounds great! Can you also confirm it's genuine Takara-Tomy and not a clone?",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-001-4",
        senderId: "user-tyson-blader",
        senderRole: "seller",
        body: "100% genuine — laser-etched logo on the underside, verified. Good luck in the auction!",
        isRead: false,
        sentAt: daysAgo(2),
      },
    ],
    lastMessage: "100% genuine — laser-etched logo on the underside, verified. Good luck in the auction!",
    lastMessageAt: daysAgo(2),
    unreadBuyer: 1,
    unreadSeller: 0,
    status: "active",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },

  // ── 2. Burst Valkyrie — Offer negotiation ────────────────────────────────
  {
    id: "conv-burst-valkyrie-yugi-kaiba-002",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Mock User 3",
    sellerDisplayName: "Mock User 6",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst Valkyrie",
    messages: [
      {
        id: "msg-002-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Would you take ₹1,500 for the Burst Valkyrie? I see it's listed at ₹1,899.",
        isRead: true,
        sentAt: daysAgo(1),
      },
      {
        id: "msg-002-2",
        senderId: "user-tyson-blader",
        senderRole: "seller",
        body: "Hi Rehan! Best I can do is ₹1,700 — it's a clean, sealed piece with no sticker damage. I'll cover shipping at that price.",
        isRead: true,
        sentAt: daysAgo(1),
      },
      {
        id: "msg-002-3",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Deal at ₹1,700 with free shipping. Can I use the Make Offer feature or should you update the listing?",
        isRead: false,
        sentAt: hoursAgo(8),
      },
    ],
    lastMessage: "Deal at ₹1,700 with free shipping. Can I use the Make Offer feature or should you update the listing?",
    lastMessageAt: hoursAgo(8),
    unreadBuyer: 0,
    unreadSeller: 1,
    status: "active",
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(8),
  },

  // ── 3. Mystery Box — Prize draw fairness question ────────────────────────
  {
    id: "conv-mystery-box-yugi-admin-003",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Mock User 3",
    sellerDisplayName: "Mock User 1",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    productId: "prizedraw-beyblade-mystery-box",
    productTitle: "Beyblade Mystery Box",
    messages: [
      {
        id: "msg-003-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "How is the winner for the mystery box actually selected? My friend got burned by a rigged giveaway last month.",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-003-2",
        senderId: "user-admin-letitrip",
        senderRole: "seller",
        body: "Great question — the draw uses a cryptographically random selection (crypto.randomInt) run server-side, logged with a timestamp, and the winner is announced publicly on the event page. No manual picking involved. Happy to walk you through the mechanics before you enter.",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-003-3",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Perfect, that's exactly what I needed to hear. Entering now!",
        isRead: true,
        sentAt: daysAgo(1),
      },
    ],
    lastMessage: "Perfect, that's exactly what I needed to hear. Entering now!",
    lastMessageAt: daysAgo(1),
    unreadBuyer: 0,
    unreadSeller: 0,
    status: "active",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // ── 4. Original Dranzer S — Shipping delay ───────────────────────────────
  {
    id: "conv-dranzer-s-admin-kaiba-004",
    buyerId: "user-admin-letitrip",
    buyerDisplayName: "Mock User 1",
    sellerDisplayName: "Mock User 6",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    productId: "product-beyblade-original-dranzer-s",
    productTitle: "Beyblade Original Dranzer S",
    messages: [
      {
        id: "msg-004-1",
        senderId: "user-admin-letitrip",
        senderRole: "buyer",
        body: "Hi Tyson, I ordered the sealed Dranzer S 3 days ago. The tracking shows it's still at the dispatch hub in Chennai. Is there a delay?",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-004-2",
        senderId: "user-tyson-blader",
        senderRole: "seller",
        body: "Apologies for the delay! There was a backlog at the courier facility — they've confirmed it will leave Chennai tonight. Updated tracking should show movement tomorrow morning. If it doesn't arrive by end of week, I'll initiate a replacement. Very sorry for the inconvenience!",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-004-3",
        senderId: "user-admin-letitrip",
        senderRole: "buyer",
        body: "Thanks for the quick update. I'll keep an eye on the tracking.",
        isRead: true,
        sentAt: daysAgo(1),
      },
    ],
    lastMessage: "Thanks for the quick update. I'll keep an eye on the tracking.",
    lastMessageAt: daysAgo(1),
    unreadBuyer: 0,
    unreadSeller: 0,
    status: "active",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // ── 5. Bulk Original Series — Bulk order query ───────────────────────────
  {
    id: "conv-bulk-original-yugi-kaiba-005",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Mock User 3",
    sellerDisplayName: "Mock User 6",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    productId: "product-beyblade-original-driger-v",
    productTitle: "Beyblade Original Driger V",
    messages: [
      {
        id: "msg-005-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Do you have 3 copies of the Original Driger V? I'm completing my original-series set and need multiples for tournament backup.",
        isRead: true,
        sentAt: minsAgo(240),
      },
      {
        id: "msg-005-2",
        senderId: "user-tyson-blader",
        senderRole: "seller",
        body: "Yes! I have 5 copies in stock. For 3+ copies I can do ₹1,600 per piece (saving ₹399 per piece vs list price) + free shipping. All pieces are NM with sharp tips.",
        isRead: false,
        sentAt: minsAgo(200),
      },
    ],
    lastMessage: "Yes! I have 5 copies in stock. For 3+ copies I can do ₹1,600 per piece (saving ₹399 per piece vs list price) + free shipping. All pieces are NM with sharp tips.",
    lastMessageAt: minsAgo(200),
    unreadBuyer: 1,
    unreadSeller: 0,
    status: "active",
    createdAt: minsAgo(240),
    updatedAt: minsAgo(200),
  },

  // ── 6. X Knife Shinobi — Post-purchase tracking (archived) ───────────────
  {
    id: "conv-x-knife-admin-kaiba-006",
    buyerId: "user-admin-letitrip",
    buyerDisplayName: "Mock User 1",
    sellerDisplayName: "Mock User 6",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    productId: "product-beyblade-x-knife-shinobi",
    productTitle: "Beyblade X Knife Shinobi",
    messages: [
      {
        id: "msg-006-1",
        senderId: "user-admin-letitrip",
        senderRole: "buyer",
        body: "Hi! My order for the X Knife Shinobi shipped 2 days ago — the courier's tracking page shows it left your city but has not updated since. Can you check with the courier?",
        isRead: true,
        sentAt: daysAgo(6),
      },
      {
        id: "msg-006-2",
        senderId: "user-tyson-blader",
        senderRole: "seller",
        body: "Hi! Yes, I raised a ticket with the courier about that. They confirmed it is in transit at the sorting facility — tracking updates can lag by 24-48 hours. Should arrive tomorrow or day after.",
        isRead: true,
        sentAt: daysAgo(6),
      },
      {
        id: "msg-006-3",
        senderId: "user-admin-letitrip",
        senderRole: "buyer",
        body: "Got the piece today, arrived in perfect condition. Thanks Tyson!",
        isRead: true,
        sentAt: daysAgo(4),
      },
      {
        id: "msg-006-4",
        senderId: "user-tyson-blader",
        senderRole: "seller",
        body: "Glad it arrived safely! Please leave a review when you get a chance.",
        isRead: true,
        sentAt: daysAgo(4),
      },
    ],
    lastMessage: "Glad it arrived safely! Please leave a review when you get a chance.",
    lastMessageAt: daysAgo(4),
    unreadBuyer: 0,
    unreadSeller: 0,
    status: "archived",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(4),
  },
];
