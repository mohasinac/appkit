/**
 * Homepage Sections Seed Data — LetiTrip Collectibles Platform
 * All 19 section types seeded. section- prefix, id === slug.
 * Order reflects the recommended homepage layout.
 */

import type { HomepageSectionDocument } from "../features/homepage/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const homepageSectionsSeedData: Partial<HomepageSectionDocument>[] = [
  // ── 1. welcome ────────────────────────────────────────────────────────────
  {
    id: "section-welcome-hero",
    type: "welcome",
    order: 1,
    enabled: true,
    config: {
      h1: "India's #1 Collectibles Marketplace",
      subtitle: "Buy, Sell & Auction with Verified Sellers",
      description:
        "Discover Pokémon TCG cards, Hot Wheels diecast, Beyblade X tops, anime figures, and Gunpla kits from verified sellers across India. Secure payments, escrow protection, authentic products.",
      showCTA: true,
      ctaText: "Start Shopping",
      ctaLink: "/products",
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
  },

  // ── 2. carousel ──────────────────────────────────────────────────────────
  {
    id: "section-hero-carousel",
    type: "carousel",
    order: 2,
    enabled: true,
    config: { title: "Hero Carousel", height: "tall", pauseOnHover: true, showDots: true, showArrows: true },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
  },

  // ── 3. stats ─────────────────────────────────────────────────────────────
  {
    id: "section-platform-stats",
    type: "stats",
    order: 3,
    enabled: true,
    config: {
      title: "LetiTrip by the Numbers",
      stats: [
        { key: "products", label: "Listings", value: "5,000+" },
        { key: "sellers", label: "Verified Sellers", value: "200+" },
        { key: "buyers", label: "Happy Buyers", value: "12,000+" },
        { key: "rating", label: "Platform Rating", value: "4.8★" },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(15),
  },

  // ── 4. trust-indicators ──────────────────────────────────────────────────
  {
    id: "section-trust-indicators",
    type: "trust-indicators",
    order: 4,
    enabled: true,
    config: {
      title: "Why Collectors Trust LetiTrip",
      indicators: [
        {
          id: "trust-verified",
          icon: "shield-check",
          title: "Verified Sellers",
          description: "Every seller is manually verified. Listings reviewed for authenticity before going live.",
        },
        {
          id: "trust-escrow",
          icon: "lock",
          title: "Escrow Payment",
          description: "Payment held in escrow and released only after you confirm delivery.",
        },
        {
          id: "trust-returns",
          icon: "arrow-path",
          title: "Easy Returns",
          description: "Seller return policies cover all product types. Platform mediates disputes.",
        },
        {
          id: "trust-authentic",
          icon: "badge-check",
          title: "Authenticity Guarantee",
          description: "Counterfeit items: full refund + seller suspension. Zero tolerance policy.",
        },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(12),
  },

  // ── 5. categories ────────────────────────────────────────────────────────
  {
    id: "section-collectibles-categories",
    type: "categories",
    order: 5,
    enabled: true,
    config: {
      title: "Shop by Category",
      maxCategories: 4,
      autoScroll: true,
      scrollInterval: 4000,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(8),
  },

  // ── 6. brands ────────────────────────────────────────────────────────────
  {
    id: "section-top-brands",
    type: "brands",
    order: 6,
    enabled: true,
    config: {
      title: "Top Collectibles Brands",
      subtitle: "Authentic products from the world's leading collectibles manufacturers",
      maxBrands: 13,
      autoScroll: true,
      scrollInterval: 3000,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(6),
  },

  // ── 7. products — featured ───────────────────────────────────────────────
  {
    id: "section-featured-products",
    type: "products",
    order: 7,
    enabled: true,
    config: {
      title: "Featured Collectibles",
      subtitle: "Hand-picked by our team — fresh stock, verified authentic",
      maxProducts: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 0,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(4),
  },

  // ── 8. auctions ──────────────────────────────────────────────────────────
  {
    id: "section-live-auctions",
    type: "auctions",
    order: 8,
    enabled: true,
    config: {
      title: "Live Auctions",
      subtitle: "Bid on rare collectibles — auctions ending soon",
      maxAuctions: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 0,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3),
  },

  // ── 9. pre-orders ────────────────────────────────────────────────────────
  {
    id: "section-pre-orders",
    type: "pre-orders",
    order: 9,
    enabled: true,
    config: {
      title: "Reserve Before It Ships",
      subtitle: "Secure upcoming Pokémon, Bandai, and Hot Wheels releases with a deposit",
      maxItems: 18,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 0,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3),
  },

  // ── 10. banner — Beyblade X promo ────────────────────────────────────────
  {
    id: "section-beyblade-x-banner",
    type: "banner",
    order: 10,
    enabled: true,
    config: {
      height: "md",
      backgroundImage:
        "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1920&h=400&fit=crop",
      content: {
        title: "Beyblade X is Here",
        subtitle: "Official Takara Tomy Import — BX-01, BX-05, BX-10 and more",
        description: "India's best selection of Beyblade X tops, launchers, and XStadiums.",
      },
      buttons: [
        { text: "Shop Beyblade X", link: "/categories/category-beyblade-tops", variant: "primary" },
        { text: "Beginner's Guide", link: "/blog/blog-beyblade-x-beginners-guide-2026", variant: "outline" },
      ],
      clickable: false,
    },
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
  },

  // ── 11. features ─────────────────────────────────────────────────────────
  {
    id: "section-platform-features",
    type: "features",
    order: 11,
    enabled: true,
    config: {
      title: "Everything a Collector Needs",
      features: [
        "Verified authentic listings — every item reviewed before going live",
        "Escrow payment protection — money held until you confirm delivery",
        "Graded slab support — PSA, BGS, CGC with certificate verification",
        "Live auctions with auto-extend — no last-second sniping",
        "Pre-orders with deposit — secure releases with 20-30% down",
        "Make-an-offer on any listing — negotiate your price",
        "5-star store review system on every seller",
        "Fast India-wide delivery — 3–7 business days standard",
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(20),
  },

  // ── 12. reviews ──────────────────────────────────────────────────────────
  {
    id: "section-collector-reviews",
    type: "reviews",
    order: 12,
    enabled: true,
    config: {
      title: "What Collectors Are Saying",
      maxReviews: 18,
      itemsPerView: 3,
      mobileItemsPerView: 1,
      autoScroll: true,
      scrollInterval: 5000,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(7),
  },

  // ── 13. stores ───────────────────────────────────────────────────────────
  {
    id: "section-featured-stores",
    type: "stores",
    order: 13,
    enabled: true,
    config: {
      title: "Top Collectibles Stores",
      subtitle: "Browse our verified seller stores — Pokémon, Hot Wheels, Beyblade X, and more",
      maxStores: 5,
      autoScroll: false,
      scrollInterval: 0,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
  },

  // ── 14. events ───────────────────────────────────────────────────────────
  {
    id: "section-upcoming-events",
    type: "events",
    order: 14,
    enabled: true,
    config: {
      title: "Tournaments & Community Events",
      subtitle: "Sales, polls, and collector meetups — stay in the loop",
      maxEvents: 6,
      autoScroll: false,
      scrollInterval: 0,
    },
    createdAt: daysAgo(60),
    updatedAt: daysAgo(4),
  },

  // ── 15. blog-articles ────────────────────────────────────────────────────
  {
    id: "section-collector-blog",
    type: "blog-articles",
    order: 15,
    enabled: true,
    config: {
      title: "Collector's Corner",
      maxArticles: 4,
      showReadTime: true,
      showAuthor: true,
      showThumbnails: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(6),
  },

  // ── 16. whatsapp-community ───────────────────────────────────────────────
  {
    id: "section-whatsapp-community",
    type: "whatsapp-community",
    order: 16,
    enabled: true,
    config: {
      title: "Join the LetiTrip Collectors Community",
      description:
        "Connect with 4,000+ Indian collectors on WhatsApp. Share pulls, get authentication help, trade advice, and be first to know about new drops.",
      groupLink: "https://chat.whatsapp.com/letitrip-collectors",
      memberCount: 4200,
      benefits: [
        "First look at rare listings before they go live",
        "Authentication help from experienced collectors",
        "Live auction alerts for Charizard, Redlines & signed tops",
        "Free giveaways and community events",
      ],
      buttonText: "Join WhatsApp Community",
      testimonial:
        '"The LetiTrip WhatsApp group helped me authenticate a PSA slab within 10 minutes." — Rahul S., Bengaluru',
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(8),
  },

  // ── 17. faq ──────────────────────────────────────────────────────────────
  {
    id: "section-homepage-faq",
    type: "faq",
    order: 17,
    enabled: true,
    config: {
      title: "Frequently Asked Questions",
      subtitle: "Quick answers about buying, selling, and collecting on LetiTrip",
      showOnHomepage: true,
      displayCount: 5,
      expandedByDefault: false,
      linkToFullPage: true,
      categories: ["general", "payment", "shipping"],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
  },

  // ── 18. newsletter ───────────────────────────────────────────────────────
  {
    id: "section-newsletter",
    type: "newsletter",
    order: 18,
    enabled: true,
    config: {
      title: "Get New Drop Alerts",
      description:
        "Be first to know about rare Pokémon listings, Hot Wheels STH drops, Beyblade X imports, and LetiTrip-exclusive auction events.",
      placeholder: "Enter your email address",
      buttonText: "Subscribe",
      privacyText: "We respect your privacy. Unsubscribe anytime.",
      privacyLink: "/privacy",
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(12),
  },

  // ── 19. social-feed (disabled — credentials not yet configured) ───────────
  {
    id: "section-social-feed-instagram",
    type: "social-feed",
    order: 19,
    enabled: false,
    config: {
      title: "LetiTrip on Instagram",
      subtitle: "Follow @letitrip for daily collection showcases and new drop alerts",
      platform: "instagram",
      handle: "letitrip",
      postType: "all",
      count: 9,
      layout: "grid",
      showCaption: true,
      showStats: false,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
];
