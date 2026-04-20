/**
 * Pokemon Base Set 151 — Homepage Sections Seed Data
 * All 15 section slots configured for a Pokémon TCG marketplace
 */

import type { HomepageSectionDocument } from "../features/homepage/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const pokemonHomepageSectionsSeedData: Partial<HomepageSectionDocument>[] =
  [
    // -- 1. Welcome ------------------------------------------------------------
    {
      id: "section-welcome-pokemon-1707300000001",
      type: "welcome",
      order: 1,
      enabled: true,
      config: {
        h1: "Welcome to LetItRip — Pokémon Base Set Marketplace",
        subtitle: "India's Home for Authentic Base Set 151 Collectibles",
        description: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text:
                    "Shop original Pokémon Base Set singles, sealed packs, graded slabs, and accessories. " +
                    "From Pikachu Commons to 1st Edition Charizard — buy and sell with confidence.",
                },
              ],
            },
          ],
        }),
        showCTA: true,
        ctaText: "Browse All Cards",
        ctaLink: "/products",
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 2. Trust Indicators ---------------------------------------------------
    {
      id: "section-trust-indicators-pokemon-1707300000002",
      type: "trust-indicators",
      order: 2,
      enabled: true,
      config: {
        title: "Why Trainers Trust LetItRip",
        indicators: [
          {
            id: "trust_001",
            icon: "🔍",
            title: "Authenticity Verified",
            description: "Every card inspected by our expert team",
          },
          {
            id: "trust_002",
            icon: "📦",
            title: "Safe Shipping",
            description: "Top-loaders, bubble mailers, and tracked dispatch",
          },
          {
            id: "trust_003",
            icon: "🏆",
            title: "PSA / BGS Graded",
            description: "Graded slabs authenticated and sealed",
          },
          {
            id: "trust_004",
            icon: "💳",
            title: "Secure Payments",
            description: "100% safe and encrypted checkout",
          },
        ],
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 3. Featured Categories ------------------------------------------------
    {
      id: "section-categories-pokemon-1707300000003",
      type: "categories",
      order: 3,
      enabled: true,
      config: {
        title: "Shop by Type",
        maxCategories: 4,
        autoScroll: true,
        scrollInterval: 3000,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 4. Featured Products — Holo Rares -------------------------------------
    {
      id: "section-products-pokemon-featured-1707300000004",
      type: "products",
      order: 4,
      enabled: true,
      config: {
        title: "✨ Holographic Rare Picks",
        subtitle: "The most sought-after singles from the original Base Set",
        maxProducts: 18,
        rows: 2,
        itemsPerRow: 3,
        mobileItemsPerRow: 1,
        autoScroll: false,
        scrollInterval: 3000,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 5. New Arrivals -------------------------------------------------------
    {
      id: "section-products-pokemon-new-arrivals-1707300000005",
      type: "products",
      order: 5,
      enabled: true,
      config: {
        title: "🆕 New Arrivals",
        subtitle: "Freshly listed singles, lots, and accessories",
        maxProducts: 18,
        rows: 2,
        itemsPerRow: 3,
        mobileItemsPerRow: 1,
        autoScroll: true,
        scrollInterval: 4000,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 6. Live Auctions ------------------------------------------------------
    {
      id: "section-auctions-pokemon-1707300000006",
      type: "auctions",
      order: 6,
      enabled: true,
      config: {
        title: "🔥 Live Auctions",
        subtitle: "Bid on graded slabs and ultra-rare Base Set cards",
        maxAuctions: 18,
        rows: 2,
        itemsPerRow: 3,
        mobileItemsPerRow: 1,
        autoScroll: false,
        scrollInterval: 4000,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 7. Promotional Banner — Charizard -------------------------------------
    {
      id: "section-banner-pokemon-1707300000007",
      type: "banner",
      order: 7,
      enabled: true,
      config: {
        height: "md",
        gradient:
          "linear-gradient(135deg, #FF6B35 0%, #F7C59F 50%, #FFCB05 100%)",
        content: {
          title: "The Holy Grail is Here",
          subtitle: "1st Edition Charizard — PSA 7 — Live Auction",
          description:
            "Current bid ₹3,49,999 · 7 days remaining · Buy Now at ₹6,99,999",
        },
        buttons: [
          {
            text: "Bid Now",
            link: "/auctions",
            variant: "primary",
          },
          {
            text: "All Auctions",
            link: "/auctions",
            variant: "secondary",
          },
        ],
        clickable: true,
        clickLink: "/auctions",
      },
      createdAt: daysAgo(3),
      updatedAt: daysAgo(0),
    },

    // -- 8. Features / Why Us --------------------------------------------------
    {
      id: "section-features-pokemon-1707300000008",
      type: "features",
      order: 8,
      enabled: true,
      config: {
        title: "Everything a Pokémon Collector Needs",
        features: ["feature_001", "feature_002", "feature_003", "feature_004"],
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 9. Reviews ------------------------------------------------------------
    {
      id: "section-reviews-pokemon-1707300000009",
      type: "reviews",
      order: 9,
      enabled: true,
      config: {
        title: "What Trainers Are Saying",
        maxReviews: 18,
        itemsPerView: 3,
        mobileItemsPerView: 1,
        autoScroll: true,
        scrollInterval: 5000,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 10. WhatsApp Community ------------------------------------------------
    {
      id: "section-whatsapp-community-pokemon-1707300000010",
      type: "whatsapp-community",
      order: 10,
      enabled: true,
      config: {
        title: "Join the Pokémon Collectors Community",
        description:
          "Connect with 500+ Pokémon TCG collectors in India. Get price alerts, trading tips, and early access to new listings.",
        groupLink: "https://chat.whatsapp.com/pokemon-collectors-india",
        memberCount: 512,
        benefits: [
          "📢 New listing alerts",
          "💰 Price tracking & trend reports",
          "🎁 Exclusive early access to rare cards",
          "🤝 Trusted trading among verified members",
        ],
        buttonText: "Join Now (Free)",
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 11. FAQ ---------------------------------------------------------------
    {
      id: "section-faq-pokemon-1707300000011",
      type: "faq",
      order: 11,
      enabled: true,
      config: {
        title: "Frequently Asked Questions",
        subtitle:
          "Everything you need to know about buying and selling Pokémon cards on LetItRip",
        showOnHomepage: true,
        displayCount: 6,
        expandedByDefault: false,
        linkToFullPage: true,
        categories: ["products", "sellers", "general", "shipping"],
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 12. Blog Articles -----------------------------------------------------
    {
      id: "section-blog-articles-pokemon-1707300000012",
      type: "blog-articles",
      order: 12,
      enabled: true,
      config: {
        title: "From the Collectors' Corner",
        subtitle: "Card grading guides, market trends, and Base Set deep dives",
        maxArticles: 4,
        showReadTime: true,
        showAuthor: true,
        showThumbnails: true,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 13. Newsletter --------------------------------------------------------
    {
      id: "section-newsletter-pokemon-1707300000013",
      type: "newsletter",
      order: 13,
      enabled: true,
      config: {
        title: "Stay Ahead of the Rares",
        description:
          "Get weekly price updates, new listing alerts, and exclusive deals delivered straight to your inbox.",
        placeholder: "Enter your email address",
        buttonText: "Subscribe",
        privacyText: "No spam. Unsubscribe anytime.",
        privacyLink: "/privacy",
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 14. Stores ------------------------------------------------------------
    {
      id: "section-stores-pokemon-1707300000014",
      type: "stores",
      order: 14,
      enabled: true,
      config: {
        title: "Meet Our Top Sellers",
        subtitle:
          "Verified Pokémon card specialists — Gym Leaders of the marketplace",
        maxStores: 12,
        autoScroll: true,
        scrollInterval: 4000,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },

    // -- 15. Events (disabled) -------------------------------------------------
    {
      id: "section-events-pokemon-1707300000015",
      type: "events",
      order: 15,
      enabled: false,
      config: {
        title: "Upcoming Pokémon Events",
        subtitle: "Pre-releases, draft tournaments and collector meetups",
        maxEvents: 12,
        autoScroll: false,
        scrollInterval: 4000,
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },
  ];
