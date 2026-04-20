/**
 * Homepage Sections Seed Data
 * Configurable sections for the homepage
 *
 * ID Pattern: section-{type}-{timestamp}
 * All IDs follow the generateHomepageSectionId() pattern from @/utils
 *
 * Section order follows DEFAULT_SECTION_ORDER from schema:
 * welcome(1) → trust-indicators(2) → categories(3) → products(4,5) →
 * auctions(6) → banner(7) → features(8) → reviews(9) →
 * whatsapp-community(10) → faq(11) → blog-articles(12) → newsletter(13) →
 * stores(14) → events(15)
 *
 * 15 total sections (14 enabled, 1 disabled for testing)
 */

import type { HomepageSectionDocument } from "../features/homepage/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const homepageSectionsSeedData: Partial<HomepageSectionDocument>[] = [
  // ============================================
  // 1. WELCOME SECTION
  // ============================================
  {
    id: "section-welcome-1707300000001",
    type: "welcome",
    order: 1,
    enabled: true,
    config: {
      h1: "Welcome to LetItRip — Your Otaku Marketplace",
      subtitle: "India’s Premier Anime Collectibles & Rare Figures Destination",
      description: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Discover rare anime figures, exclusive live auctions, and pre-orders from verified collectors across India. Scale figures, Nendoroids, Gunpla, Pok\u00e9mon TCG, cosplay, and more.",
              },
            ],
          },
        ],
      }),
      showCTA: true,
      ctaText: "Explore Collectibles",
      ctaLink: "/products",
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 2. TRUST INDICATORS
  // ============================================
  {
    id: "section-trust-indicators-1707300000002",
    type: "trust-indicators",
    order: 2,
    enabled: true,
    config: {
      title: "Why Collectors Trust LetItRip",
      indicators: [
        {
          id: "trust_001",
          icon: "🚚",
          title: "Free Shipping",
          description: "On all orders above ₹999",
        },
        {
          id: "trust_002",
          icon: "🔒",
          title: "Secure Payments",
          description: "100% safe & encrypted",
        },
        {
          id: "trust_003",
          icon: "✅",
          title: "Verified Sellers",
          description: "Only authenticated collectibles",
        },
        {
          id: "trust_004",
          icon: "🏆",
          title: "Live Auctions",
          description: "Bid on rare & exclusive figures",
        },
      ],
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 3. FEATURED CATEGORIES
  // ============================================
  {
    id: "section-categories-1707300000003",
    type: "categories",
    order: 3,
    enabled: true,
    config: {
      title: "Shop by Category",
      maxCategories: 4,
      autoScroll: false,
      scrollInterval: 3000,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 4. FEATURED PRODUCTS
  // ============================================
  {
    id: "section-products-1707300000004",
    type: "products",
    order: 4,
    enabled: true,
    config: {
      title: "Featured Collectibles",
      subtitle: "Handpicked rare figures & anime merch",
      maxProducts: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 5000,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 5. NEW ARRIVALS PRODUCTS
  // ============================================
  {
    id: "section-products-1707300000005",
    type: "products",
    order: 5,
    enabled: true,
    config: {
      title: "New Arrivals",
      subtitle: "Fresh drops — figures, Nendoroids & pre-orders just listed",
      maxProducts: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: true,
      scrollInterval: 4000,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 6. LIVE AUCTIONS
  // ============================================
  {
    id: "section-auctions-1707300000006",
    type: "auctions",
    order: 6,
    enabled: true,
    config: {
      title: "Live Auctions",
      subtitle:
        "Bid on rare 1/7 scale figures, signed art, PSA graded cards & more",
      maxAuctions: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 5000,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 7. PROMOTIONAL BANNER
  // ============================================
  {
    id: "section-banner-1707300000007",
    type: "banner",
    order: 7,
    enabled: true,
    config: {
      height: "md",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      content: {
        title: "AniCon 2026 Coupon Drop 🎉",
        subtitle: "Extra 15% Off All Anime Orders",
        description: "Use code ANIMECON15 at checkout — valid Mar 1–15",
      },
      buttons: [
        {
          text: "Shop Now",
          link: "/products",
          variant: "primary",
        },
      ],
      clickable: true,
      clickLink: "/deals",
    },
    createdAt: daysAgo(37),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 8. FEATURES SECTION
  // ============================================
  {
    id: "section-features-1707300000008",
    type: "features",
    order: 8,
    enabled: true,
    config: {
      title: "Platform Features",
      features: ["feature_001", "feature_002", "feature_003", "feature_004"],
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 9. CUSTOMER REVIEWS
  // ============================================
  {
    id: "section-reviews-1707300000009",
    type: "reviews",
    order: 9,
    enabled: true,
    config: {
      title: "What Our Customers Say",
      maxReviews: 18,
      itemsPerView: 3,
      mobileItemsPerView: 1,
      autoScroll: true,
      scrollInterval: 6000,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 10. WHATSAPP COMMUNITY
  // ============================================
  {
    id: "section-whatsapp-community-1707300000010",
    type: "whatsapp-community",
    order: 10,
    enabled: true,
    config: {
      title: "Join Our Community",
      description:
        "Get early auction alerts, exclusive otaku deals, and connect with collectors across India",
      groupLink: "https://chat.whatsapp.com/example",
      memberCount: 5000,
      benefits: [
        "Exclusive discounts",
        "Early sale access",
        "Product tips",
        "Direct support",
      ],
      buttonText: "Join WhatsApp Community",
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 11. FAQ SECTION
  // ============================================
  {
    id: "section-faq-1707300000011",
    type: "faq",
    order: 11,
    enabled: true,
    config: {
      title: "Frequently Asked Questions",
      subtitle: "Find answers to common questions",
      showOnHomepage: true,
      displayCount: 6,
      expandedByDefault: false,
      linkToFullPage: true,
      categories: ["general", "shipping", "returns", "payment"],
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 12. BLOG ARTICLES
  // ============================================
  {
    id: "section-blog-articles-1707300000012",
    type: "blog-articles",
    order: 12,
    enabled: true,
    config: {
      title: "From Our Blog",
      subtitle:
        "Figure reviews, auction guides, and collector community stories",
      maxArticles: 4,
      showReadTime: true,
      showAuthor: true,
      showThumbnails: true,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(26),
  },

  // ============================================
  // 13. NEWSLETTER SIGNUP
  // ============================================
  {
    id: "section-newsletter-1707300000013",
    type: "newsletter",
    order: 13,
    enabled: true,
    config: {
      title: "Stay Updated",
      description:
        "Subscribe for pre-order alerts, auction announcements, and otaku discounts",
      placeholder: "Enter your email",
      buttonText: "Subscribe",
      privacyText: "We respect your privacy",
      privacyLink: "/privacy-policy",
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 14. FEATURED STORES
  // ============================================
  {
    id: "section-stores-1707300000014",
    type: "stores",
    order: 14,
    enabled: true,
    config: {
      title: "Featured Stores",
      subtitle:
        "Shop from verified anime figure importers and collectible stores",
      maxStores: 12,
      autoScroll: true,
      scrollInterval: 4500,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },

  // ============================================
  // 15. UPCOMING EVENTS
  // ============================================
  {
    id: "section-events-1707300000015",
    type: "events",
    order: 15,
    enabled: true,
    config: {
      title: "Upcoming Events",
      subtitle:
        "Anime sales, AniCon drops, and collector auctions — coming up soon",
      maxEvents: 12,
      autoScroll: true,
      scrollInterval: 5000,
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(30),
  },
];
