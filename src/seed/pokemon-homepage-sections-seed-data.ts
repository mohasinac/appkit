/**
 * Multi-Franchise Collectibles — Homepage Sections Seed Data (5 sections)
 *
 * Covers Pokémon TCG · Hot Wheels · Beyblade Burst · Transformers
 */

import type { HomepageSectionDocument } from "../features/homepage/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const pokemonHomepageSectionsSeedData: Partial<HomepageSectionDocument>[] = [
  // -- 1. Welcome ---------------------------------------------------------------
  {
    id: "section-welcome-multifranchise-1",
    type: "welcome",
    order: 1,
    enabled: true,
    config: {
      h1: "India's #1 Collectibles Marketplace",
      subtitle: "Pokémon TCG · Hot Wheels · Beyblade Burst · Transformers",
      description: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text:
                  "Shop authentic collectibles from verified sellers across India. " +
                  "Original Pokémon Base Set singles, Hot Wheels Treasure Hunts, Beyblade Burst tops, " +
                  "and vintage Transformers — all in one place.",
              },
            ],
          },
        ],
      }),
      showCTA: true,
      ctaText: "Explore All Collectibles",
      ctaLink: "/products",
    },
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
];
