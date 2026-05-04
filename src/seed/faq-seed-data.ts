/**
 * LetItRip FAQ Seed Data
 *
 * 65 FAQs across 7 categories, accurate to the LetItRip platform:
 * - Multi-seller Pokemon TCG marketplace with auctions
 * - Returns and free shipping are store-level policies (not platform-wide)
 * - Platform can issue coupons / promo codes
 * - India-focused (INR, GST, Indian payment methods)
 *
 * Categories:
 *   general            — 10 FAQs
 *   orders_payment     — 12 FAQs
 *   shipping_delivery  — 10 FAQs
 *   returns_refunds    — 10 FAQs
 *   product_information — 10 FAQs
 *   account_security   —  8 FAQs
 *   technical_support  —  5 FAQs
 */

import type { FAQCategory, FAQDocument } from "../features/faq/schemas";

type SeedFAQ = {
  id?: string;
  question: string;
  answer: string;
  format?: "plain" | "html" | "markdown";
  category: FAQCategory;
  showOnHomepage: boolean;
  showInFooter: boolean;
  isPinned: boolean;
  order: number;
  priority: number;
  tags: string[];
  relatedFAQs: string[];
  useSiteSettings: boolean;
  variables?: Record<string, string>;
  stats: { views: number; helpful: number; notHelpful: number };
  seo: { slug: string; metaTitle: string; metaDescription: string };
  isActive: boolean;
  createdBy: string;
};

function buildSearchTokens(input: {
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string[];
}): string[] {
  const rawText = [input.question, input.answer, input.category, ...input.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Array.from(
    new Set(
      rawText
        .split(/[^a-z0-9]+/i)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2),
    ),
  ).slice(0, 50);
}

function normalizeFaqSeed(
  faq: SeedFAQ,
): Omit<FAQDocument, "createdAt" | "updatedAt"> {
  return {
    id: faq.id ?? "",
    question: faq.question,
    answer: {
      text: faq.answer,
      format: faq.format ?? "html",
    },
    category: faq.category,
    showOnHomepage: faq.showOnHomepage,
    showInFooter: faq.showInFooter,
    isPinned: faq.isPinned,
    order: faq.order,
    priority: faq.priority,
    tags: faq.tags,
    searchTokens: buildSearchTokens({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags,
    }),
    relatedFAQs: faq.relatedFAQs,
    useSiteSettings: faq.useSiteSettings,
    variables: faq.variables,
    stats: faq.stats,
    seo: faq.seo,
    isActive: faq.isActive,
    createdBy: faq.createdBy,
  };
}

