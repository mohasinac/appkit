/**
 * Notifications Seed Data — LetiTrip Collectibles Platform
 * 10 notifications covering all types. Mixed read/unread.
 * Distributed across buyer and seller users from P15.
 * notif- prefix (system IDs).
 */

import type { NotificationDocument } from "../features/admin/schemas";
import { NOTIFICATION_FIELDS } from "../features/admin/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

export const notificationsSeedData: Partial<NotificationDocument>[] = [
  // ── 1. Welcome — buyer (read) ─────────────────────────────────────────────
  {
    id: "notif-welcome-rahul-001",
    userId: "user-rahul-sharma",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetiTrip, Rahul! 🎉",
    message:
      "Explore thousands of Pokémon TCG cards, Hot Wheels, Beyblade X, and anime figures from verified sellers across India. Use code WELCOME10 for 10% off your first order!",
    actionUrl: "/products",
    actionLabel: "Start Shopping",
    isRead: true,
    readAt: daysAgo(200),
    relatedType: "user",
    createdAt: daysAgo(200),
    updatedAt: daysAgo(200),
  },

  // ── 2. Order Shipped — buyer (unread) ────────────────────────────────────
  {
    id: "notif-order-shipped-arjun-002",
    userId: "user-arjun-singh",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_SHIPPED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "Your MG Gundam RX-78-2 has shipped!",
    message:
      "Great news! Your MG 1/100 RX-78-2 Gundam Ver. 3.0 has been dispatched by LetItRip Official. Tracking number: EKART4412238871. Estimated delivery: 2–3 business days.",
    actionUrl: "/user/orders/order-arjun-003-gundam-rx78",
    actionLabel: "Track Order",
    isRead: false,
    relatedId: "order-arjun-003-gundam-rx78",
    relatedType: "order",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },

  // ── 3. Bid Outbid — buyer (unread) ────────────────────────────────────────
  {
    id: "notif-bid-outbid-rahul-003",
    userId: "user-rahul-sharma",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_OUTBID,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "You've been outbid on the Charizard PSA 9!",
    message:
      "Someone placed a higher bid on the Pokémon 1st Edition Charizard #4 PSA 9. Current bid is ₹3,49,999. The auction ends in 8 hours — bid now to stay in the lead.",
    actionUrl: "/auctions/auction-pokemon-charizard-base1-psa9",
    actionLabel: "Place Bid",
    isRead: false,
    relatedId: "auction-pokemon-charizard-base1-psa9",
    relatedType: "product",
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(8),
  },

  // ── 4. Bid Won — buyer (read) ─────────────────────────────────────────────
  {
    id: "notif-bid-won-priya-004",
    userId: "user-priya-patel",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_WON,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "Congratulations — you won the Charizard auction! 🏆",
    message:
      "You are the winning bidder for Pokémon 1st Edition Charizard #4 PSA 9 at ₹3,29,999. Complete your payment within 24 hours to secure the card.",
    actionUrl: "/user/orders/order-priya-charizard",
    actionLabel: "Pay Now",
    isRead: true,
    readAt: daysAgo(12),
    relatedId: "auction-pokemon-charizard-base1-psa9",
    relatedType: "bid",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },

  // ── 5. Order Delivered — buyer (read) ─────────────────────────────────────
  {
    id: "notif-order-delivered-priya-005",
    userId: "user-priya-patel",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_DELIVERED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Your Nendoroid Rem has been delivered!",
    message:
      "Your order for Nendoroid Rem (Re:Zero) has been marked as delivered. Enjoying your new figure? Leave a review to help other collectors — it takes just 2 minutes.",
    actionUrl: "/user/orders/order-priya-002-nendoroid-rem",
    actionLabel: "Leave a Review",
    isRead: true,
    readAt: daysAgo(16),
    relatedId: "order-priya-002-nendoroid-rem",
    relatedType: "order",
    createdAt: daysAgo(16),
    updatedAt: daysAgo(16),
  },

  // ── 6. Review Approved — seller (unread) ──────────────────────────────────
  {
    id: "notif-review-approved-aryan-006",
    userId: "user-aryan-kapoor",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.REVIEW_APPROVED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "New 5-star review on your Pokémon 151 Booster Box",
    message:
      "Rahul Sharma left a 5-star review: \"Aryan packed this box like it was going to the moon. Pulled a Mew ex SAR on my first pack!\" Reviews help build trust — keep up the great work!",
    actionUrl: "/store/reviews",
    actionLabel: "View Review",
    isRead: false,
    relatedId: "review-pokemon-151-box-rahul-001",
    relatedType: "review",
    createdAt: daysAgo(54),
    updatedAt: daysAgo(54),
  },

  // ── 7. Offer Received — seller (unread) ───────────────────────────────────
  {
    id: "notif-offer-received-vikram-007",
    userId: "user-vikram-mehta",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.OFFER_RECEIVED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "New offer on your Hot Wheels Redline 1968 Banana Camaro",
    message:
      "Arjun Singh made an offer of ₹10,499 on your Hot Wheels 1968 Redline Banana Camaro (listed at ₹12,999). You have 24 hours to accept, decline, or counter-offer.",
    actionUrl: "/store/offers",
    actionLabel: "Respond to Offer",
    isRead: false,
    relatedId: "product-hot-wheels-redline-banana-1968",
    relatedType: "offer",
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
  },

  // ── 8. Product Available — buyer (unread) ─────────────────────────────────
  {
    id: "notif-product-available-meera-008",
    userId: "user-meera-nair",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PRODUCT_AVAILABLE,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Beyblade X BX-12 is now available!",
    message:
      "Good news — Beyblade Arena has listed the Beyblade X BX-12 booster set you were watching. Only 5 units available. Grab it before it sells out!",
    actionUrl: "/products/product-beyblade-x-bx01-dran-sword",
    actionLabel: "View Product",
    isRead: false,
    relatedId: "product-beyblade-x-bx01-dran-sword",
    relatedType: "product",
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
  },

  // ── 9. Refund Initiated — buyer (read) ────────────────────────────────────
  {
    id: "notif-refund-initiated-meera-009",
    userId: "user-meera-nair",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.REFUND_INITIATED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "Your refund of ₹12,999 has been initiated",
    message:
      "Your dispute for the Hot Wheels 1968 Redline Banana Camaro was resolved in your favour. A full refund of ₹12,999 has been initiated and will appear in your account within 5–7 business days.",
    actionUrl: "/user/orders/order-meera-008-hot-wheels-banana",
    actionLabel: "View Order",
    isRead: true,
    readAt: daysAgo(25),
    relatedId: "order-meera-008-hot-wheels-banana",
    relatedType: "order",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(25),
  },

  // ── 10. Promotion — buyer (read) ──────────────────────────────────────────
  {
    id: "notif-promotion-all-010",
    userId: "user-rahul-sharma",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PROMOTION,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "Hot Wheels Swap Meet — 30% off this weekend 🚗",
    message:
      "Diecast Depot is running a weekend flash sale: up to 30% off Treasure Hunts, Car Culture sets, and Tomica Limited Vintage. Sale ends Sunday midnight. Use code BLADER20 for Beyblades too!",
    actionUrl: "/events/event-hot-wheels-swap-meet-may-2026",
    actionLabel: "Shop the Sale",
    isRead: true,
    readAt: daysAgo(1),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
];
