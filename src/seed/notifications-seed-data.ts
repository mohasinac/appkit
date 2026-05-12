/**
 * Notifications Seed Data — LetItRip Collectibles Platform
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
    title: "Welcome to LetItRip, Rahul! 🎉",
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

  // ── P29 expansion (S17 2026-05-12) — 30 more notifications via helper ───
  ...buildNotificationBatch([
    { user: "user-priya-patel", type: "ORDER_PLACED", title: "Order confirmed — 2 items", message: "Your order for 2 items has been placed. We'll notify you when it ships.", read: true, hours: 72 },
    { user: "user-priya-patel", type: "ORDER_CONFIRMED", title: "Payment confirmed", message: "Razorpay payment successful for ₹4,499. Your order is being prepared.", read: true, hours: 70 },
    { user: "user-priya-patel", type: "ORDER_SHIPPED", title: "Order shipped via Blue Dart", message: "Tracking BD3458912 — estimated delivery in 3 days.", read: false, hours: 24 },
    { user: "user-meera-nair", type: "ORDER_DELIVERED", title: "Delivered — Hot Wheels Premium Set", message: "Your Hot Wheels Premium 5-pack has been delivered. Please leave a review.", read: false, hours: 6 },
    { user: "user-arjun-singh", type: "ORDER_CANCELLED", title: "Order cancelled — refund initiated", message: "Your order was cancelled. Refund of ₹1,299 will reflect in 5–7 business days.", read: true, hours: 96 },
    { user: "user-rohit-joshi", type: "REFUND_INITIATED", title: "Refund processed", message: "₹999 has been refunded to your original payment method.", read: false, hours: 12 },
    { user: "user-kavya-iyer", type: "BID_PLACED", title: "Bid placed on Funko Stan Lee Glow Chase", message: "Your bid of ₹7,499 is now the highest. Auction ends in 96 hours.", read: true, hours: 36 },
    { user: "user-kartik-nair", type: "BID_OUTBID", title: "You've been outbid on Funko Stan Lee", message: "Someone placed ₹8,999. Bid again — auction ends in 48 hours.", read: false, hours: 8 },
    { user: "user-naman-gupta", type: "BID_PLACED", title: "Bid placed on Spriggan Requiem", message: "Your bid of ₹6,999 is now the highest.", read: false, hours: 4 },
    { user: "user-tanvi-desai", type: "BID_OUTBID", title: "Outbid on Spriggan Requiem", message: "₹8,999 is the current high bid. Auction ends in 5 days.", read: false, hours: 2 },
    { user: "user-priya-singh", type: "BID_WON", title: "You won the Shadowless Blastoise BGS 8.5! 🏆", message: "Congratulations — final bid ₹39,999. Please pay within 48 hours.", read: true, hours: 336 },
    { user: "user-amit-sharma", type: "BID_LOST", title: "Auction ended — outbid on Blastoise", message: "Shadowless Blastoise sold for ₹39,999. Better luck next time!", read: true, hours: 336 },
    { user: "user-rohit-verma", type: "BID_WON", title: "You won the Goku Ultra Instinct! 🏆", message: "Final bid ₹14,999. Payment due within 48 hours.", read: false, hours: 72 },
    { user: "user-divya-menon", type: "PRODUCT_AVAILABLE", title: "Pokémon Stellar Crown ETB back in stock!", message: "The Pokémon Stellar Crown Elite Trainer Box is available for pre-order again.", read: false, hours: 18 },
    { user: "user-ankit-gupta", type: "PRODUCT_AVAILABLE", title: "Beyblade X BX-20 Phoenix Wing pre-orders open", message: "Pre-orders for Phoenix Wing BX-20 are now open. Ships in 60 days.", read: true, hours: 48 },
    { user: "user-rahul-sharma", type: "REVIEW_APPROVED", title: "Your review was approved", message: "Your 5-star review on the PSA 9 Charizard has been published.", read: true, hours: 24 },
    { user: "user-priya-patel", type: "REVIEW_REPLIED", title: "Seller replied to your review", message: "CardGame Hub responded to your review. Tap to read.", read: false, hours: 6 },
    { user: "user-sneha-kumar", type: "REVIEW_APPROVED", title: "Review published", message: "Your review of the Hot Wheels Treasure Hunt set is now live.", read: false, hours: 3 },
    { user: "user-kiran-reddy", type: "OFFER_RECEIVED", title: "Offer of ₹3,999 received on your Mafex Spider-Man", message: "Naman G has offered ₹3,999. Tap to accept, decline, or counter.", read: false, hours: 5 },
    { user: "user-preeti-joshi", type: "OFFER_RESPONDED", title: "Your offer was accepted!", message: "Tokyo Toys India accepted your ₹2,499 offer. Pay now to confirm.", read: false, hours: 7 },
    { user: "user-varun-bhat", type: "OFFER_EXPIRED", title: "Offer expired — no response from seller", message: "Your offer of ₹4,499 on the PG Unicorn pre-order has expired.", read: true, hours: 72 },
    { user: "user-naman-gupta", type: "OFFER_COUNTER_ACCEPTED", title: "Seller's counter accepted", message: "You accepted the counter-offer of ₹3,200 on the S.H.Figuarts Broly. Order placed.", read: true, hours: 12 },
    { user: "user-aryan-kapoor", type: "PROMOTION", title: "20% off all auctions this weekend", message: "Use code AUCTION25 for 25% off shipping on any auction this weekend.", read: false, hours: 14 },
    { user: "user-nisha-reddy", type: "PROMOTION", title: "BIGBANG2026 — ₹1,000 off orders ₹10k+", message: "Limited offer. Once per user. Valid 90 days.", read: false, hours: 20 },
    { user: "user-vikram-mehta", type: "SYSTEM", title: "Profile verification complete", message: "Your seller profile has been verified. You can now list auctions and pre-orders.", read: true, hours: 168 },
    { user: "user-rohit-joshi", type: "SYSTEM", title: "Payout settings updated", message: "Next payout will reflect the new UPI VPA.", read: true, hours: 72 },
    { user: "user-priya-singh", type: "WELCOME", title: "Welcome to LetItRip, Priya!", message: "Browse premium anime figures from Tokyo Toys India and 7 other verified sellers.", read: true, hours: 720 },
    { user: "user-amit-sharma", type: "WELCOME", title: "Welcome to LetItRip Seller Tools", message: "Your store Gundam Galaxy is now live. List your first product to get started.", read: true, hours: 1440 },
    { user: "user-anjali-verma", type: "WELCOME", title: "Welcome, Anjali!", message: "Use NEWUSER5 for ₹50 off your first order.", read: false, hours: 4 },
    { user: "user-pooja-sharma", type: "PROMOTION", title: "Wishlist sale — items in your wishlist are 15% off", message: "3 items in your wishlist are now on sale. Tap to view.", read: false, hours: 9 },
  ]),
];

interface NotifSpec {
  user: string;
  type: keyof typeof NOTIFICATION_FIELDS.TYPE_VALUES;
  title: string;
  message: string;
  read: boolean;
  /** Hours ago the notification was created. */
  hours: number;
}

/**
 * Compact constructor for the P29 expansion. Keeps each row a single line of
 * spec and lets the helper backfill `id`, `priority`, `readAt`, timestamps.
 * High-priority types: bidding, OFFER_RECEIVED, ORDER_DELIVERED.
 */
function buildNotificationBatch(
  specs: NotifSpec[],
): Partial<NotificationDocument>[] {
  return specs.map((s, i) => {
    const created = hoursAgo(s.hours);
    const high =
      s.type.startsWith("BID_") ||
      s.type === "ORDER_DELIVERED" ||
      s.type === "OFFER_RECEIVED";
    return {
      id: `notif-batch-${s.user.replace("user-", "")}-${String(i + 1).padStart(3, "0")}`,
      userId: s.user,
      type: NOTIFICATION_FIELDS.TYPE_VALUES[s.type],
      priority: high
        ? NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH
        : NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
      title: s.title,
      message: s.message,
      isRead: s.read,
      readAt: s.read ? hoursAgo(Math.max(0, s.hours - 1)) : undefined,
      createdAt: created,
      updatedAt: created,
    };
  });
}
