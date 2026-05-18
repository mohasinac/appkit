/**
 * Homepage Sections Seed Data — LetItRip Collectibles Platform
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
      title: "LetItRip by the Numbers",
      stats: [
        { key: "products", label: "Listings",         value: "31",   source: "live", metric: "total_listings",   suffix: "+" },
        { key: "sellers",  label: "Verified Sellers", value: "8",    source: "live", metric: "verified_sellers", suffix: "+" },
        { key: "buyers",   label: "Happy Buyers",     value: "10",   source: "live", metric: "total_buyers",     suffix: "+" },
        { key: "rating",   label: "Platform Rating",  value: "4.7★", source: "live", metric: "platform_rating" },
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
      title: "Why Collectors Trust LetItRip",
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
      autoScroll: true,
      scrollInterval: 5000,
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
      autoScroll: true,
      scrollInterval: 5000,
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
      autoScroll: true,
      scrollInterval: 5000,
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
      autoScroll: true,
      scrollInterval: 5000,
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
      autoScroll: true,
      scrollInterval: 6000,
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
      title: "Join the LetItRip Collectors Community",
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
        '"The LetItRip WhatsApp group helped me authenticate a PSA slab within 10 minutes." — Rahul S., Bengaluru',
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
      subtitle: "Quick answers about buying, selling, and collecting on LetItRip",
      showOnHomepage: true,
      displayCount: 8,
      linkToFullPage: true,
      /** Show a category tab bar so visitors can filter by topic */
      showCategoryTabs: true,
      /** Which tabs to surface in display order (leave empty [] to auto-derive from categories) */
      visibleTabs: ["general", "orders_payment", "shipping_delivery", "returns_refunds"],
      /** Allow multiple accordion panels open at once */
      allowMultipleOpen: true,
      /** Number of items expanded on first render (0 = all closed) */
      defaultOpenCount: 100,
      categories: ["general", "orders_payment", "shipping_delivery", "returns_refunds", "product_information"],
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
        "Be first to know about rare Pokémon listings, Hot Wheels STH drops, Beyblade X imports, and LetItRip-exclusive auction events.",
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
      title: "LetItRip on Instagram",
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

  // ── 20. social-feed YouTube (static posts — no API token needed) ──────────
  {
    id: "section-social-feed-youtube",
    type: "social-feed",
    order: 20,
    enabled: false,
    config: {
      title: "LetItRip on YouTube",
      subtitle: "Watch unboxings, collection reviews, and auction replays",
      platform: "youtube",
      handle: "letitrip",
      postType: "all",
      count: 6,
      layout: "grid",
      showCaption: true,
      showStats: false,
      posts: [
        {
          id: "yt-post-001",
          platform: "youtube",
          videoId: "dQw4w9WgXcQ",
          channelName: "LetItRip",
          caption: "Unboxing the rarest Pokémon cards of 2026 — Charizard PSA 10 reveal!",
        },
        {
          id: "yt-post-002",
          platform: "youtube",
          videoId: "ScMzIvxBSi4",
          channelName: "LetItRip",
          caption: "Hot Wheels Super Treasure Hunt hunting at flea markets across Mumbai",
        },
      ],
    },
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },

  // ── 20. featured-bundles (SB11) ──────────────────────────────────────────
  // Enabled — bundles collection live since S4 (SB3 closeout). 3 bundles
  // seeded in bundles-seed-data.ts; section renders them on the homepage.
  {
    id: "section-featured-bundles",
    type: "featured-bundles",
    order: 20,
    enabled: true,
    config: {
      title: "Curated Bundles",
      subtitle: "Everything you need in one deal",
      maxItems: 8,
      sortBy: "savings-desc",
      showSavingsBadge: true,
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // ── 21. prize-draws (SB11) ───────────────────────────────────────────────
  // Enabled — listingType="prize-draw" schema + prizeRevealStatus fields are
  // live (SB1-B). Seed prize-draw product docs ship in S7-PrizeDraws.
  {
    id: "section-prize-draws",
    type: "prize-draws",
    order: 21,
    enabled: true,
    config: {
      title: "Prize Draws",
      subtitle: "Enter for a chance to win rare collectibles",
      maxItems: 6,
      showCountdown: true,
      showEntriesRemaining: true,
      revealStatus: "all",
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // ── 22a. brand-filtered products: Hot Wheels (SB5-D) ─────────────────────
  // Uses the standard `products` section type with a brand filter — no
  // separate "brand-products" type needed (filterByBrand is on the config).
  {
    id: "section-brand-hot-wheels",
    type: "products",
    order: 22,
    enabled: true,
    config: {
      title: "Hot Wheels Spotlight",
      subtitle: "Vintage Redlines, Super TH hunts, and current mainline",
      maxProducts: 12,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 0,
      filterByBrand: "brand-hot-wheels",
      sortBy: "featured",
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // ── 22b. brand-filtered products: Pokémon Company (SB5-D) ────────────────
  {
    id: "section-brand-pokemon",
    type: "products",
    order: 23,
    enabled: true,
    config: {
      title: "Pokémon TCG Hub",
      subtitle: "Latest sets, vintage holos, and PSA-graded slabs",
      maxProducts: 12,
      rows: 2,
      itemsPerRow: 3,
      mobileItemsPerRow: 1,
      autoScroll: false,
      scrollInterval: 0,
      filterByBrand: "brand-pokemon-company",
      sortBy: "featured",
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // ── 24. event-raffles (SB11) ─────────────────────────────────────────────
  // Disabled until events gain hasRaffle flag (S19+).
  {
    id: "section-event-raffles",
    type: "event-raffles",
    order: 24,
    enabled: false,
    config: {
      title: "Live Raffles & Spin Wheels",
      subtitle: "Participate in community events and win prizes",
      maxItems: 4,
      raffleType: "all",
      showEntryCount: true,
      showCountdown: true,
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
];
