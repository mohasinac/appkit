/*
 * WHY: Seeds buyer ↔ seller conversations for YGO marketplace.
 * WHAT: 6 conversations covering grading queries, offer negotiation, shipping delays, returns, bulk orders, tracking.
 *
 * EXPORTS:
 *   conversationsSeedData — Array of Partial<ConversationDocument> for seed runner
 *
 * @tag domain:messages
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { ConversationDocument } from "../features/messages/schemas/firestore";

const NOW = new Date();
const minsAgo = (n: number) => new Date(NOW.getTime() - n * 60_000);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const conversationsSeedData: Partial<ConversationDocument>[] = [
  // ── 1. Blue-Eyes LOB PSA 10 — Pre-purchase grading query ─────────────────
  {
    id: "conv-blue-eyes-yugi-kaiba-001",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Yugi Muto",
    sellerDisplayName: "Seto Kaiba",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    productId: "auction-blue-eyes-lob-1st-psa10",
    productTitle: "Blue-Eyes White Dragon LOB 1st Ed — PSA 10",
    messages: [
      {
        id: "msg-001-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Hi! Is this PSA 10 a gem mint or does it have any edge wear on the slab? I'm buying for my collection, not resale, so I want to know the centering before I bid.",
        isRead: true,
        sentAt: daysAgo(3),
      },
      {
        id: "msg-001-2",
        senderId: "user-seto-kaiba",
        senderRole: "seller",
        body: "Hey Yugi! The centering is approximately 55/45 front and 60/40 back — well within PSA 10 standards. The slab itself has no cracks. This was submitted by me personally from a sealed LOB booster. Happy to share full slab photos on WhatsApp if you DM me before bidding.",
        isRead: true,
        sentAt: daysAgo(3),
      },
      {
        id: "msg-001-3",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "That sounds great! Can you also confirm the cert number so I can verify on PSA's website?",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-001-4",
        senderId: "user-seto-kaiba",
        senderRole: "seller",
        body: "PSA Cert #: 84729183. You can verify at psacard.com. Grade is confirmed Gem Mint 10. Good luck in the auction!",
        isRead: false,
        sentAt: daysAgo(2),
      },
    ],
    lastMessage: "PSA Cert #: 84729183. You can verify at psacard.com. Grade is confirmed Gem Mint 10. Good luck in the auction!",
    lastMessageAt: daysAgo(2),
    unreadBuyer: 1,
    unreadSeller: 0,
    status: "active",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },

  // ── 2. Dark Magician Girl IOC — Offer negotiation ────────────────────────
  {
    id: "conv-dmg-ioc-yugi-kaiba-002",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Yugi Muto",
    sellerDisplayName: "Seto Kaiba",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    productId: "product-dark-magician-girl-ioc",
    productTitle: "Dark Magician Girl IOC 1st Edition (NM)",
    messages: [
      {
        id: "msg-002-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Would you take ₹7,500 for the Dark Magician Girl IOC? I see it's listed at ₹8,999.",
        isRead: true,
        sentAt: daysAgo(1),
      },
      {
        id: "msg-002-2",
        senderId: "user-seto-kaiba",
        senderRole: "seller",
        body: "Hi Yugi! Best I can do is ₹8,200 — it's a clean 1st Ed with no whitening. I'll cover shipping at that price.",
        isRead: true,
        sentAt: daysAgo(1),
      },
      {
        id: "msg-002-3",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Deal at ₹8,200 with free shipping. Can I use the Make Offer feature or should you update the listing?",
        isRead: false,
        sentAt: hoursAgo(8),
      },
    ],
    lastMessage: "Deal at ₹8,200 with free shipping. Can I use the Make Offer feature or should you update the listing?",
    lastMessageAt: hoursAgo(8),
    unreadBuyer: 0,
    unreadSeller: 1,
    status: "active",
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(8),
  },

  // ── 3. Exodia Head LOB — Authenticity check ──────────────────────────────
  {
    id: "conv-exodia-yugi-admin-003",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Yugi Muto",
    sellerDisplayName: "LetItRip Admin",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    productId: "product-exodia-head-lob-nm",
    productTitle: "Exodia the Forbidden One LOB 1st Ed (NM)",
    messages: [
      {
        id: "msg-003-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Is this a genuine Konami print or a reprint? My friend got burned with a counterfeit Exodia last month.",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-003-2",
        senderId: "user-admin-letitrip",
        senderRole: "seller",
        body: "100% genuine Konami LOB 1st Edition. You can tell by the eye of Anubis hologram on the lower right corner — it's gold, not silver (silver = unlimited). I can send macro photos of the holo stamp before you buy. We also have a 7-day authenticity guarantee.",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-003-3",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Perfect, that's exactly what I needed to hear. Placing the order now!",
        isRead: true,
        sentAt: daysAgo(1),
      },
    ],
    lastMessage: "Perfect, that's exactly what I needed to hear. Placing the order now!",
    lastMessageAt: daysAgo(1),
    unreadBuyer: 0,
    unreadSeller: 0,
    status: "active",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // ── 4. Sealed Booster Box — Shipping delay ───────────────────────────────
  {
    id: "conv-booster-box-admin-kaiba-004",
    buyerId: "user-admin-letitrip",
    buyerDisplayName: "LetItRip Admin",
    sellerDisplayName: "Seto Kaiba",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    productId: "product-lob-booster-box-sealed",
    productTitle: "Legend of Blue Eyes White Dragon — Sealed Booster Box",
    messages: [
      {
        id: "msg-004-1",
        senderId: "user-admin-letitrip",
        senderRole: "buyer",
        body: "Hi Kaiba, I ordered the LOB sealed booster box 3 days ago. The tracking shows it's still at the dispatch hub in Mumbai. Is there a delay?",
        isRead: true,
        sentAt: daysAgo(2),
      },
      {
        id: "msg-004-2",
        senderId: "user-seto-kaiba",
        senderRole: "seller",
        body: "Apologies for the delay! There was a backlog at the courier facility — they've confirmed it will leave Mumbai tonight. Updated tracking should show movement tomorrow morning. If it doesn't arrive by end of week, I'll initiate a replacement. Very sorry for the inconvenience!",
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

  // ── 5. Bulk LOB Singles — Bulk order query ───────────────────────────────
  {
    id: "conv-bulk-lob-yugi-kaiba-005",
    buyerId: "user-yugi-muto",
    buyerDisplayName: "Yugi Muto",
    sellerDisplayName: "Seto Kaiba",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    productId: "product-pot-of-greed-lob",
    productTitle: "Pot of Greed LOB 1st Edition",
    messages: [
      {
        id: "msg-005-1",
        senderId: "user-yugi-muto",
        senderRole: "buyer",
        body: "Do you have 3 copies of Pot of Greed LOB? I'm completing my LOB set and need multiples for the trade binder.",
        isRead: true,
        sentAt: minsAgo(240),
      },
      {
        id: "msg-005-2",
        senderId: "user-seto-kaiba",
        senderRole: "seller",
        body: "Yes! I have 5 copies in stock. For 3+ copies I can do ₹12,000 per card (saving ₹999 per card vs list price) + free shipping. All cards are NM with clean edges.",
        isRead: false,
        sentAt: minsAgo(200),
      },
    ],
    lastMessage: "Yes! I have 5 copies in stock. For 3+ copies I can do ₹12,000 per card (saving ₹999 per card vs list price) + free shipping. All cards are NM with clean edges.",
    lastMessageAt: minsAgo(200),
    unreadBuyer: 1,
    unreadSeller: 0,
    status: "active",
    createdAt: minsAgo(240),
    updatedAt: minsAgo(200),
  },

  // ── 6. Chaos Emperor Dragon — Post-purchase tracking (archived) ──────────
  {
    id: "conv-ced-admin-kaiba-006",
    buyerId: "user-admin-letitrip",
    buyerDisplayName: "LetItRip Admin",
    sellerDisplayName: "Seto Kaiba",
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    productId: "product-chaos-emperor-dragon-ioc",
    productTitle: "Chaos Emperor Dragon — Envoy of the End IOC 1st Ed",
    messages: [
      {
        id: "msg-006-1",
        senderId: "user-admin-letitrip",
        senderRole: "buyer",
        body: "Hi! My order for CED IOC shipped 2 days ago — tracking shows it left your city but has not updated since. Can you check with Shiprocket?",
        isRead: true,
        sentAt: daysAgo(6),
      },
      {
        id: "msg-006-2",
        senderId: "user-seto-kaiba",
        senderRole: "seller",
        body: "Hi! Yes, I raised a ticket with Shiprocket about that. They confirmed it is in transit at the sorting facility — tracking updates can lag by 24-48 hours. Should arrive tomorrow or day after.",
        isRead: true,
        sentAt: daysAgo(6),
      },
      {
        id: "msg-006-3",
        senderId: "user-admin-letitrip",
        senderRole: "buyer",
        body: "Got the card today, arrived in perfect condition. Thanks Kaiba!",
        isRead: true,
        sentAt: daysAgo(4),
      },
      {
        id: "msg-006-4",
        senderId: "user-seto-kaiba",
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
