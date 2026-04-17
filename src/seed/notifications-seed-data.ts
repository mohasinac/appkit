import "server-only";

/**
 * Notifications Seed Data
 * Sample in-app notifications for various users and event types
 */

import type { NotificationDocument } from "../features/admin/schemas";
import { NOTIFICATION_FIELDS } from "../features/admin/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const notificationsSeedData: Partial<NotificationDocument>[] = [
  // ── John Doe — various notification types ─────────────────────────────

  // Welcome notification
  {
    id: "notif-welcome-john-20240215",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetItRip, John! 🎉",
    message:
      "Thanks for joining. Browse thousands of anime collectibles, rare figures, and auction listings. Place bids, earn trust points by leaving helpful reviews.",
    actionUrl: "/products",
    actionLabel: "Start Exploring",
    isRead: true,
    readAt: daysAgo(753),
    createdAt: daysAgo(753),
    updatedAt: daysAgo(753),
  },

  // Order placed
  {
    id: "notif-order-placed-john-order1",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_PLACED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "Order Placed Successfully",
    message:
      "Your order for Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure (₹12,490) has been placed. Estimated delivery: 18 Jan 2026.",
    actionUrl: "/user/orders/order-1-20260115-xk7m9p",
    actionLabel: "View Order",
    isRead: true,
    readAt: daysAgo(53),
    relatedId: "order-1-20260115-xk7m9p",
    relatedType: "order",
    createdAt: daysAgo(53),
    updatedAt: daysAgo(53),
  },

  // Order shipped
  {
    id: "notif-order-shipped-john-order1",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_SHIPPED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "Your Order Has Been Shipped!",
    message:
      "Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure is on its way! Tracking: TRACK123456789. Expected delivery 18 Jan 2026.",
    actionUrl: "/user/orders/order-1-20260115-xk7m9p",
    actionLabel: "Track Order",
    isRead: true,
    readAt: daysAgo(52),
    relatedId: "order-1-20260115-xk7m9p",
    relatedType: "order",
    createdAt: daysAgo(52),
    updatedAt: daysAgo(52),
  },

  // Order delivered
  {
    id: "notif-order-delivered-john-order1",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_DELIVERED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Order Delivered — Please Leave a Review",
    message:
      "Your Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure has been delivered. Enjoying it? Leave a review and help other buyers make the right choice.",
    actionUrl:
      "/products/product-iphone-15-pro-max-smartphones-new-techhub-electronics-1",
    actionLabel: "Write a Review",
    isRead: true,
    readAt: daysAgo(50),
    relatedId: "order-1-20260115-xk7m9p",
    relatedType: "order",
    createdAt: daysAgo(50),
    updatedAt: daysAgo(50),
  },

  // Review approved
  {
    id: "notif-review-approved-john-goku-figure",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.REVIEW_APPROVED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "Your Review Has Been Approved",
    message:
      "Your review of Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure is now live. 24 community members have marked it as helpful!",
    actionUrl:
      "/products/product-iphone-15-pro-max-smartphones-new-techhub-electronics-1#reviews",
    actionLabel: "View Review",
    isRead: true,
    readAt: daysAgo(47),
    relatedId: "review-iphone-15-pro-max-john-20260120",
    relatedType: "review",
    createdAt: daysAgo(48),
    updatedAt: daysAgo(47),
  },

  // Bid outbid
  {
    id: "notif-bid-outbid-john-evangelion-art",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_OUTBID,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "You've Been Outbid!",
    message:
      "Someone placed a higher bid (₹16,500) on Gainax Evangelion Unit-01 Original Production Art. Bid again to stay in the race!",
    actionUrl:
      "/products/auction-vintage-canon-ae-1-film-camera-cameras-photography-used-techhub-electronics-1",
    actionLabel: "Place a New Bid",
    isRead: true,
    readAt: daysAgo(47),
    relatedId:
      "auction-vintage-canon-ae-1-film-camera-cameras-photography-used-techhub-electronics-1",
    relatedType: "product",
    createdAt: daysAgo(47),
    updatedAt: daysAgo(47),
  },

  // Promotion — unread
  {
    id: "notif-promotion-john-animecon-2026",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PROMOTION,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "AniCon 2026 Drop — Extra 15% Off 🎌",
    message:
      "Use code ANIMECON15 on any order over ₹999 until 15 March 2026. Don't miss out!",
    actionUrl: "/deals",
    actionLabel: "Shop Now",
    isRead: false,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },

  {
    id: "notif-welcome-jane-20240310",
    userId: "user-jane-smith-janes",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetItRip, Jane! 🎉",
    message:
      "Your account is all set. Start discovering great deals on anime figures, rare Nendoroids, and more.",
    actionUrl: "/products",
    actionLabel: "Start Shopping",
    isRead: true,
    readAt: daysAgo(729),
    createdAt: daysAgo(729),
    updatedAt: daysAgo(729),
  },

  {
    id: "notif-order-delivered-jane-order2",
    userId: "user-jane-smith-janes",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_DELIVERED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Order Delivered — Please Leave a Review",
    message:
      "Your Super Saiyan Vegeta Final Flash 1/4 Scale Statue has been delivered. Share your experience with the community!",
    actionUrl:
      "/products/product-samsung-galaxy-s24-ultra-smartphones-new-techhub-electronics-1",
    actionLabel: "Write a Review",
    isRead: true,
    readAt: daysAgo(44),
    relatedId: "order-1-20260120-b4n8q3",
    relatedType: "order",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(44),
  },

  // Bid won
  {
    id: "notif-bid-won-jane-evangelion-art",
    userId: "user-jane-smith-janes",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_WON,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "You Won the Auction! 🏆",
    message:
      "Congratulations! You won Gainax Evangelion Unit-01 Original Production Art with a bid of ₹19,500. Please complete payment within 24 hours.",
    actionUrl:
      "/products/auction-vintage-canon-ae-1-film-camera-cameras-photography-used-techhub-electronics-1",
    actionLabel: "Complete Payment",
    isRead: false,
    relatedId:
      "auction-vintage-canon-ae-1-film-camera-cameras-photography-used-techhub-electronics-1",
    relatedType: "bid",
    createdAt: daysAgo(32),
    updatedAt: daysAgo(32),
  },

  // ── Mike Johnson ─────────────────────────────────────────────────────

  {
    id: "notif-welcome-mike-20240405",
    userId: "user-mike-johnson-mikejohn",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetItRip, Mike! 🎉",
    message:
      "You're all set! Explore our anime collectibles, scale figures, and live auctions for rare finds.",
    actionUrl: "/products",
    actionLabel: "Start Exploring",
    isRead: true,
    readAt: daysAgo(703),
    createdAt: daysAgo(703),
    updatedAt: daysAgo(703),
  },

  {
    id: "notif-bid-lost-mike-evangelion-art",
    userId: "user-mike-johnson-mikejohn",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_LOST,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Auction Ended — Better Luck Next Time",
    message:
      "The auction for Gainax Evangelion Unit-01 Original Production Art has ended. Your highest bid was ₹17,500. Check out similar items!",
    actionUrl: "/products?category=cameras",
    actionLabel: "Browse Similar",
    isRead: false,
    relatedId:
      "auction-vintage-canon-ae-1-film-camera-cameras-photography-used-techhub-electronics-1",
    relatedType: "bid",
    createdAt: daysAgo(32),
    updatedAt: daysAgo(32),
  },

  // System notification (admin-level)
  {
    id: "notif-system-maintenance-mike",
    userId: "user-mike-johnson-mikejohn",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.SYSTEM,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "Scheduled Maintenance — 2 Mar 2026 2–4 AM IST",
    message:
      "LetItRip will be unavailable for scheduled maintenance on 2 March between 2 AM and 4 AM IST. Apologies for any inconvenience.",
    isRead: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },

  // ── TechHub Electronics (Seller) ──────────────────────────────────────

  {
    id: "notif-order-confirmed-figurevault-order1",
    userId: "user-techhub-electronics-electron",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_CONFIRMED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "New Order Received",
    message:
      "You have a new order for Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure (Qty: 1, ₹12,490). Ship within 24 hours to maintain your seller rating.",
    actionUrl: "/seller/orders/order-1-20260115-xk7m9p",
    actionLabel: "View Order",
    isRead: true,
    readAt: daysAgo(53),
    relatedId: "order-1-20260115-xk7m9p",
    relatedType: "order",
    createdAt: daysAgo(53),
    updatedAt: daysAgo(53),
  },

  {
    id: "notif-product-available-priya",
    userId: "user-priya-sharma-priya",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PRODUCT_AVAILABLE,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Back in Stock: Dragon Ball Goku 1/4 Scale Figure",
    message:
      "Good news! Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure is back in stock. Quantities are limited — grab yours before it sells out again.",
    actionUrl:
      "/products/product-iphone-15-pro-max-smartphones-new-techhub-electronics-1",
    actionLabel: "Buy Now",
    isRead: false,
    relatedId:
      "product-iphone-15-pro-max-smartphones-new-techhub-electronics-1",
    relatedType: "product",
    createdAt: daysAgo(17),
    updatedAt: daysAgo(17),
  },

  // ── order_cancelled — Jane Smith's order was cancelled ──────────────────
  // Tests: cancellation notification template, cancelled-order badge in notification list
  {
    id: "notif-order-cancelled-jane-20260210",
    userId: "user-jane-smith-janes",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_CANCELLED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "Order Cancelled",
    message:
      "Your order for Bleach Ichigo Bankai Tensa Zangetsu 1/6 Scale Figure (₹8,990) has been cancelled as requested. Refund will be credited to your original payment method within 5–7 working days.",
    actionUrl: "/user/orders/order-cancelled-1-20260210-lv4x7c",
    actionLabel: "View Cancelled Order",
    isRead: true,
    readAt: daysAgo(27),
    relatedId: "order-cancelled-1-20260210-lv4x7c",
    relatedType: "order",
    createdAt: daysAgo(27),
    updatedAt: daysAgo(27),
  },

  // ── bid_placed — Meera placed a bid on the Leica ─────────────────────────
  // Tests: bid placement confirmation notification, bid summary data in payload
  {
    id: "notif-bid-placed-vikram-evangelion-poster-20260219",
    userId: "user-vikram-nair-vikram",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_PLACED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Bid Placed Successfully",
    message:
      "Your bid of ₹97,500 on Neon Genesis Evangelion 1995 Limited-Run Signed Poster has been placed. You are currently the highest bidder. Auction ends 5 Mar 2026.",
    actionUrl: "/products/product-vintage-leica-camera-auction-artisan-1",
    actionLabel: "View Auction",
    isRead: true,
    readAt: daysAgo(18),
    relatedId: "product-vintage-leica-camera-auction-artisan-1",
    relatedType: "product",
    createdAt: daysAgo(18),
    updatedAt: daysAgo(18),
  },

  // ── review_replied — seller replied to John's review ────────────────────
  // Tests: review-reply notification, deep link to the review thread
  {
    id: "notif-review-replied-john-goku-figure-20260202",
    userId: "user-john-doe-johndoe",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.REVIEW_REPLIED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "FigureVault JP Replied to Your Review",
    message:
      'FigureVault JP replied to your review of Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure: "Thank you for your wonderful feedback, John! We\'re thrilled the figure has exceeded your expectations."',
    actionUrl:
      "/products/product-iphone-15-pro-max-smartphones-new-techhub-electronics-1#reviews",
    actionLabel: "View Reply",
    isRead: false,
    relatedId: "review-john-iphone15-5star-001",
    relatedType: "review",
    createdAt: daysAgo(35),
    updatedAt: daysAgo(35),
  },

  // ── Ananya Bose ───────────────────────────────────────────────────────

  {
    id: "notif-welcome-ananya-20251015",
    userId: "user-ananya-bose-ananya",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetItRip, Ananya! 🎉",
    message:
      "Great to have you! Discover thousands of products, join live auctions, and earn trust points by leaving helpful reviews.",
    actionUrl: "/products",
    actionLabel: "Start Shopping",
    isRead: true,
    readAt: daysAgo(145),
    createdAt: daysAgo(145),
    updatedAt: daysAgo(145),
  },
  {
    id: "notif-bid-outbid-ananya-ps5-20260306",
    userId: "user-ananya-bose-ananya",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_OUTBID,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "You've Been Outbid on PS5 Slim!",
    message:
      "Someone placed a higher bid (₹48,000) on PS5 Slim Gaming Console. Bid again before the auction ends on 7 Mar!",
    actionUrl: "/products/auction-ps5-slim-gaming-console-techhub-1",
    actionLabel: "Place a New Bid",
    isRead: false,
    relatedId: "auction-ps5-slim-gaming-console-techhub-1",
    relatedType: "product",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "notif-promotion-ananya-animecon-2026",
    userId: "user-ananya-bose-ananya",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PROMOTION,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "AniCon 2026 Drop — Extra 15% Off 🎌",
    message:
      "Use code ANIMECON15 on any order over ₹999 until 15 March 2026. Don't miss out!",
    actionUrl: "/products",
    actionLabel: "Shop Now",
    isRead: false,
    relatedId: "event-anicon-2026-coupon-drop-offer",
    relatedType: "product",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },

  // ── Pooja Mehta ───────────────────────────────────────────────────────

  {
    id: "notif-welcome-pooja-20251110",
    userId: "user-pooja-mehta-pooja",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetItRip, Pooja! 🎉",
    message:
      "Your account is ready. Explore fashion, electronics, and live auctions — all in one place.",
    actionUrl: "/products",
    actionLabel: "Start Exploring",
    isRead: true,
    readAt: daysAgo(119),
    createdAt: daysAgo(119),
    updatedAt: daysAgo(119),
  },
  {
    id: "notif-bid-placed-pooja-saber-alter-20260303",
    userId: "user-pooja-mehta-pooja",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_PLACED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Bid Placed Successfully",
    message:
      "Your bid of ₹28,000 on Fate/Stay Night Saber Alter Wedding Dress 1/7 Scale has been placed. You are currently the highest bidder. Auction ends 13 Mar 2026.",
    actionUrl: "/products/auction-fate-saber-alter-figure-techhub-1",
    actionLabel: "View Auction",
    isRead: true,
    readAt: daysAgo(6),
    relatedId: "auction-fate-saber-alter-figure-techhub-1",
    relatedType: "product",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
  {
    id: "notif-promotion-pooja-animecon-2026",
    userId: "user-pooja-mehta-pooja",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PROMOTION,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "AniCon 2026 Drop — Extra 15% Off 🎌",
    message: "Use code ANIMECON15 on any order over ₹999 until 15 March 2026.",
    actionUrl: "/products",
    actionLabel: "Shop Now",
    isRead: false,
    relatedId: "event-anicon-2026-coupon-drop-offer",
    relatedType: "product",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },

  // ── Ravi Kumar ────────────────────────────────────────────────────────

  {
    id: "notif-welcome-ravi-20251201",
    userId: "user-ravi-kumar-ravi",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetItRip, Ravi! 🎉",
    message:
      "Glad you're here! Browse rare anime figures, collectibles, and live auction listings in one marketplace.",
    actionUrl: "/products",
    actionLabel: "Explore Now",
    isRead: true,
    readAt: daysAgo(98),
    createdAt: daysAgo(98),
    updatedAt: daysAgo(98),
  },
  {
    id: "notif-bid-placed-ravi-dbz-set-20260228",
    userId: "user-ravi-kumar-ravi",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_PLACED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Bid Placed Successfully",
    message:
      "Your bid of ₹1,85,000 on Dragon Ball Z Complete Son Goku Family Collector Set has been placed. You are currently the highest bidder. Auction ends 16 Mar 2026.",
    actionUrl: "/products/product-macbook-pro-m3-auction-electronics-techhub-1",
    actionLabel: "View Auction",
    isRead: true,
    readAt: daysAgo(9),
    relatedId: "product-macbook-pro-m3-auction-electronics-techhub-1",
    relatedType: "product",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },
  {
    id: "notif-product-available-ravi-charizard-psa9",
    userId: "user-ravi-kumar-ravi",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PRODUCT_AVAILABLE,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "New Auction Live: Pokémon Charizard PSA-9 🎦",
    message:
      "New Live Auction: Pokémon 1st Edition Base Set Charizard Holo — PSA Graded 9. Bidding starts at ₹25,000. Auction ends 14 Mar 2026!",
    actionUrl: "/products/auction-pokemon-charizard-1st-ed-fashion-1",
    actionLabel: "View Auction",
    isRead: false,
    relatedId: "auction-pokemon-charizard-1st-ed-fashion-1",
    relatedType: "product",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },

  // ── Sneha Gupta ───────────────────────────────────────────────────────

  {
    id: "notif-welcome-sneha-20260105",
    userId: "user-sneha-gupta-sneha",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.WELCOME,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Welcome to LetItRip, Sneha! 🎉",
    message:
      "You're in! Browse anime figures, Gunpla model kits, Nendoroids, and live auctions from verified collectible sellers.",
    actionUrl: "/products",
    actionLabel: "Start Shopping",
    isRead: true,
    readAt: daysAgo(63),
    createdAt: daysAgo(63),
    updatedAt: daysAgo(63),
  },
  {
    id: "notif-bid-placed-sneha-wing-zero-20260304",
    userId: "user-sneha-gupta-sneha",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.BID_PLACED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.NORMAL,
    title: "Bid Placed Successfully",
    message:
      "Your bid of ₹14,500 on Gundam Wing Perfect Grade Wing Zero Custom — Full Build has been placed. You are currently the highest bidder. Auction ends 15 Mar 2026.",
    actionUrl: "/products/auction-gunpla-pg-wing-zero-techhub-1",
    actionLabel: "View Auction",
    isRead: true,
    readAt: daysAgo(5),
    relatedId: "auction-gunpla-pg-wing-zero-techhub-1",
    relatedType: "product",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "notif-promotion-sneha-animecon-2026",
    userId: "user-sneha-gupta-sneha",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.PROMOTION,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.LOW,
    title: "AniCon 2026 Drop — Extra 15% Off 🎌",
    message: "Use code ANIMECON15 on any order over ₹999 until 15 March 2026.",
    actionUrl: "/products",
    actionLabel: "Shop Now",
    isRead: false,
    relatedId: "event-anicon-2026-coupon-drop-offer",
    relatedType: "product",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },

  // ── TechHub Seller — new auction sale order notifications ─────────────

  {
    id: "notif-auction-ending-figurevault-ps5-20260301",
    userId: "user-techhub-electronics-electron",
    type: NOTIFICATION_FIELDS.TYPE_VALUES.ORDER_CONFIRMED,
    priority: NOTIFICATION_FIELDS.PRIORITY_VALUES.HIGH,
    title: "Auction Ending Soon: PS5 Slim",
    message:
      "Your PS5 Slim Gaming Console auction ends 7 Mar 2026 — 3 active bidders, current top bid ₹48,000.",
    actionUrl: "/seller/products/auction-ps5-slim-gaming-console-techhub-1",
    actionLabel: "View Auction",
    isRead: false,
    relatedId: "auction-ps5-slim-gaming-console-techhub-1",
    relatedType: "product",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
];