const RAW_FAQS: SeedFAQ[] = [
  // ============================================
  // GENERAL — 10 FAQs
  // ============================================
  {
    question: "What is LetItRip?",
    answer:
      "<p>LetItRip is a curated multi-seller marketplace for <strong>Pokemon TCG cards and collectibles</strong>. Browse thousands of singles, sealed products, and PSA/BGS graded cards from verified sellers across India. You can also participate in live auctions to win rare cards.</p>",
    category: "general",
    showOnHomepage: true,
    showInFooter: true,
    isPinned: true,
    order: 1,
    priority: 10,
    tags: ["about", "platform", "introduction", "pokemon", "tcg"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 1240, helpful: 890, notHelpful: 42 },
    seo: {
      slug: "what-is-letitrip",
      metaTitle: "What is LetItRip? | Pokemon TCG Marketplace & Auctions India",
      metaDescription:
        "LetItRip is India's trusted multi-seller marketplace for Pokemon TCG singles, sealed products, graded cards and live auctions.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I contact customer support?",
    answer:
      "<p>You can reach our support team at <strong>{{supportEmail}}</strong> or call <strong>{{supportPhone}}</strong>. We're available <strong>Monday to Saturday, 10 AM – 6 PM IST</strong>.</p><p>For seller-specific issues (shipping delays, return requests), please contact the seller directly via the order page first.</p>",
    category: "general",
    showOnHomepage: true,
    showInFooter: true,
    isPinned: false,
    order: 2,
    priority: 9,
    tags: ["support", "contact", "help", "email", "phone"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 980, helpful: 720, notHelpful: 38 },
    seo: {
      slug: "contact-customer-support",
      metaTitle: "Contact LetItRip Customer Support | Help Centre",
      metaDescription:
        "Reach LetItRip support by email or phone. Available Mon–Sat, 10 AM to 6 PM IST.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Is LetItRip available across India?",
    answer:
      "<p>Yes. LetItRip is accessible from anywhere in India. Delivery availability and shipping timelines depend on the individual seller's shipping policy and their chosen courier partners. Check each product listing for delivery eligibility to your pincode.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 7,
    tags: ["india", "availability", "locations", "delivery"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 560, helpful: 430, notHelpful: 18 },
    seo: {
      slug: "letitrip-availability-india",
      metaTitle: "Is LetItRip Available Across India? | Coverage & Delivery",
      metaDescription:
        "LetItRip is accessible across India. Delivery depends on each seller's shipping policy and pincode coverage.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Do I need an account to browse listings?",
    answer:
      "<p>No — you can browse all product listings, auctions, and store pages without signing in. However, you need an account to <strong>place bids, add items to your wishlist, write reviews, or make purchases</strong>.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 6,
    tags: ["account", "browse", "guest", "login"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 410, helpful: 320, notHelpful: 12 },
    seo: {
      slug: "do-i-need-account-to-browse",
      metaTitle: "Do I Need an Account to Browse LetItRip? | FAQ",
      metaDescription:
        "Browse LetItRip listings freely without an account. An account is required to buy, bid, or wishlist items.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How are sellers verified on LetItRip?",
    answer:
      "<p>All sellers on LetItRip go through an onboarding review before their store goes live. We verify identity documents, check product authenticity claims, and review listing quality. Sellers who consistently receive good feedback and maintain return policies earn a <strong>Verified Seller</strong> badge.</p><p>We encourage buyers to always check a store's ratings and reviews before purchasing high-value cards.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 8,
    tags: ["sellers", "verified", "trust", "authenticity"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 730, helpful: 610, notHelpful: 28 },
    seo: {
      slug: "how-are-sellers-verified",
      metaTitle: "How Are Sellers Verified on LetItRip? | Trust & Safety",
      metaDescription:
        "LetItRip verifies all sellers through identity review, authenticity checks, and listing quality assessments.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What types of products can I find on LetItRip?",
    answer:
      "<ul><li><strong>Pokemon TCG Singles</strong> — Base Set, Jungle, Fossil, Neo, EX, VMAX, and modern sets</li><li><strong>Sealed Products</strong> — Booster packs, booster boxes, Elite Trainer Boxes</li><li><strong>Graded Cards</strong> — PSA, BGS, CGC slabs</li><li><strong>Accessories</strong> — Card sleeves, binders, deck boxes, top loaders</li></ul><p>We focus exclusively on Pokemon TCG to ensure quality and expertise across every listing.</p>",
    category: "general",
    showOnHomepage: true,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 8,
    tags: ["products", "singles", "sealed", "graded", "accessories", "pokemon"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 820, helpful: 680, notHelpful: 22 },
    seo: {
      slug: "what-products-on-letitrip",
      metaTitle: "What Products Are on LetItRip? | Pokemon TCG Marketplace",
      metaDescription:
        "Find Pokemon TCG singles, sealed booster boxes, PSA graded cards, and accessories from verified sellers.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I sell on LetItRip?",
    answer:
      "<p>Yes! If you're a Pokemon TCG collector or dealer, you can apply to open a store on LetItRip. Visit the <strong>Sell on LetItRip</strong> page to submit your application. Our team reviews applications within 3–5 business days.</p><p>Each seller sets their own pricing, shipping rates, and return policy.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: true,
    isPinned: false,
    order: 7,
    priority: 7,
    tags: ["sell", "seller", "store", "open-store"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 640, helpful: 530, notHelpful: 24 },
    seo: {
      slug: "can-i-sell-on-letitrip",
      metaTitle: "Can I Sell on LetItRip? | Open a Pokemon TCG Store",
      metaDescription:
        "Apply to sell Pokemon TCG cards on LetItRip. Set your own pricing, shipping, and return policy.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Does LetItRip have a mobile app?",
    answer:
      "<p>Our <strong>mobile-optimised website</strong> works on all smartphones and tablets. A dedicated app is on our roadmap — follow our social pages for launch announcements.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 4,
    tags: ["app", "mobile", "android", "ios"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 390, helpful: 280, notHelpful: 35 },
    seo: {
      slug: "letitrip-mobile-app",
      metaTitle: "Does LetItRip Have a Mobile App? | FAQ",
      metaDescription:
        "LetItRip is optimised for mobile browsers. A dedicated app is coming soon.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I report a fake or misrepresented listing?",
    answer:
      "<p>On any product page, click the <strong>Report Listing</strong> link and describe the issue. Our moderation team reviews reports within 24 hours. Listings found to be fake or misrepresented are immediately removed and the seller is flagged.</p><p>For urgent issues, email us at <strong>{{supportEmail}}</strong> with the listing URL and photo evidence.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 9,
    priority: 8,
    tags: ["fake", "fraud", "report", "counterfeit", "authenticity"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 520, helpful: 460, notHelpful: 15 },
    seo: {
      slug: "report-fake-listing",
      metaTitle: "How to Report a Fake or Misrepresented Listing | LetItRip",
      metaDescription:
        "Report counterfeit or misrepresented Pokemon cards on LetItRip. Our team reviews reports within 24 hours.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Are there any community events or giveaways?",
    answer:
      "<p>Yes! LetItRip regularly runs <strong>polls, giveaways, surveys, and contests</strong> for the Pokemon TCG community. Check the <strong>Events</strong> section to see what's live right now. Winners are announced on the event page and notified by email.</p>",
    category: "general",
    showOnHomepage: true,
    showInFooter: false,
    isPinned: false,
    order: 10,
    priority: 6,
    tags: ["events", "giveaway", "community", "contests", "pokemon"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 480, helpful: 390, notHelpful: 19 },
    seo: {
      slug: "community-events-giveaways",
      metaTitle: "Community Events & Giveaways | LetItRip Pokemon TCG",
      metaDescription:
        "LetItRip hosts polls, giveaways, and contests for Pokemon TCG collectors. Check the Events section for live activities.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ============================================
  // ORDERS & PAYMENT — 12 FAQs
  // ============================================
  {
    question: "What payment methods does LetItRip accept?",
    answer:
      "<p>We accept a wide range of payment methods through our secure payment gateway:</p><ul><li>UPI (GPay, PhonePe, Paytm, BHIM)</li><li>Net Banking</li><li>Credit and Debit Cards (Visa, Mastercard, RuPay)</li><li>EMI (on eligible cards)</li><li>Wallets (Paytm, Mobikwik)</li></ul><p>All transactions are secured via Razorpay and are PCI-DSS compliant.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: true,
    order: 1,
    priority: 10,
    tags: ["payment", "upi", "cards", "emi", "razorpay", "net-banking"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 1120, helpful: 890, notHelpful: 30 },
    seo: {
      slug: "accepted-payment-methods",
      metaTitle: "Accepted Payment Methods | LetItRip Checkout",
      metaDescription:
        "Pay via UPI, cards, net banking, EMI, or wallets. All payments secured through Razorpay.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I use a coupon or promo code?",
    answer:
      "<p>Yes! LetItRip issues platform-wide coupons for events like new user offers, seasonal sales, and community milestones. To apply a coupon:</p><ol><li>Add items to your cart</li><li>At checkout, enter the code in the <strong>Promo Code</strong> field</li><li>Click <strong>Apply</strong> — the discount will reflect immediately</li></ol><p>Coupons are issued by LetItRip and may have minimum order values, expiry dates, or category restrictions. Check the <strong>Events</strong> page for currently active codes.</p>",
    category: "orders_payment",
    showOnHomepage: true,
    showInFooter: false,
    isPinned: true,
    order: 2,
    priority: 9,
    tags: ["coupon", "promo-code", "discount", "offer"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 780, helpful: 640, notHelpful: 28 },
    seo: {
      slug: "how-to-use-coupon-promo-code",
      metaTitle: "How to Use a Coupon or Promo Code | LetItRip Checkout",
      metaDescription:
        "Apply LetItRip coupon codes at checkout for discounts. Check the Events page for active promo codes.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Where can I find active coupons and offers?",
    answer:
      "<p>All active coupons and offers are published in the <strong>Events</strong> section of the website. You may also receive exclusive codes via email if you're subscribed to our newsletter. Follow us on social media for flash-offer announcements.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 7,
    tags: ["coupon", "offers", "events", "newsletter", "discount"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 540, helpful: 430, notHelpful: 22 },
    seo: {
      slug: "where-to-find-coupons",
      metaTitle: "Where to Find Active Coupons & Offers | LetItRip",
      metaDescription:
        "Find active coupon codes in the LetItRip Events section or via our newsletter.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Is it safe to pay on LetItRip?",
    answer:
      "<p>Yes. All payments are processed through <strong>Razorpay</strong>, a PCI-DSS Level 1 certified payment gateway. Your card and UPI details are never stored on our servers. Every transaction is encrypted with TLS 1.3.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 9,
    tags: ["safe", "secure", "payment", "razorpay", "pci", "encryption"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 870, helpful: 740, notHelpful: 25 },
    seo: {
      slug: "is-it-safe-to-pay",
      metaTitle: "Is It Safe to Pay on LetItRip? | Secure Checkout",
      metaDescription:
        "Payments on LetItRip are secured via Razorpay (PCI-DSS Level 1). Your payment details are never stored.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "My payment failed — what do I do?",
    answer:
      "<p>If your payment fails:</p><ol><li>Check that your bank has not blocked the transaction (some banks require 2FA approval)</li><li>Ensure your card/UPI has sufficient balance or limit</li><li>Try a different payment method</li><li>If the amount was debited but your order wasn't placed, it will be automatically refunded within <strong>5–7 business days</strong></li></ol><p>Contact our support at <strong>{{supportEmail}}</strong> if the issue persists.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 8,
    tags: ["payment-failed", "failed-transaction", "refund", "bank"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 690, helpful: 590, notHelpful: 35 },
    seo: {
      slug: "payment-failed-what-to-do",
      metaTitle: "Payment Failed — What to Do? | LetItRip FAQ",
      metaDescription:
        "Troubleshoot failed payments on LetItRip. Debited amounts are refunded within 5–7 business days.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I track my order?",
    answer:
      "<p>Once the seller ships your order, you'll receive an email with a <strong>tracking number and courier name</strong>. You can also track it from <strong>My Orders</strong> in your account. Click the tracking number to open the courier's tracking portal.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 8,
    tags: ["track", "order", "shipping", "courier", "tracking-number"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 920, helpful: 770, notHelpful: 30 },
    seo: {
      slug: "how-to-track-order",
      metaTitle: "How to Track My Order | LetItRip Order Tracking",
      metaDescription:
        "Track your LetItRip order via email notification or from My Orders in your account.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I cancel an order after placing it?",
    answer:
      "<p>Order cancellation depends on whether the seller has already shipped the item:</p><ul><li><strong>Before shipping:</strong> Contact the seller immediately through the order page. Most sellers can cancel at this stage.</li><li><strong>After shipping:</strong> Cancellations are generally not possible. You would need to go through the seller's return process once the order arrives.</li></ul><p>Auction orders cannot be cancelled after a bid is won.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 7,
    tags: ["cancel", "order-cancellation", "refund"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 760, helpful: 610, notHelpful: 42 },
    seo: {
      slug: "cancel-order-after-placing",
      metaTitle: "Can I Cancel My Order After Placing It? | LetItRip FAQ",
      metaDescription:
        "Orders can be cancelled before shipment by contacting the seller. Shipped orders follow the seller's return policy.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Will I receive a GST invoice for my purchase?",
    answer:
      "<p>Invoices are issued by the individual sellers. If a seller is GST-registered, you'll receive a GST invoice from them. To request a GST invoice, contact the seller via the order page and provide your GSTIN. LetItRip does not issue invoices on behalf of sellers.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 6,
    tags: ["gst", "invoice", "tax", "gstin"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 440, helpful: 370, notHelpful: 28 },
    seo: {
      slug: "gst-invoice-purchase",
      metaTitle: "Will I Get a GST Invoice? | LetItRip Tax & Billing",
      metaDescription:
        "GST invoices are issued by individual sellers. Contact the seller with your GSTIN to request one.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do auctions work on LetItRip?",
    answer:
      "<p>Here's how live auctions work:</p><ol><li>Find an auction listing with an active countdown timer</li><li>Click <strong>Place Bid</strong> and enter an amount higher than the current bid</li><li>If your bid is the highest when the timer ends, you win the auction</li><li>You'll receive a payment link / checkout prompt to complete the purchase</li></ol><p>All bids are binding. If you win, you must complete the purchase. Failing to pay after winning may result in account suspension.</p>",
    category: "orders_payment",
    showOnHomepage: true,
    showInFooter: false,
    isPinned: true,
    order: 9,
    priority: 9,
    tags: ["auction", "bid", "bidding", "how-it-works", "live-auction"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 1050, helpful: 890, notHelpful: 38 },
    seo: {
      slug: "how-auctions-work",
      metaTitle: "How Do Auctions Work on LetItRip? | Live Auction Guide",
      metaDescription:
        "Place bids on Pokemon TCG cards in LetItRip live auctions. Highest bidder when the timer ends wins.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What happens if I win an auction but don't pay?",
    answer:
      "<p>All bids are binding commitments. If you win an auction and fail to complete payment within the required window, your bid will be voided, the seller may re-list the item, and your account may be <strong>suspended from future bidding</strong>. Repeat non-payment leads to permanent ban from auctions.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 10,
    priority: 8,
    tags: ["auction", "non-payment", "bid", "suspension"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 510, helpful: 420, notHelpful: 20 },
    seo: {
      slug: "auction-non-payment-policy",
      metaTitle: "What Happens If I Win but Don't Pay? | Auction Policy",
      metaDescription:
        "Failing to pay after winning an auction may result in account suspension from future bidding on LetItRip.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I place a bid on multiple items at once?",
    answer:
      "<p>Yes, you can have active bids on multiple auction listings simultaneously. Just keep in mind that winning all of them means you must pay for all of them. Manage your budget carefully before bidding across multiple auctions.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 11,
    priority: 5,
    tags: ["auction", "multiple-bids", "bidding"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 320, helpful: 260, notHelpful: 14 },
    seo: {
      slug: "bid-on-multiple-auctions",
      metaTitle: "Can I Bid on Multiple Auctions at Once? | LetItRip FAQ",
      metaDescription:
        "You can place active bids on multiple LetItRip auctions simultaneously. Winning all bids requires payment for each.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Will I be notified if I'm outbid?",
    answer:
      "<p>Yes. You'll receive an <strong>email and in-app notification</strong> when another buyer outbids you. You can then return to the listing and place a higher bid before the auction ends. Enable browser notifications for real-time alerts.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 12,
    priority: 6,
    tags: ["outbid", "notification", "auction", "bid"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 430, helpful: 370, notHelpful: 16 },
    seo: {
      slug: "outbid-notification",
      metaTitle: "Will I Be Notified If Outbid? | LetItRip Auction Alerts",
      metaDescription:
        "LetItRip sends email and in-app alerts when you're outbid in an auction so you can place a higher bid.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ============================================
  // SHIPPING & DELIVERY — 10 FAQs
  // ============================================
  {
    question: "Who handles shipping on LetItRip?",
    answer:
      "<p>Each seller manages their own shipping. LetItRip is a <strong>marketplace platform</strong> — we don't warehouse or ship products ourselves. Sellers partner with couriers such as Delhivery, BlueDart, India Post, or others of their choice. Shipping timelines, rates, and courier options vary by store.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: true,
    isPinned: true,
    order: 1,
    priority: 10,
    tags: ["shipping", "seller", "courier", "marketplace", "delhivery"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 890, helpful: 740, notHelpful: 35 },
    seo: {
      slug: "who-handles-shipping",
      metaTitle: "Who Handles Shipping on LetItRip? | Seller Shipping Policy",
      metaDescription:
        "Shipping on LetItRip is managed by each individual seller. Rates and couriers vary by store.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Is free shipping available?",
    answer:
      "<p>Free shipping is <strong>not guaranteed platform-wide</strong>. It is entirely at the discretion of individual sellers. Some sellers offer free shipping on specific products, on orders above a minimum value, or during promotional events. Always check the product listing and the seller's store page for their current shipping offer.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: true,
    isPinned: true,
    order: 2,
    priority: 10,
    tags: ["free-shipping", "shipping-cost", "seller-policy"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 1100, helpful: 900, notHelpful: 50 },
    seo: {
      slug: "is-free-shipping-available",
      metaTitle: "Is Free Shipping Available on LetItRip? | Shipping FAQ",
      metaDescription:
        "Free shipping on LetItRip depends on the individual seller. Check each product listing for the seller's shipping offer.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How long does delivery take?",
    answer:
      "<p>Delivery timelines depend on the seller's location, your location, and the courier used. Typical estimates:</p><ul><li><strong>Metro cities:</strong> 2–4 business days</li><li><strong>Tier 2/3 cities:</strong> 4–7 business days</li><li><strong>Remote areas:</strong> 7–14 business days</li></ul><p>Check the product listing or the seller's store page for their estimated dispatch time.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 8,
    tags: ["delivery-time", "shipping-time", "days", "metro", "courier"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 940, helpful: 800, notHelpful: 42 },
    seo: {
      slug: "how-long-does-delivery-take",
      metaTitle: "How Long Does Delivery Take? | LetItRip Shipping Times",
      metaDescription:
        "LetItRip delivery takes 2–4 days in metros and 4–14 days elsewhere, depending on the seller and courier.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Will I get a tracking number after my order ships?",
    answer:
      "<p>Yes. Once the seller marks your order as shipped, you will receive an <strong>email notification with the tracking number and courier name</strong>. You can also view tracking details on your order page under <strong>My Orders</strong>.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 8,
    tags: ["tracking", "tracking-number", "shipped", "courier"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 720, helpful: 610, notHelpful: 28 },
    seo: {
      slug: "will-i-get-tracking-number",
      metaTitle: "Will I Get a Tracking Number? | LetItRip Shipment Tracking",
      metaDescription:
        "Receive a tracking number by email once your seller ships your LetItRip order. Track via My Orders too.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How are graded cards (PSA/BGS slabs) packaged for shipping?",
    answer:
      "<p>Sellers who specialise in graded cards typically use <strong>bubble wrap, foam inserts, and rigid cardboard boxes</strong> to protect slabs during transit. Some use double-boxing for extra safety. We strongly recommend purchasing only from sellers who describe their graded card packaging — check their store reviews for buyer feedback on packaging quality.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 7,
    tags: ["graded", "psa", "bgs", "slab", "packaging", "shipping"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 580, helpful: 500, notHelpful: 18 },
    seo: {
      slug: "graded-card-packaging-shipping",
      metaTitle: "How Are Graded PSA/BGS Slabs Shipped? | LetItRip FAQ",
      metaDescription:
        "Graded cards on LetItRip are packaged by sellers using bubble wrap and rigid boxes. Check store reviews for packaging quality.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Do sellers ship internationally?",
    answer:
      "<p>Most LetItRip sellers currently ship within India only. International shipping, if offered, is clearly stated in the seller's store page and product listing. Check the listing for delivery country eligibility before ordering.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 6,
    tags: ["international", "worldwide", "shipping", "india-only"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 410, helpful: 330, notHelpful: 30 },
    seo: {
      slug: "do-sellers-ship-internationally",
      metaTitle: "Do LetItRip Sellers Ship Internationally? | FAQ",
      metaDescription:
        "Most LetItRip sellers ship within India. Check each product listing for international shipping availability.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I change my delivery address after placing an order?",
    answer:
      "<p>Address changes after order placement depend on whether the seller has already dispatched the item. Contact the seller immediately through your order page. If the item hasn't shipped yet, sellers can usually update the address. Once shipped, address changes are not possible.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 6,
    tags: ["address-change", "delivery-address", "order"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 380, helpful: 300, notHelpful: 22 },
    seo: {
      slug: "change-delivery-address-after-order",
      metaTitle: "Can I Change My Delivery Address After Ordering? | LetItRip",
      metaDescription:
        "Contact the seller immediately to change your delivery address. Changes are only possible before the item is shipped.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What happens if my package is lost in transit?",
    answer:
      "<p>If your package is lost:</p><ol><li>First check the tracking status for the latest courier update</li><li>Contact the seller via your order page — they are responsible for filing a claim with the courier</li><li>If the seller is unresponsive within 48 hours, contact LetItRip support at <strong>{{supportEmail}}</strong></li></ol><p>Sellers are encouraged to use insured shipping for high-value cards.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 8,
    tags: ["lost", "lost-package", "courier", "claim", "transit"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 620, helpful: 530, notHelpful: 28 },
    seo: {
      slug: "package-lost-in-transit",
      metaTitle: "What If My Package Is Lost in Transit? | LetItRip FAQ",
      metaDescription:
        "Contact your seller first if your package is lost. LetItRip support can assist if the seller is unresponsive.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What if my order arrives damaged?",
    answer:
      "<p>If your order arrives damaged:</p><ol><li><strong>Photograph the damage immediately</strong> — including the outer packaging and the item</li><li>Contact the seller via the order page within <strong>48 hours of delivery</strong></li><li>Share the photos — most sellers will arrange a replacement or refund per their return policy</li><li>If unresolved, contact LetItRip support with your order ID and photos</li></ol>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 9,
    priority: 9,
    tags: ["damaged", "broken", "delivery", "return", "refund"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 730, helpful: 640, notHelpful: 30 },
    seo: {
      slug: "order-arrived-damaged",
      metaTitle: "What to Do If My Order Arrives Damaged? | LetItRip FAQ",
      metaDescription:
        "Photograph damage immediately and contact the seller within 48 hours. LetItRip support can escalate if needed.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Does the seller ship to all pincodes?",
    answer:
      "<p>Not necessarily. Each seller's courier partners may have limited pincode coverage, especially for remote areas. You can check delivery eligibility by entering your pincode on the product listing page before adding to cart.</p>",
    category: "shipping_delivery",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 10,
    priority: 5,
    tags: ["pincode", "delivery", "coverage", "remote"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 350, helpful: 280, notHelpful: 20 },
    seo: {
      slug: "seller-pincode-coverage",
      metaTitle: "Does the Seller Ship to My Pincode? | LetItRip FAQ",
      metaDescription:
        "Check your pincode on the product page for delivery eligibility. Coverage varies by seller and courier.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ============================================
  // RETURNS & REFUNDS — 10 FAQs
  // ============================================
  {
    question: "What is LetItRip's return policy?",
    answer:
      "<p>LetItRip does not have a single platform-wide return policy. <strong>Return and refund terms are set by each individual seller</strong>. Before purchasing, always review the seller's return policy listed on their store page or product description. Common seller policies range from no returns to 7-day returns for items not as described.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: true,
    isPinned: true,
    order: 1,
    priority: 10,
    tags: ["return-policy", "refund", "seller-policy", "returns"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 1320, helpful: 1100, notHelpful: 58 },
    seo: {
      slug: "return-policy",
      metaTitle: "What Is the Return Policy on LetItRip? | Refunds FAQ",
      metaDescription:
        "Return policies on LetItRip are set by individual sellers, not the platform. Check each seller's store page for their policy.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I initiate a return?",
    answer:
      "<p>To initiate a return:</p><ol><li>Go to <strong>My Orders</strong> and open the relevant order</li><li>Click <strong>Request Return</strong> and describe the reason</li><li>The seller will review your request and respond within their stated timeline</li><li>If approved, you'll receive return shipping instructions from the seller</li></ol><p>Return eligibility, deadlines, and shipping costs are governed by the seller's policy.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 2,
    priority: 8,
    tags: ["return", "refund", "how-to", "my-orders"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 820, helpful: 700, notHelpful: 38 },
    seo: {
      slug: "how-to-initiate-return",
      metaTitle: "How to Initiate a Return on LetItRip | Step-by-Step Guide",
      metaDescription:
        "Initiate a return from My Orders. The seller reviews your request and provides return instructions.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Is return shipping free?",
    answer:
      "<p><strong>Return shipping costs depend on the seller's policy.</strong> Some sellers cover return shipping for items that are damaged or not as described; others require the buyer to bear return shipping costs. Check the seller's return policy on their store page before purchasing. LetItRip does not reimburse return shipping costs independently of the seller's decision.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: true,
    isPinned: false,
    order: 3,
    priority: 9,
    tags: ["return-shipping", "free-returns", "seller-policy", "shipping-cost"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 980, helpful: 820, notHelpful: 50 },
    seo: {
      slug: "is-return-shipping-free",
      metaTitle: "Is Return Shipping Free on LetItRip? | Returns FAQ",
      metaDescription:
        "Return shipping costs are set by each seller. Check the seller's policy before purchasing.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What if I receive the wrong item?",
    answer:
      "<p>If you receive an item different from what you ordered:</p><ol><li>Photograph the received item next to its packaging</li><li>Contact the seller immediately via your order page with photos</li><li>The seller is responsible for sending the correct item or issuing a full refund, including any return shipping costs</li><li>If the seller doesn't resolve it within <strong>72 hours</strong>, escalate to LetItRip support</li></ol>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 9,
    tags: ["wrong-item", "incorrect", "return", "refund"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 690, helpful: 600, notHelpful: 28 },
    seo: {
      slug: "received-wrong-item",
      metaTitle: "What If I Received the Wrong Item? | LetItRip FAQ",
      metaDescription:
        "Contact the seller with photos if you receive the wrong Pokemon card. Escalate to LetItRip support if unresolved.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How long does a refund take?",
    answer:
      "<p>Once the seller approves your refund, processing times are:</p><ul><li><strong>UPI / Wallets:</strong> 1–3 business days</li><li><strong>Debit/Credit Cards:</strong> 5–7 business days</li><li><strong>Net Banking:</strong> 3–5 business days</li></ul><p>The refund timeline starts after the seller confirms the return, not from the date you raise the request.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 8,
    tags: ["refund", "refund-time", "processing", "upi", "bank"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 870, helpful: 750, notHelpful: 32 },
    seo: {
      slug: "how-long-does-refund-take",
      metaTitle: "How Long Does a Refund Take? | LetItRip Refund Timeline",
      metaDescription:
        "Refunds on LetItRip take 1–7 business days depending on payment method, starting after seller approval.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I return a graded (PSA/BGS) card?",
    answer:
      "<p>Returns for graded cards are subject to each seller's policy. Most sellers of graded cards accept returns only if the card is <strong>not as described</strong> (e.g., wrong grade, wrong card, damaged slab). Returns for change-of-mind on graded cards are typically not accepted. Always confirm with the seller before purchasing high-value slabs.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 8,
    tags: ["graded", "psa", "bgs", "slab", "return", "refund"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 560, helpful: 490, notHelpful: 28 },
    seo: {
      slug: "return-graded-psa-bgs-card",
      metaTitle: "Can I Return a PSA or BGS Graded Card? | LetItRip FAQ",
      metaDescription:
        "Returns for graded cards depend on each seller's policy. Most accept returns only for items not as described.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I return a sealed booster pack or box?",
    answer:
      "<p>Sealed products are generally non-returnable once the seal has been broken. If the product was damaged in transit or received in an unsealed condition, contact the seller with photographic evidence immediately. The seller's policy governs whether a return or replacement is offered.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 7,
    tags: ["sealed", "booster-pack", "booster-box", "return"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 490, helpful: 420, notHelpful: 22 },
    seo: {
      slug: "return-sealed-booster-pack",
      metaTitle: "Can I Return a Sealed Booster Pack or Box? | LetItRip FAQ",
      metaDescription:
        "Sealed products are non-returnable once opened. Damaged or unsealed deliveries follow the seller's return policy.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I get a refund on an auction purchase?",
    answer:
      "<p>Auction purchases are generally <strong>final and non-refundable</strong> unless the item received is significantly not as described (wrong card, wrong grade, damaged in transit). Buyers are encouraged to ask the seller all questions before bidding. Refunds for auction wins are handled case-by-case by the seller, and LetItRip support can mediate if needed.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 8,
    tags: ["auction", "refund", "return", "non-refundable"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 540, helpful: 460, notHelpful: 35 },
    seo: {
      slug: "refund-auction-purchase",
      metaTitle: "Can I Get a Refund on an Auction Purchase? | LetItRip FAQ",
      metaDescription:
        "Auction purchases are final unless the item is significantly not as described. Contact the seller or LetItRip support.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What if the seller refuses my return request?",
    answer:
      "<p>If a seller refuses a return request you believe is valid (e.g., item not as described, damaged in transit):</p><ol><li>Document everything — photos, order details, and your communication with the seller</li><li>Contact LetItRip support at <strong>{{supportEmail}}</strong> with your order ID</li><li>Our team will mediate and can take action against sellers who violate platform policies</li></ol>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 9,
    priority: 9,
    tags: ["return-refused", "dispute", "seller", "mediation", "support"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 620, helpful: 560, notHelpful: 28 },
    seo: {
      slug: "seller-refused-return-request",
      metaTitle: "What If the Seller Refuses My Return? | LetItRip Dispute",
      metaDescription:
        "If a seller refuses a valid return, contact LetItRip support. We mediate and enforce platform policies.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I report a counterfeit or fake card?",
    answer:
      "<p>If you receive a card you believe to be counterfeit:</p><ol><li>Do <strong>not</strong> return it yet — preserve it as evidence</li><li>Take clear photos (front, back, side profile) under good lighting</li><li>Contact LetItRip support at <strong>{{supportEmail}}</strong> with your order ID and photos</li></ol><p>Selling counterfeit cards is a serious violation and results in immediate seller suspension and legal referral where applicable.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 10,
    priority: 10,
    tags: ["fake", "counterfeit", "proxy", "fraud", "authenticity"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 740, helpful: 680, notHelpful: 22 },
    seo: {
      slug: "report-counterfeit-fake-card",
      metaTitle: "How to Report a Counterfeit Pokemon Card | LetItRip",
      metaDescription:
        "Received a fake Pokemon card? Contact LetItRip support with photos. Sellers of counterfeits are immediately suspended.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ============================================
  // PRODUCT INFORMATION — 10 FAQs
  // ============================================
  {
    question: "Are all Pokemon cards on LetItRip authentic?",
    answer:
      "<p>Authenticity is our top priority. All sellers are vetted before listing, and listings are subject to ongoing review. However, as a marketplace, LetItRip relies on sellers to accurately represent their products. We <strong>strongly recommend</strong> purchasing graded cards from sellers with verified badges and reviewing store ratings before buying raw cards. Report any suspected fakes immediately.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: true,
    order: 1,
    priority: 10,
    tags: ["authentic", "genuine", "fake", "counterfeit", "pokemon", "tcg"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 1050, helpful: 920, notHelpful: 38 },
    seo: {
      slug: "are-cards-authentic",
      metaTitle: "Are Pokemon Cards on LetItRip Authentic? | FAQ",
      metaDescription:
        "LetItRip vets all sellers for authenticity. Buy graded cards from verified sellers for maximum confidence.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What does '1st Edition' mean for Pokemon cards?",
    answer:
      "<p>First Edition cards were printed in the very first production run of a Pokemon TCG set. They are identified by a <strong>small '1st Edition' stamp</strong> on the left side of the card art. First Edition Base Set cards (1999) are among the most valuable in the hobby. Non-1st Edition prints from the same set are called <strong>Unlimited</strong> and are more common.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 2,
    priority: 8,
    tags: ["1st-edition", "first-edition", "base-set", "stamp", "value"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 870, helpful: 750, notHelpful: 22 },
    seo: {
      slug: "what-is-1st-edition-pokemon-card",
      metaTitle: "What Does '1st Edition' Mean for Pokemon Cards? | LetItRip",
      metaDescription:
        "1st Edition Pokemon cards were printed in the first production run of a set and carry a special stamp on the card art.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is PSA / BGS / CGC grading?",
    answer:
      "<p>Professional grading companies evaluate the condition of a card and assign a numeric grade (1–10), then seal it in a tamper-evident protective case called a <strong>slab</strong>:</p><ul><li><strong>PSA</strong> (Professional Sports Authenticator) — industry standard; PSA 10 is near-perfect</li><li><strong>BGS</strong> (Beckett Grading Services) — uses subgrades for centering, corners, edges, surface; BGS 10 is called Pristine</li><li><strong>CGC</strong> — newer, growing in popularity</li></ul><p>Graded cards command premiums over raw cards because of guaranteed authenticity and condition.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 9,
    tags: ["psa", "bgs", "cgc", "grading", "slab", "grade"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 1100, helpful: 980, notHelpful: 30 },
    seo: {
      slug: "what-is-psa-bgs-cgc-grading",
      metaTitle: "What Is PSA, BGS, CGC Grading? | Pokemon Card Grades Explained",
      metaDescription:
        "PSA, BGS, and CGC are professional grading companies that authenticate Pokemon cards and assign condition grades 1–10.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What card conditions are used on LetItRip?",
    answer:
      "<p>Sellers on LetItRip use standard Pokemon TCG card condition grades:</p><ul><li><strong>Mint (M)</strong> — Near perfect, virtually unplayed</li><li><strong>Near Mint (NM)</strong> — Minimal wear, sharp corners</li><li><strong>Lightly Played (LP)</strong> — Minor edge wear or scratches</li><li><strong>Moderately Played (MP)</strong> — Visible wear on corners, edges, or face</li><li><strong>Heavily Played (HP)</strong> — Significant wear, still identifiable</li><li><strong>Damaged (D)</strong> — Major physical damage</li></ul><p>Always check the seller's photos and description. For high-value purchases, ask for additional photos.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 9,
    tags: ["condition", "mint", "near-mint", "played", "grading", "wear"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 780, helpful: 680, notHelpful: 28 },
    seo: {
      slug: "pokemon-card-conditions",
      metaTitle: "Pokemon Card Conditions Explained | LetItRip FAQ",
      metaDescription:
        "Understand Mint, Near Mint, Lightly Played, Moderately Played, Heavily Played card conditions used on LetItRip.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is a 'holo rare' card?",
    answer:
      "<p>A <strong>holo rare</strong> is a card with a holographic foil pattern on the card illustration (the picture area). Holo rares are denoted by a star symbol (★) in their rarity. In the Base Set, cards like Charizard, Blastoise, and Mewtwo are holo rares. They are generally more valuable than common or uncommon cards from the same set.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 7,
    tags: ["holo", "holo-rare", "foil", "rarity", "charizard", "base-set"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 680, helpful: 590, notHelpful: 20 },
    seo: {
      slug: "what-is-holo-rare-card",
      metaTitle: "What Is a Holo Rare Pokemon Card? | LetItRip FAQ",
      metaDescription:
        "Holo rare Pokemon cards have a holographic foil on the illustration. They are rarer and more valuable than common cards.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What does 'raw' card mean?",
    answer:
      "<p>A <strong>raw card</strong> is an ungraded card — one that hasn't been submitted to a professional grading company (PSA, BGS, CGC). Raw cards are not in a protective slab and their condition is assessed visually. Raw cards in high grades (NM or better) are often submitted for grading by buyers.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 6,
    tags: ["raw", "ungraded", "condition", "grading"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 550, helpful: 480, notHelpful: 18 },
    seo: {
      slug: "what-does-raw-card-mean",
      metaTitle: "What Does 'Raw Card' Mean in Pokemon TCG? | LetItRip FAQ",
      metaDescription:
        "A 'raw' Pokemon card is ungraded and not in a protective slab. Condition is assessed visually by the seller.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I ask a seller questions before buying?",
    answer:
      "<p>Yes! On any product listing, you can message the seller directly using the <strong>Ask Seller</strong> button. You can request additional photos, clarify the card's condition, or ask about packaging. We recommend doing this for any card valued above ₹1,000.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 7,
    tags: ["ask-seller", "question", "contact", "listing"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 460, helpful: 400, notHelpful: 18 },
    seo: {
      slug: "ask-seller-questions",
      metaTitle: "Can I Ask a Seller Questions Before Buying? | LetItRip FAQ",
      metaDescription:
        "Use the Ask Seller button on any product page to get clarifications, photos, or condition details before purchasing.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I know if the price is fair for a Pokemon card?",
    answer:
      "<p>A few ways to gauge fair pricing:</p><ul><li>Compare with other listings of the same card on LetItRip</li><li>Check recent sold prices on international platforms like TCGPlayer or eBay for reference (converted to INR)</li><li>For graded cards, PSA Population Reports show how many of a grade exist — rarer grades command higher prices</li><li>Condition matters a lot — an NM Charizard is worth significantly more than an LP one</li></ul>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 6,
    tags: ["price", "fair-value", "tcgplayer", "ebay", "market-value"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 640, helpful: 560, notHelpful: 28 },
    seo: {
      slug: "how-to-know-fair-price",
      metaTitle: "How to Know If a Pokemon Card Price Is Fair | LetItRip FAQ",
      metaDescription:
        "Compare listings on LetItRip, check international sold prices on TCGPlayer/eBay, and consider card condition and grade rarity.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Are product photos on listings accurate?",
    answer:
      "<p>Sellers are required to upload <strong>actual photos of the specific card being sold</strong> (not stock images) for all singles and graded cards. If you're buying a specific item, look for listings with multiple angles showing corners, edges, and surface. If a listing uses a stock image, contact the seller for actual photos before purchasing.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 9,
    priority: 7,
    tags: ["photos", "listing-photos", "stock-image", "condition"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 420, helpful: 360, notHelpful: 22 },
    seo: {
      slug: "are-listing-photos-accurate",
      metaTitle: "Are Product Photos on LetItRip Accurate? | FAQ",
      metaDescription:
        "Sellers must upload actual photos of the card being sold. Ask the seller for more photos if stock images are used.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is an Elite Trainer Box (ETB)?",
    answer:
      "<p>An <strong>Elite Trainer Box (ETB)</strong> is an official Pokemon TCG product that includes booster packs, energy cards, card sleeves, dice, and a collector's box. ETBs are sealed products from The Pokemon Company and are popular with collectors and players. Prices vary by set — older or discontinued ETBs can command high premiums.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 10,
    priority: 5,
    tags: ["etb", "elite-trainer-box", "sealed", "booster", "pokemon"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 490, helpful: 430, notHelpful: 16 },
    seo: {
      slug: "what-is-elite-trainer-box-etb",
      metaTitle: "What Is an Elite Trainer Box (ETB)? | LetItRip FAQ",
      metaDescription:
        "An ETB is an official sealed Pokemon TCG product with booster packs, sleeves, and accessories. Popular with collectors.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ============================================
  // ACCOUNT & SECURITY — 8 FAQs
  // ============================================
  {
    question: "How do I create a LetItRip account?",
    answer:
      "<p>Click <strong>Sign Up</strong> at the top right of any page. Enter your email address and create a password, or sign up with Google. Verify your email to activate your account. You can start browsing and purchasing immediately after verification.</p>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 1,
    priority: 8,
    tags: ["sign-up", "register", "account", "email", "google"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 620, helpful: 530, notHelpful: 22 },
    seo: {
      slug: "how-to-create-account",
      metaTitle: "How to Create a LetItRip Account | Sign Up Guide",
      metaDescription:
        "Create your LetItRip account with email or Google. Verify your email to start buying Pokemon TCG cards.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I reset my password?",
    answer:
      "<p>On the login page, click <strong>Forgot Password</strong> and enter your registered email. You'll receive a password reset link within a few minutes. Check your spam folder if you don't see it. The reset link expires in <strong>30 minutes</strong>.</p>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 2,
    priority: 7,
    tags: ["password", "reset", "forgot-password", "login"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 530, helpful: 460, notHelpful: 20 },
    seo: {
      slug: "how-to-reset-password",
      metaTitle: "How to Reset My Password | LetItRip Account Help",
      metaDescription:
        "Use the Forgot Password link on the login page. A reset link will be emailed to you and expires in 30 minutes.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I save items to my wishlist?",
    answer:
      "<p>On any product listing, click the <strong>heart icon</strong> to add it to your wishlist. You need to be signed in to use this feature. View and manage your saved items from <strong>My Account → Wishlist</strong>.</p>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 6,
    tags: ["wishlist", "save", "heart", "favourite"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 390, helpful: 340, notHelpful: 14 },
    seo: {
      slug: "how-to-save-to-wishlist",
      metaTitle: "How to Save Items to My Wishlist | LetItRip FAQ",
      metaDescription:
        "Click the heart icon on any product listing to save it to your wishlist. Manage it from My Account.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I update my delivery address?",
    answer:
      "<p>Go to <strong>My Account → Addresses</strong> to add, edit, or delete delivery addresses. You can save multiple addresses and mark one as default. You can also add a new address at checkout without saving it to your account.</p>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 6,
    tags: ["address", "delivery-address", "update", "account"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 420, helpful: 370, notHelpful: 16 },
    seo: {
      slug: "update-delivery-address",
      metaTitle: "How to Update My Delivery Address | LetItRip Account",
      metaDescription:
        "Add, edit, or delete delivery addresses from My Account → Addresses. Set a default address for faster checkout.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Is my personal information secure?",
    answer:
      "<p>Yes. LetItRip follows industry best practices for data security:</p><ul><li>Passwords are hashed and never stored in plain text</li><li>Personal data is encrypted at rest and in transit (TLS 1.3)</li><li>We do not sell or share your personal data with third parties for marketing</li><li>Payment details are handled exclusively by Razorpay — we never see your card number</li></ul>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 9,
    tags: ["security", "privacy", "data", "encrypted", "password"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 580, helpful: 510, notHelpful: 18 },
    seo: {
      slug: "is-personal-information-secure",
      metaTitle: "Is My Personal Information Secure on LetItRip? | FAQ",
      metaDescription:
        "LetItRip encrypts your data at rest and in transit. Payments are handled by Razorpay — we never store card details.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What should I do if my account is compromised?",
    answer:
      "<p>If you suspect your account has been accessed without your permission:</p><ol><li><strong>Change your password immediately</strong> from Account → Security</li><li>Check your order history for any unauthorised purchases</li><li>Contact LetItRip support at <strong>{{supportEmail}}</strong> with the subject line 'Account Compromised'</li><li>We'll temporarily lock the account and investigate</li></ol>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 10,
    tags: ["hacked", "compromised", "security", "password", "account"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 340, helpful: 310, notHelpful: 12 },
    seo: {
      slug: "account-compromised-what-to-do",
      metaTitle: "What to Do If My Account Is Compromised | LetItRip Security",
      metaDescription:
        "Change your password immediately and contact LetItRip support if you suspect unauthorised access to your account.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I have multiple accounts?",
    answer:
      "<p>No. Each person is permitted <strong>one buyer account</strong> on LetItRip. Creating multiple accounts to exploit promotions, coupons, or giveaways is a violation of our Terms of Service and may result in all associated accounts being suspended.</p>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 7,
    tags: ["multiple-accounts", "duplicate", "terms", "suspension"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 280, helpful: 240, notHelpful: 18 },
    seo: {
      slug: "can-i-have-multiple-accounts",
      metaTitle: "Can I Have Multiple Accounts on LetItRip? | FAQ",
      metaDescription:
        "One account per person is allowed on LetItRip. Multiple accounts violate our Terms of Service.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I close my account?",
    answer:
      "<p>To close your account, email us at <strong>{{supportEmail}}</strong> with the subject 'Account Deletion Request'. We'll process it within 7 business days. Note that any pending orders must be resolved before deletion. Closed accounts cannot be restored.</p>",
    category: "account_security",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 5,
    tags: ["close-account", "delete-account", "gdpr", "data"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 220, helpful: 190, notHelpful: 12 },
    seo: {
      slug: "how-to-close-account",
      metaTitle: "How to Close My LetItRip Account | Account Deletion",
      metaDescription:
        "Email support to request account deletion. Processed within 7 business days. Pending orders must be resolved first.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ============================================
  // TECHNICAL SUPPORT — 5 FAQs
  // ============================================
  {
    question: "The website is slow or not loading — what should I do?",
    answer:
      "<p>Try these steps:</p><ol><li>Refresh the page (Ctrl+R / Cmd+R)</li><li>Clear your browser cache and cookies</li><li>Try a different browser (Chrome, Firefox, or Edge are recommended)</li><li>Check your internet connection</li><li>If the issue persists across browsers, there may be a temporary outage — check our social media pages for updates</li></ol>",
    category: "technical_support",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 1,
    priority: 7,
    tags: ["slow", "loading", "browser", "cache", "outage"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 380, helpful: 310, notHelpful: 28 },
    seo: {
      slug: "website-slow-not-loading",
      metaTitle: "Website Slow or Not Loading? | LetItRip Technical Help",
      metaDescription:
        "Fix a slow or unresponsive LetItRip website by clearing cache, trying a different browser, or checking your connection.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "I can't complete my checkout — what's wrong?",
    answer:
      "<p>Common checkout issues and fixes:</p><ul><li><strong>Payment not going through:</strong> Try a different payment method or browser</li><li><strong>Address validation error:</strong> Ensure your pincode matches your city and state</li><li><strong>Coupon not applying:</strong> Check the code's expiry and minimum order value</li><li><strong>Cart is empty:</strong> The item may have gone out of stock — refresh and re-add</li></ul><p>If the problem continues, email <strong>{{supportEmail}}</strong> with a screenshot.</p>",
    category: "technical_support",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 2,
    priority: 8,
    tags: ["checkout", "payment-error", "cart", "pincode", "coupon"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 490, helpful: 420, notHelpful: 35 },
    seo: {
      slug: "cant-complete-checkout",
      metaTitle: "I Can't Complete My Checkout | LetItRip Technical FAQ",
      metaDescription:
        "Resolve checkout issues on LetItRip: payment errors, address problems, coupon issues, and empty cart errors.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "My auction bid isn't registering — what do I do?",
    answer:
      "<p>If your bid doesn't appear after clicking Place Bid:</p><ol><li>Refresh the page to check if the bid was actually recorded</li><li>Ensure you're signed in — bids require an active session</li><li>Check that your bid amount is higher than the current highest bid (plus any minimum increment)</li><li>If the problem persists, contact support with the auction listing URL and your bid amount</li></ol>",
    category: "technical_support",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 7,
    tags: ["auction", "bid", "not-registering", "error"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 310, helpful: 270, notHelpful: 22 },
    seo: {
      slug: "auction-bid-not-registering",
      metaTitle: "My Auction Bid Isn't Registering | LetItRip Technical FAQ",
      metaDescription:
        "If your bid doesn't register, refresh the page, check you're signed in, and ensure your bid exceeds the current highest bid.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "I'm not receiving email notifications — how do I fix this?",
    answer:
      "<p>If you're not getting emails from LetItRip:</p><ol><li>Check your spam or promotions folder</li><li>Add <strong>noreply@letitrip.in</strong> to your email contacts/safe-senders list</li><li>Verify your email address in Account → Profile</li><li>Check your notification preferences in Account → Notifications</li></ol>",
    category: "technical_support",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 6,
    tags: ["email", "notifications", "spam", "alerts"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 290, helpful: 250, notHelpful: 18 },
    seo: {
      slug: "not-receiving-email-notifications",
      metaTitle: "Not Receiving Email Notifications | LetItRip Technical Help",
      metaDescription:
        "Fix missing LetItRip emails by checking spam, whitelisting noreply@letitrip.in, and reviewing notification settings.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I report a bug or technical issue?",
    answer:
      "<p>Found a bug? We appreciate your help! Email <strong>{{supportEmail}}</strong> with:</p><ul><li>A description of the issue</li><li>The URL where it occurred</li><li>Your browser and device (e.g., Chrome 124 on Android)</li><li>A screenshot if possible</li></ul><p>Our engineering team reviews all bug reports and will acknowledge your report within 2 business days.</p>",
    category: "technical_support",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 5,
    tags: ["bug", "report", "technical", "issue", "feedback"],
    relatedFAQs: [],
    useSiteSettings: true,
    stats: { views: 240, helpful: 210, notHelpful: 10 },
    seo: {
      slug: "report-bug-technical-issue",
      metaTitle: "How to Report a Bug on LetItRip | Technical Support",
      metaDescription:
        "Report bugs to LetItRip support with a URL, browser details, and screenshot. Acknowledged within 2 business days.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HOT WHEELS — 10 FAQs
  // ══════════════════════════════════════════════════════════════════════════
  {
    question: "What is a Hot Wheels Treasure Hunt (TH) car?",
    answer:
      "<p>Treasure Hunts are special variant cars hidden within Hot Wheels mainline assortments. They feature a flame logo on the card, a real rider rubber tire variant (on Super Treasure Hunts), and a subtle 'TH' marking on the car. <strong>Super Treasure Hunts</strong> have a spectraflame metallic paint finish and real rider tires — they are rarer and more valuable. Both types are randomly packed: approximately 1 TH per case and 1 STH per several cases.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 1,
    priority: 8,
    tags: ["hot-wheels", "treasure-hunt", "super-treasure-hunt", "th", "sth"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 620, helpful: 540, notHelpful: 22 },
    seo: {
      slug: "hot-wheels-treasure-hunt-guide",
      metaTitle: "What is a Hot Wheels Treasure Hunt? | LetItRip Guide",
      metaDescription:
        "Treasure Hunts and Super Treasure Hunts explained — rarity, markings, and what makes them collectible.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is Hot Wheels Car Culture and how is it different from mainline?",
    answer:
      "<p><strong>Hot Wheels Car Culture</strong> is a premium line of cars sold in 5-car packs, featuring realistic licensed vehicles, detailed casting, premium rubber tires, and high-quality paint. Unlike the basic 97p mainline cars, Car Culture series focus on specific themes (e.g., Japan Historics, Germany or Bust, Car Culture Mix) and are sold primarily at specialty retailers. They are not mixed into standard pegs.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 2,
    priority: 7,
    tags: ["hot-wheels", "car-culture", "premium", "mainline", "difference"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 480, helpful: 410, notHelpful: 18 },
    seo: {
      slug: "hot-wheels-car-culture-vs-mainline",
      metaTitle: "Hot Wheels Car Culture vs Mainline | LetItRip FAQ",
      metaDescription:
        "Understand the difference between Hot Wheels mainline and premium Car Culture series.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Are Hot Wheels cars on LetItRip authentic and not counterfeit?",
    answer:
      "<p>Yes. All Hot Wheels listings on LetItRip go through seller verification. Sellers must provide proof of purchase (retailer invoice or distributor import bill) to list. We strongly encourage buyers to check the card back for the authentic Hot Wheels logo and copyright markings. If you receive a counterfeit, report it immediately and we will take action under our Buyer Protection policy.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 8,
    tags: ["hot-wheels", "authentic", "counterfeit", "verification"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 390, helpful: 340, notHelpful: 14 },
    seo: {
      slug: "hot-wheels-authenticity-check",
      metaTitle: "Are Hot Wheels on LetItRip Authentic? | Verification",
      metaDescription:
        "How LetItRip ensures Hot Wheels authenticity and what to do if you receive a fake.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How should I store Hot Wheels cars to preserve their value?",
    answer:
      "<p>For investment-grade storage: <ul><li>Keep cars <strong>on card</strong> — removing from packaging destroys most value</li><li>Store vertically in acrylic display cases to avoid card creasing</li><li>Avoid direct sunlight — UV fades card art and paint</li><li>Control humidity (40–55% RH) to prevent card warping</li><li>Super Treasure Hunts and Car Culture premium cars benefit from individual acrylic protectors</li></ul> For loose cars, separate by casting to prevent paint transfer.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 6,
    tags: ["hot-wheels", "storage", "preservation", "collecting", "value"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 310, helpful: 270, notHelpful: 12 },
    seo: {
      slug: "hot-wheels-storage-tips",
      metaTitle: "How to Store Hot Wheels to Preserve Value | LetItRip",
      metaDescription: "Tips for keeping Hot Wheels on card in mint condition to preserve collectible value.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I request specific Hot Wheels colour variants or casting variants?",
    answer:
      "<p>Sellers list specific variants they have in stock — you cannot request custom variants. However, you can <strong>filter by category</strong> or use the search bar to find a specific casting name. If a variant you want isn't listed, you can message a seller directly or check back as inventory updates frequently. You can also use the wishlist feature to be notified when a matching product is listed.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 5,
    tags: ["hot-wheels", "variant", "casting", "request"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 260, helpful: 210, notHelpful: 18 },
    seo: {
      slug: "hot-wheels-variant-request",
      metaTitle: "Can I Request Hot Wheels Variants? | LetItRip FAQ",
      metaDescription: "How to find specific Hot Wheels variants and colour editions on LetItRip.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is the difference between Hot Wheels basic, premium, and Car Culture?",
    answer:
      "<p><strong>Basic mainline</strong> cars are the standard single-blister-card cars sold at retail (≈₹200–₹250 MRP). They use die-cast metal bodies with plastic bases and painted plastic wheels. <strong>Premium</strong> series (e.g., Fast & Furious, Marvel, DC) feature licensed character vehicles, detailed interiors, and often rubber tires. <strong>Car Culture</strong> is the highest tier — themed multi-packs with ultra-detailed casting, real rider tires, and premium finishes.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 6,
    tags: ["hot-wheels", "basic", "premium", "car-culture", "comparison"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 420, helpful: 370, notHelpful: 16 },
    seo: {
      slug: "hot-wheels-tiers-comparison",
      metaTitle: "Hot Wheels Basic vs Premium vs Car Culture | LetItRip FAQ",
      metaDescription: "Compare Hot Wheels product tiers to understand what you're buying.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Do Hot Wheels prices on LetItRip include GST?",
    answer:
      "<p>All prices displayed on LetItRip include GST (18% on most hobby/toy items). Individual sellers who are GST-registered will issue a tax invoice upon request. If you need a GST invoice for your business, please share your GSTIN with the seller at checkout or via message before placing the order.</p>",
    category: "orders_payment",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 13,
    priority: 5,
    tags: ["hot-wheels", "gst", "tax", "invoice", "price"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 280, helpful: 240, notHelpful: 12 },
    seo: {
      slug: "hot-wheels-gst-pricing",
      metaTitle: "Are Hot Wheels Prices GST Inclusive on LetItRip?",
      metaDescription: "LetItRip prices for Hot Wheels include GST. Request a tax invoice from the seller if needed.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is a Hot Wheels track set and which sets are compatible?",
    answer:
      "<p>Hot Wheels track sets come with flexible orange track segments that connect modularly. All standard Hot Wheels cars (1:64 scale) are compatible with all track sets. Sets range from basic starters (~₹500) to elaborate motorized multi-loop systems (~₹5,000+). When buying track, check the connector type — older sets use T-connectors while newer ones use a push-lock connector. Both are compatible with standard cars.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 5,
    tags: ["hot-wheels", "track", "set", "compatibility", "orange-track"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 350, helpful: 300, notHelpful: 15 },
    seo: {
      slug: "hot-wheels-track-sets-compatibility",
      metaTitle: "Hot Wheels Track Set Compatibility | LetItRip FAQ",
      metaDescription: "Are Hot Wheels track sets compatible? Learn about connector types and set sizes.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What year is a Hot Wheels car from — how do I identify the year?",
    answer:
      "<p>The year of a Hot Wheels car can be identified from the card back (series year is printed at the top or bottom). For loose cars, check the base of the car — the casting year and copyright year are usually stamped there, though note this reflects the casting creation year, not the specific production run year. Card back also lists the series mix letter and car number within that mix.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 4,
    tags: ["hot-wheels", "year", "identify", "casting", "card-back"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 290, helpful: 250, notHelpful: 10 },
    seo: {
      slug: "identify-hot-wheels-year",
      metaTitle: "How to Identify a Hot Wheels Car's Year | LetItRip FAQ",
      metaDescription: "How to read Hot Wheels card backs and casting bases to identify production year.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I sell Hot Wheels on LetItRip even without a business GST registration?",
    answer:
      "<p>Yes. Individual collectors who do not hold a GST registration can sell on LetItRip as long as their annual turnover from the platform remains below the GST threshold (currently ₹20 lakh for most states). You will need to provide valid government-issued ID for KYC verification. We recommend consulting a CA if your sales volume grows beyond ₹10 lakh annually.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 11,
    priority: 6,
    tags: ["hot-wheels", "sell", "gst", "registration", "collector"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 340, helpful: 290, notHelpful: 14 },
    seo: {
      slug: "sell-hot-wheels-without-gst",
      metaTitle: "Can I Sell Hot Wheels Without GST Registration? | LetItRip",
      metaDescription: "Individual collectors can sell Hot Wheels on LetItRip without GST registration up to the annual threshold.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BEYBLADE BURST — 10 FAQs
  // ══════════════════════════════════════════════════════════════════════════
  {
    question: "What are the four types of Beyblade Burst tops?",
    answer:
      "<p>Beyblade Burst tops come in four performance types: <ul><li><strong>Attack</strong> — high aggression, designed to knock opponents out of the stadium. Low stamina.</li><li><strong>Defense</strong> — designed to absorb hits and stay in the stadium. Heavy weight distribution.</li><li><strong>Stamina</strong> — designed to outlast opponents by spinning longer. Low aggression.</li><li><strong>Balance</strong> — mixed attributes covering attack, defense, and stamina. Versatile choice.</li></ul> Each top consists of three layers: Energy Layer, Forge Disc, and Performance Tip.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: true,
    order: 1,
    priority: 9,
    tags: ["beyblade", "attack", "defense", "stamina", "balance", "type"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 780, helpful: 680, notHelpful: 25 },
    seo: {
      slug: "beyblade-burst-types-explained",
      metaTitle: "Beyblade Burst Types Explained | LetItRip FAQ",
      metaDescription: "Attack, Defense, Stamina, and Balance — the four Beyblade Burst types explained.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What Beyblade Burst series are available on LetItRip?",
    answer:
      "<p>We stock tops and accessories from all major Beyblade Burst series: <ul><li>Beyblade Burst (Classic / Original)</li><li>Beyblade Burst Evolution / God Layer</li><li>Beyblade Burst Turbo / Cho-Z</li><li>Beyblade Burst GT / Rise / Gachi</li><li>Beyblade Burst Superking / Sparking</li><li>Beyblade Burst QuadDrive</li><li>Beyblade Burst DB (Dynamite Battle) / MCC</li></ul> Series are not fully compatible — check the layer size and disc compatibility before purchasing parts from different series.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 2,
    priority: 8,
    tags: ["beyblade", "series", "classic", "turbo", "gt", "superking", "quaddrive"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 530, helpful: 460, notHelpful: 18 },
    seo: {
      slug: "beyblade-burst-series-guide",
      metaTitle: "Beyblade Burst Series Guide | LetItRip FAQ",
      metaDescription: "All Beyblade Burst series from Classic to DB/MCC — what's available on LetItRip.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Are different Beyblade Burst series compatible with each other?",
    answer:
      "<p>Compatibility depends on the layer size: <ul><li><strong>SwitchStrike / Cho-Z layers</strong> fit on SwitchStrike/Cho-Z discs and performance tips</li><li><strong>GT layers</strong> require GT Chip + Ring — not compatible with earlier layers</li><li><strong>Sparking/Superking</strong> layers and bases are generally compatible with Cho-Z and earlier discs/tips</li><li><strong>QuadDrive and MCC</strong> use a new unified base system incompatible with earlier series</li></ul> Always check the layer system before purchasing individual components for custom combinations.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 7,
    tags: ["beyblade", "compatibility", "parts", "series", "custom"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 480, helpful: 400, notHelpful: 22 },
    seo: {
      slug: "beyblade-burst-parts-compatibility",
      metaTitle: "Are Beyblade Burst Parts Compatible Across Series? | FAQ",
      metaDescription: "Guide to Beyblade Burst cross-series parts compatibility by layer system.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is a Beyblade Burst Stadium and which one should I buy?",
    answer:
      "<p>A Beyblade Burst Stadium (or Battle Stadium) is the arena in which Beyblades battle. Key considerations: <ul><li><strong>Attack Stadiums</strong> — aggressive pocket design that throws tops out easily. Great for Attack-type battles.</li><li><strong>Standard Stadiums</strong> — balanced pocket depths for all type battles. Good for beginners.</li><li><strong>Hypersphere/Xtend+</strong> — wall stadiums where tops can travel vertically, unique to certain series</li></ul> For casual play, start with the standard stadium included in dual-pack or entry-level sets.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 7,
    tags: ["beyblade", "stadium", "battle-stadium", "guide", "buy"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 410, helpful: 350, notHelpful: 16 },
    seo: {
      slug: "beyblade-burst-stadium-guide",
      metaTitle: "Which Beyblade Stadium Should I Buy? | LetItRip FAQ",
      metaDescription: "Guide to Beyblade Burst stadiums — types, differences, and beginner recommendations.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Are Takara Tomy Beyblades different from Hasbro Beyblades?",
    answer:
      "<p>Yes, there are meaningful differences: <ul><li><strong>Takara Tomy (Japan/Asia)</strong> — original manufacturer. Generally higher quality plastic, more consistent performance, considered the 'authentic' competitive version.</li><li><strong>Hasbro (US/International)</strong> — licensed versions with some modified parts and packaging for Western markets. Usually lighter plastic, slight performance differences.</li></ul> Both are physically compatible in most series. Competitive players generally prefer Takara Tomy. All listings on LetItRip specify the manufacturer.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 8,
    tags: ["beyblade", "takara-tomy", "hasbro", "difference", "competitive"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 620, helpful: 540, notHelpful: 20 },
    seo: {
      slug: "takara-tomy-vs-hasbro-beyblade",
      metaTitle: "Takara Tomy vs Hasbro Beyblade — What's the Difference? | FAQ",
      metaDescription: "Compare Takara Tomy and Hasbro Beyblade Burst: quality, performance, and compatibility.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What launcher do I need for Beyblade Burst?",
    answer:
      "<p>Beyblade Burst uses two types of launchers: <ul><li><strong>String Launcher (LR)</strong> — pull-string launch, suitable for all types. Higher spin speed.</li><li><strong>Grip Launcher</strong> — rip-cord mechanism, comes with most starter packs</li></ul> String launchers with a <strong>left-spin (L) or right-spin (R) setting</strong> are recommended for competitive play since some tops have a specific spin direction. Check the spin direction of your top before purchasing a launcher — most tops are right-spin unless labelled 'L' or 'LR'.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 6,
    tags: ["beyblade", "launcher", "string-launcher", "grip", "spin-direction"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 460, helpful: 390, notHelpful: 18 },
    seo: {
      slug: "beyblade-burst-launcher-guide",
      metaTitle: "Which Beyblade Burst Launcher Do I Need? | LetItRip FAQ",
      metaDescription: "String vs grip launcher for Beyblade Burst — and how spin direction matters.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What does 'Burst' mean in Beyblade Burst?",
    answer:
      "<p>A 'Burst' occurs when a Beyblade's Energy Layer separates from the Disc and Tip mid-battle due to impact or a locking ratchet being defeated. Bursting a Beyblade counts for 2 points (vs. 1 point for a ring-out). The Burst mechanic introduces a risk/reward system — aggressive Attack types can force bursts but are also vulnerable to bursting themselves. The Burst Stop system on some tops (e.g., Orbit tips) reduces burst risk.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 7,
    tags: ["beyblade", "burst", "mechanic", "how-it-works", "scoring"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 540, helpful: 460, notHelpful: 20 },
    seo: {
      slug: "what-is-beyblade-burst-mechanic",
      metaTitle: "What Does 'Burst' Mean in Beyblade? | LetItRip FAQ",
      metaDescription: "The burst mechanic explained — what happens when a Beyblade bursts and how scoring works.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I clean and maintain Beyblade Burst performance tips?",
    answer:
      "<p>Performance tip maintenance: <ul><li>After each battle session, wipe tips clean with a soft cloth — dust causes wobble</li><li>Rubber tips (Xtend, Orbit, Meteo) can be cleaned with isopropyl alcohol on a cotton swab</li><li>Plastic tips need no lubrication — DO NOT apply oil or grease as it increases friction unevenly</li><li>Worn rubber tips can be replaced (sold separately on LetItRip) — rubber degrades after heavy use</li><li>Store Beyblades disassembled to avoid deforming the teeth (ratchet) mechanism</li></ul></p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 8,
    priority: 5,
    tags: ["beyblade", "maintenance", "clean", "tip", "rubber"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 320, helpful: 270, notHelpful: 14 },
    seo: {
      slug: "beyblade-tip-maintenance",
      metaTitle: "How to Maintain Beyblade Burst Tips | LetItRip FAQ",
      metaDescription: "Cleaning and maintaining Beyblade Burst performance tips to preserve spinning performance.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What age is Beyblade Burst suitable for?",
    answer:
      "<p>Beyblade Burst is officially rated for ages <strong>8 and above</strong> by Takara Tomy and Hasbro. The small parts (metal discs, performance tips) can be a choking hazard for children under 3. String launchers require some hand coordination and strength, which makes 6+ a practical lower limit. For competitive battling, children aged 8–12 pick up the rules quickly. There is no upper age limit — Beyblade has a large adult collector and competitive community.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 9,
    priority: 4,
    tags: ["beyblade", "age", "rating", "kids", "suitable"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 290, helpful: 250, notHelpful: 10 },
    seo: {
      slug: "beyblade-burst-age-rating",
      metaTitle: "What Age is Beyblade Burst Suitable For? | LetItRip FAQ",
      metaDescription: "Beyblade Burst age rating and safety information for children and adult collectors.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is the difference between a Beyblade 'Random Booster' and a 'Starter'?",
    answer:
      "<p><strong>Starters</strong> contain a single, specific Beyblade top with a launcher — you know exactly what you're getting. <strong>Random Boosters</strong> (also called 'blind bag boosters') contain one of several possible tops — you don't know which until you open it. Random Boosters are typically cheaper per top but introduce randomness. Competitive players often prefer Starters for known meta-relevant tops, while casual collectors enjoy the surprise element of Random Boosters.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 10,
    priority: 6,
    tags: ["beyblade", "random-booster", "starter", "blind-bag", "difference"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 380, helpful: 320, notHelpful: 16 },
    seo: {
      slug: "beyblade-random-booster-vs-starter",
      metaTitle: "Beyblade Random Booster vs Starter — What's the Difference? | FAQ",
      metaDescription: "Compare Beyblade Burst Starters and Random Boosters to choose the right purchase.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSFORMERS — 8 FAQs
  // ══════════════════════════════════════════════════════════════════════════
  {
    question: "What are the main Transformers toy lines available on LetItRip?",
    answer:
      "<p>We stock multiple Transformers lines: <ul><li><strong>Studio Series</strong> — movie-accurate figures from live-action films, highly detailed</li><li><strong>Masterpiece (MP)</strong> — premium collector-grade figures with maximum accuracy to G1 cartoon/comic designs</li><li><strong>Legacy</strong> — homage to classic G1 characters with modern engineering</li><li><strong>Kingdom / War for Cybertron</strong> — G1 designs with battle-damage features</li><li><strong>G1 Vintage (re-issues)</strong> — reissues of original 1984–86 toy designs</li><li><strong>Siege</strong> — Cybertronian mode versions of classic characters</li></ul></p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: true,
    order: 1,
    priority: 8,
    tags: ["transformers", "studio-series", "masterpiece", "legacy", "g1", "line"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 540, helpful: 460, notHelpful: 20 },
    seo: {
      slug: "transformers-toy-lines-guide",
      metaTitle: "Transformers Toy Lines Available on LetItRip | FAQ",
      metaDescription: "Overview of Transformers toy lines — Studio Series, Masterpiece, Legacy, G1 and more.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What does 'MISB' mean for Transformers figures?",
    answer:
      "<p><strong>MISB</strong> stands for <em>Mint in Sealed Box</em> — the figure is in its original factory-sealed packaging, never opened. This is the highest condition grade for boxed Transformers. Other common grades: <ul><li><strong>MIB</strong> — Mint in Box (box opened but figure unused)</li><li><strong>MOSC</strong> — Mint on Sealed Card (for smaller carded figures)</li><li><strong>C9/C9.5</strong> — Collector's grade condition scale (C10 = perfect)</li><li><strong>Loose/Complete</strong> — figure removed from packaging, all accessories present</li></ul></p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 2,
    priority: 8,
    tags: ["transformers", "misb", "mib", "condition", "grading", "sealed"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 480, helpful: 420, notHelpful: 16 },
    seo: {
      slug: "transformers-misb-condition-grades",
      metaTitle: "What Does MISB Mean for Transformers? | LetItRip FAQ",
      metaDescription: "MISB, MIB, and collector condition grades explained for Transformers figures.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is the difference between Autobots and Decepticons?",
    answer:
      "<p>In the Transformers franchise, the two main factions are: <ul><li><strong>Autobots</strong> — led by Optimus Prime. Generally the heroic faction, dedicated to protecting life and freedom. Classic Autobots include Optimus Prime, Bumblebee, Jazz, Ironhide, Ratchet, and the Dinobots.</li><li><strong>Decepticons</strong> — led by Megatron (later Galvatron). The villainous faction seeking Energon and conquest. Classic Decepticons include Megatron, Starscream, Soundwave, Shockwave, and the Constructicons.</li></ul> Most Transformers toy lines are divided between these two factions.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 3,
    priority: 5,
    tags: ["transformers", "autobots", "decepticons", "factions", "lore"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 420, helpful: 360, notHelpful: 14 },
    seo: {
      slug: "autobots-vs-decepticons-explained",
      metaTitle: "Autobots vs Decepticons — What's the Difference? | FAQ",
      metaDescription: "The two main Transformers factions explained for new collectors and fans.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Are G1 Transformers toys safe and lead-free?",
    answer:
      "<p>Original G1 Transformers (1984–1990) were manufactured before modern lead-free toy standards. Some G1 paint formulations from that era may contain lead-based pigments. While the lead risk from casual handling is low, we recommend: <ul><li>Not allowing young children to mouth or chew vintage figures</li><li>Washing hands after extended handling of vintage figures</li><li>Keeping vintage toys on display rather than as play toys for children under 12</li></ul> Hasbro post-2000 and all current production figures comply with modern safety standards.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 4,
    priority: 6,
    tags: ["transformers", "g1", "safety", "lead", "vintage", "children"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 310, helpful: 270, notHelpful: 12 },
    seo: {
      slug: "g1-transformers-safety-lead",
      metaTitle: "Are G1 Transformers Safe? Lead Paint & Age Safety | FAQ",
      metaDescription: "Safety information about vintage G1 Transformers toys and modern compliance.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What is a Combiner / Gestalt Transformer?",
    answer:
      "<p>Combiners (or Gestalts) are teams of Transformers that physically combine to form one giant robot. Famous examples include <strong>Devastator</strong> (6 Constructicons), <strong>Superion</strong> (5 Aerialbots), and <strong>Menasor</strong> (5 Stunticons). Combiner sets on LetItRip are usually sold as complete team bundles with all figures needed to form the combined mode. Individual members are also sometimes available separately. Combiner engineering varies by line — modern Combiner Wars figures have improved stability vs. vintage G1.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 5,
    priority: 6,
    tags: ["transformers", "combiner", "gestalt", "devastator", "superion"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 380, helpful: 320, notHelpful: 14 },
    seo: {
      slug: "transformers-combiner-gestalt-guide",
      metaTitle: "What is a Combiner Transformer? | LetItRip FAQ",
      metaDescription: "Combiner and Gestalt Transformers explained — what they are and how they combine.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I know if a Transformers figure is official Hasbro or a KO (knock-off)?",
    answer:
      "<p>Authentic Hasbro/Takara Tomy figures can be identified by: <ul><li>Hasbro or Takara copyright stamp on the figure (usually on underside or leg)</li><li>Quality of plastic — KOs often use brittle, chalky plastic</li><li>Tight transformation joints — KOs are often loose or snapping</li><li>Packaging barcode validity (search the barcode online)</li><li>Price — unusually cheap 'Studio Series' is a red flag</li></ul> All sellers on LetItRip who list Transformers must provide proof of purchase. Report suspected KOs via our report button.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 6,
    priority: 8,
    tags: ["transformers", "knock-off", "ko", "authentic", "identify", "fake"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 560, helpful: 480, notHelpful: 20 },
    seo: {
      slug: "identify-transformers-knock-off",
      metaTitle: "How to Spot a Fake Transformers Figure (KO) | LetItRip FAQ",
      metaDescription: "Tips to identify authentic Hasbro Transformers vs knock-off (KO) figures.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What size classes do Transformers figures come in?",
    answer:
      "<p>Current Transformers lines use these size classes (smallest to largest): <ul><li><strong>Core Class</strong> — small, ~10 cm, budget figures</li><li><strong>Deluxe Class</strong> — ~14 cm, most common size, good detail</li><li><strong>Voyager Class</strong> — ~18 cm, more complex transformation</li><li><strong>Leader Class</strong> — ~22 cm, premium figures with light/sound in some lines</li><li><strong>Commander Class</strong> — ~28 cm, top-tier figures</li><li><strong>Titan Class</strong> — 60+ cm, city-sized figures (e.g., Metroplex, Fortress Maximus)</li></ul> All listings on LetItRip specify the size class.</p>",
    category: "product_information",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 7,
    priority: 6,
    tags: ["transformers", "size-class", "deluxe", "voyager", "leader", "titan"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 440, helpful: 380, notHelpful: 16 },
    seo: {
      slug: "transformers-size-classes-guide",
      metaTitle: "Transformers Figure Size Classes Explained | LetItRip FAQ",
      metaDescription: "Core, Deluxe, Voyager, Leader, Commander, Titan — all Transformers size classes explained.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I return a Transformers figure if the transformation is too difficult?",
    answer:
      "<p>Returns based on 'too difficult to transform' are not covered under our standard return policy — complex transformation is a feature of the product, not a defect. However, if a joint is broken at arrival, a peg is snapped, or a part is missing, this qualifies as a defective item and is eligible for return or replacement within the seller's return window. Always record an unboxing video for high-value figures to document condition on arrival. Reach out to the seller first; escalate to LetItRip support if unresolved.</p>",
    category: "returns_refunds",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 11,
    priority: 6,
    tags: ["transformers", "return", "defective", "transformation", "difficult"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 280, helpful: 240, notHelpful: 20 },
    seo: {
      slug: "transformers-return-difficult-transformation",
      metaTitle: "Can I Return a Transformers Figure if Hard to Transform? | FAQ",
      metaDescription: "Return eligibility for Transformers figures — defects vs difficulty level.",
    },
    isActive: true,
    createdBy: "system",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SELLERS & STORES — 8 additional FAQs
  // ══════════════════════════════════════════════════════════════════════════
  {
    question: "How do I open a store on LetItRip?",
    answer:
      "<p>To open a store: <ol><li>Create an account and complete email verification</li><li>Navigate to <strong>Dashboard → Become a Seller</strong></li><li>Complete KYC: upload government ID and a selfie for verification</li><li>Set up your store profile — name, logo, banner, bio, and location</li><li>Add your first product listing</li><li>Once approved by our team (usually within 24 hours), your store goes live</li></ol> Stores are free to open. Platform fees apply per sale (see our fee schedule).</p>",
    category: "general",
    showOnHomepage: true,
    showInFooter: false,
    isPinned: true,
    order: 12,
    priority: 9,
    tags: ["seller", "store", "open", "kyc", "how-to", "dashboard"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 920, helpful: 810, notHelpful: 28 },
    seo: {
      slug: "how-to-open-store-letitrip",
      metaTitle: "How to Open a Store on LetItRip | Seller Guide",
      metaDescription: "Step-by-step guide to opening a collectibles store on LetItRip marketplace.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What are LetItRip's seller fees?",
    answer:
      "<p>LetItRip charges the following fees to sellers: <ul><li><strong>Listing fee</strong>: Free (no charge to list)</li><li><strong>Transaction fee</strong>: 5% of the sale price on completed orders</li><li><strong>Payment processing</strong>: 2% + GST (passed through from payment gateway)</li><li><strong>Promoted listing fee</strong>: ₹99–₹499 per 7-day promotion window (optional)</li></ul> No subscription fee. Fees are automatically deducted before payout. Full fee schedule available in the Seller Help Centre.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 13,
    priority: 8,
    tags: ["seller", "fees", "commission", "listing", "transaction"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 740, helpful: 650, notHelpful: 30 },
    seo: {
      slug: "letitrip-seller-fees",
      metaTitle: "LetItRip Seller Fees & Commission Structure | FAQ",
      metaDescription: "Complete breakdown of seller fees on LetItRip — listing, transaction, and payment processing.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How long does it take to get paid after a sale?",
    answer:
      "<p>Payouts are processed within <strong>7 business days</strong> after the buyer confirms receipt and the return window closes. Payouts go to your linked bank account via NEFT/IMPS. The timeline: <ol><li>Order placed — payment held</li><li>You ship and upload tracking</li><li>Buyer receives item — return window opens (3–7 days depending on product type)</li><li>Return window closes → payout initiated</li><li>Bank credit within 1–3 business days after initiation</li></ol> For auction wins, the same timeline applies.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 14,
    priority: 8,
    tags: ["seller", "payout", "payment", "timeline", "bank"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 680, helpful: 590, notHelpful: 22 },
    seo: {
      slug: "seller-payout-timeline",
      metaTitle: "When Do Sellers Get Paid on LetItRip? | Payout FAQ",
      metaDescription: "Seller payout timeline explained — from order to bank credit on LetItRip.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I set my own return policy as a seller?",
    answer:
      "<p>Yes. LetItRip gives sellers flexibility to set store-level return policies. You can configure: <ul><li>Return window: 0, 3, 7, or 14 days after delivery</li><li>Return reason requirements: all reasons, buyer's remorse excluded, defect only</li><li>Who pays return shipping: buyer or seller</li></ul> Platform-level minimum: if an item arrives damaged or not-as-described, buyers are always protected regardless of your policy. Your custom policy is shown on every product page.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 15,
    priority: 7,
    tags: ["seller", "return", "policy", "custom", "store"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 460, helpful: 400, notHelpful: 18 },
    seo: {
      slug: "seller-return-policy-settings",
      metaTitle: "Can Sellers Set Their Own Return Policy? | LetItRip FAQ",
      metaDescription: "How sellers can configure return windows and policies on LetItRip.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "What happens if a buyer raises a dispute against me?",
    answer:
      "<p>If a buyer raises a dispute: <ol><li>You receive a notification and have <strong>48 hours</strong> to respond</li><li>Provide evidence: tracking proof, photos of item before shipping, description accuracy</li><li>LetItRip mediation team reviews both sides within 5 business days</li><li>If resolved in your favour, the order completes normally</li><li>If resolved in the buyer's favour, a full or partial refund is issued; item returned to you</li></ol> Always ship with tracking and photograph items before packing to build your evidence trail.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 16,
    priority: 7,
    tags: ["seller", "dispute", "resolution", "mediation", "tracking"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 520, helpful: 450, notHelpful: 22 },
    seo: {
      slug: "seller-dispute-resolution-process",
      metaTitle: "What Happens If a Buyer Disputes My Order? | LetItRip FAQ",
      metaDescription: "LetItRip's dispute resolution process for sellers — timeline and evidence requirements.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I list pre-order products before they arrive in stock?",
    answer:
      "<p>Yes, pre-order listings are fully supported. To list a pre-order: <ol><li>Create a product listing and toggle <strong>Pre-Order Mode</strong> on</li><li>Set the estimated dispatch date and deposit amount</li><li>Add a pre-order note explaining terms (e.g., 'Full payment at dispatch')</li><li>Buyers pay a deposit to reserve the item</li></ol> You must update the listing if dispatch dates change and notify affected buyers. Repeated delays or cancellations can trigger seller rating penalties. Full payment processing happens at dispatch.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 17,
    priority: 7,
    tags: ["seller", "pre-order", "listing", "deposit", "dispatch"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 390, helpful: 340, notHelpful: 14 },
    seo: {
      slug: "seller-pre-order-listing-guide",
      metaTitle: "How to List Pre-Order Products on LetItRip | Seller Guide",
      metaDescription: "Step-by-step guide to creating pre-order listings on LetItRip as a seller.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "How do I promote a listing on LetItRip?",
    answer:
      "<p>Promoted listings appear at the top of search results, category pages, and may be featured on the homepage. To promote: <ol><li>Go to your Dashboard → My Products</li><li>Click the <strong>Promote</strong> button on any active listing</li><li>Choose a duration: 7, 14, or 30 days</li><li>Pay the promotion fee (₹99–₹499 depending on duration and category)</li></ol> Promoted listings show a 'Promoted' badge. Analytics (views, clicks, conversions) are tracked in your dashboard.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 18,
    priority: 6,
    tags: ["seller", "promote", "promotion", "listing", "featured"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 380, helpful: 320, notHelpful: 16 },
    seo: {
      slug: "how-to-promote-listing",
      metaTitle: "How to Promote a Listing on LetItRip | Seller FAQ",
      metaDescription: "How to get your collectibles listings promoted on LetItRip for more visibility.",
    },
    isActive: true,
    createdBy: "system",
  },
  {
    question: "Can I run a sale or discount on my store products?",
    answer:
      "<p>Yes. You can offer discounts via two mechanisms: <ul><li><strong>Direct price edit</strong>: Simply lower the price on any listing. Add 'SALE' to the product title to make it clear.</li><li><strong>Store Coupons</strong>: Create a coupon code (e.g., BEYBLADE10) from Dashboard → Coupons → Create. Set percentage or flat discount, expiry, and per-user limits. Share the code with your social media following or newsletter.</li></ul> Platform-wide sale events (e.g., Diwali Sale) offer additional visibility for participating sellers.</p>",
    category: "general",
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    order: 19,
    priority: 6,
    tags: ["seller", "discount", "sale", "coupon", "store"],
    relatedFAQs: [],
    useSiteSettings: false,
    stats: { views: 340, helpful: 290, notHelpful: 12 },
    seo: {
      slug: "seller-discount-sale-coupon",
      metaTitle: "How to Run Sales and Discounts as a Seller | LetItRip FAQ",
      metaDescription: "Create discounts, coupons, and sales on your LetItRip store.",
    },
    isActive: true,
    createdBy: "system",
  },
];

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const faqSeedData: (Omit<FAQDocument, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
})[] = RAW_FAQS.map((faq, i) => ({
  ...normalizeFaqSeed(faq),
  createdAt: daysAgo(400 - i * 5),
  updatedAt: daysAgo(Math.max(1, 60 - i * 1)),
}));
