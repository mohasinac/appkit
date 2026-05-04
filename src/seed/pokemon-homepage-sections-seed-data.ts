/**
 * Multi-Franchise Collectibles — Homepage Sections Seed Data
 *
 * Covers Pokémon TCG · Hot Wheels · Beyblade Burst · Transformers
 */

import type { HomepageSectionDocument } from "../features/homepage/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const pokemonHomepageSectionsSeedData: Partial<HomepageSectionDocument>[] = [
  // -- 1. Hero Carousel ---------------------------------------------------------
  {
    id: "section-carousel-multifranchise-1",
    type: "carousel",
    order: 1,
    enabled: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 2. Featured Products (all franchises) ------------------------------------
  {
    id: "section-products-featured-multifranchise-2",
    type: "products",
    order: 2,
    enabled: true,
    config: {
      title: "Featured Collectibles",
      subtitle: "Hand-picked top picks across all four franchises",
      maxProducts: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 4000,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 3. Live Auctions ---------------------------------------------------------
  {
    id: "section-auctions-live-multifranchise-3",
    type: "auctions",
    order: 3,
    enabled: true,
    config: {
      title: "🔥 Live Auctions",
      subtitle: "Bid on graded slabs, rare singles, vintage toys, and exclusive collectibles",
      maxAuctions: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: true,
      scrollInterval: 4000,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 4. Pre-Orders ------------------------------------------------------------
  {
    id: "section-preorders-multifranchise-4",
    type: "pre-orders",
    order: 4,
    enabled: true,
    config: {
      title: "🎴 Reserve Before They Ship",
      subtitle: "Pre-order upcoming sets, sealed products, and new releases across all franchises",
      maxItems: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 5000,
    },
    createdAt: daysAgo(14),
    updatedAt: daysAgo(1),
  },

  // -- 5. Trust Indicators + Stats ----------------------------------------------
  {
    id: "section-trust-stats-multifranchise-5",
    type: "trust-indicators",
    order: 5,
    enabled: true,
    config: {
      title: "Why Collectors Choose LetItRip",
      indicators: [
        {
          id: "trust_auth",
          icon: "🔍",
          title: "Authenticity Guaranteed",
          description: "Every item inspected and verified before listing",
        },
        {
          id: "trust_ship",
          icon: "📦",
          title: "Safe Packaging",
          description: "Cards in top-loaders, toys in foam-lined boxes — fully tracked",
        },
        {
          id: "trust_grade",
          icon: "🏆",
          title: "PSA / BGS Graded",
          description: "Certified graded slabs with authentic serial numbers",
        },
        {
          id: "trust_pay",
          icon: "💳",
          title: "Secure Payments",
          description: "Razorpay-powered checkout — UPI, Cards, EMI available",
        },
        {
          id: "trust_sellers",
          icon: "✅",
          title: "Verified Sellers",
          description: "All sellers KYC-verified with track record reviews",
        },
        {
          id: "trust_return",
          icon: "↩️",
          title: "Buyer Protection",
          description: "7-day return policy on eligible items — no questions asked",
        },
      ],
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 6. Categories -----------------------------------------------------------
  {
    id: "section-categories-multifranchise-6",
    type: "categories",
    order: 6,
    enabled: true,
    config: {
      title: "Shop by Category",
      maxCategories: 4,
      autoScroll: false,
      scrollInterval: 4000,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 7. Featured Stores ------------------------------------------------------
  {
    id: "section-stores-multifranchise-7",
    type: "stores",
    order: 7,
    enabled: true,
    config: {
      title: "Top Collector Stores",
      subtitle: "Curated stores from verified sellers across India",
      maxStores: 8,
      autoScroll: false,
      scrollInterval: 4000,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 8. Reviews --------------------------------------------------------------
  {
    id: "section-reviews-multifranchise-8",
    type: "reviews",
    order: 8,
    enabled: true,
    config: {
      title: "What Collectors Are Saying",
      maxReviews: 18,
      itemsPerView: 3,
      mobileItemsPerView: 1,
      autoScroll: true,
      scrollInterval: 5000,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 9. FAQ ------------------------------------------------------------------
  {
    id: "section-faq-multifranchise-9",
    type: "faq",
    order: 9,
    enabled: true,
    config: {
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about buying collectibles on LetItRip",
      showOnHomepage: true,
      displayCount: 8,
      expandedByDefault: false,
      linkToFullPage: true,
      categories: ["general", "shipping", "returns", "payment"],
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 10. Newsletter ----------------------------------------------------------
  {
    id: "section-newsletter-multifranchise-10",
    type: "newsletter",
    order: 10,
    enabled: true,
    config: {
      title: "Stay Ahead of Every Drop",
      description: "Get early access to rare auctions, new pre-orders, and exclusive deals. Join 5,000+ collectors.",
      placeholder: "Enter your email address",
      buttonText: "Subscribe",
      privacyText: "We respect your privacy. Unsubscribe at any time.",
      privacyLink: "/privacy",
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // -- 11. Blog Articles -------------------------------------------------------
  {
    id: "section-blog-multifranchise-11",
    type: "blog-articles",
    order: 11,
    enabled: true,
    config: {
      title: "From the Collector's Corner",
      maxArticles: 4,
      showReadTime: true,
      showAuthor: true,
      showThumbnails: true,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },
];
