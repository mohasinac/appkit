/*
 * WHY: Seeds all homepage sections for LetItRip collectibles marketplace — defines the homepage layout and content.
 * WHAT: 24 sections covering welcome, carousel, stats, trust, categories, brands, products, auctions, pre-orders, banner, features, reviews, stores, events, blog, whatsapp, faq, newsletter, social, bundles, prize-draws, brand-filtered, event-raffles.
 *
 * EXPORTS:
 *   homepageSectionsSeedData — Array of Partial<HomepageSectionDocument> for seed runner
 *
 * @tag domain:homepage
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { HomepageSectionDocument } from "../features/homepage/schemas";
import { seedExtMedia } from "./_helpers/media";
import { ROUTES } from "../next/routing/route-map";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const homepageSectionsSeedData: Partial<HomepageSectionDocument>[] = [
  {
    id: "section-welcome-hero",
    type: "welcome",
    order: 1,
    enabled: true,
    config: {
      h1: "India's Largest Collectibles Marketplace",
      subtitle: "Trading Cards · Action Figures · Diecast · Spinning Tops · Model Kits · Vintage Rare",
      description: "Buy, sell, and auction collectibles from verified sellers across India — action figures, trading cards, spinning tops, model kits, and thousands more — all with secure escrow payments and authenticity guarantees.",
      showCTA: true,
      ctaText: "Start Shopping",
      ctaLink: String(ROUTES.PUBLIC.PRODUCTS),
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-hero-carousel",
    type: "carousel",
    order: 2,
    enabled: true,
    config: { title: "Hero Carousel", height: "tall", pauseOnHover: true, showDots: true, showArrows: true },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
  },

  {
    id: "section-platform-stats",
    type: "stats",
    order: 3,
    enabled: true,
    config: {
      title: "LetItRip by the Numbers",
      stats: [
        { key: "products", label: "Listings", value: "200", source: "live", metric: "total_listings", suffix: "+" },
        { key: "sellers", label: "Verified Sellers", value: "8", source: "live", metric: "verified_sellers", suffix: "+" },
        { key: "reviews", label: "Collector Reviews", value: "35", source: "live", metric: "total_reviews", suffix: "+" },
        { key: "orders", label: "Orders Completed", value: "50", source: "live", metric: "total_orders", suffix: "+" },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(15),
  },

  {
    id: "section-trust-indicators",
    type: "trust-indicators",
    order: 4,
    enabled: true,
    config: {
      title: "Why Collectors Trust LetItRip",
      indicators: [
        { id: "trust-verified", icon: "shield-check", title: "Verified Sellers", description: "Every seller is manually verified. Listings reviewed for authenticity." },
        { id: "trust-escrow", icon: "lock", title: "Escrow Payment", description: "Payment held in escrow until you confirm delivery. Zero risk." },
        { id: "trust-returns", icon: "arrow-path", title: "Easy Returns", description: "Seller return policies cover all product types. Platform mediates disputes." },
        { id: "trust-authentic", icon: "badge-check", title: "Authenticity Guarantee", description: "Counterfeit items: full refund + seller suspension. Zero tolerance." },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(12),
  },

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
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-top-brands",
    type: "brands",
    order: 6,
    enabled: true,
    config: {
      title: "Top Collectibles Brands",
      subtitle: "Takara-Tomy, Beyblade, and more",
      maxBrands: 13,
      autoScroll: true,
      scrollInterval: 3000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-featured-products",
    type: "products",
    order: 7,
    enabled: true,
    config: {
      title: "Featured Collectibles",
      subtitle: "Hand-picked by our team — rare cards, exclusive figures, vintage finds",
      maxProducts: 18,
      rows: 2,
      itemsPerRow: 4,
      mobileItemsPerRow: 2,
      autoScroll: true,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

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
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-pre-orders",
    type: "pre-orders",
    order: 9,
    enabled: true,
    config: {
      title: "Reserve Before It Ships",
      subtitle: "Secure upcoming releases with a deposit — cards, figures, kits, and more",
      maxItems: 18,
      rows: 2,
      itemsPerRow: 4,
      mobileItemsPerRow: 2,
      autoScroll: true,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-beyblade-banner",
    type: "banner",
    order: 10,
    enabled: true,
    config: {
      height: "md",
      backgroundImage: seedExtMedia("https://picsum.photos/seed/section-banner-beyblade-collection-20260101/1600/500"),
      content: {
        title: "Complete Your Beyblade Collection",
        subtitle: "All 4 generations available — Original to Beyblade X",
        description: "From the original 1999 series to the latest Xtreme Gear generation, find every era of Beyblade on LetItRip.",
      },
      buttons: [
        { text: "Shop Beyblade", link: `${String(ROUTES.PUBLIC.PRODUCTS)}?q=beyblade`, variant: "primary" },
        { text: "Beyblade Guide", link: "/blog/beyblade-x-vs-burst-comparison", variant: "outline" },
      ],
      clickable: false,
    },
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
  },

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
        "Pre-orders with deposit — secure releases with 20–30% down",
        "Make-an-offer on any listing — negotiate your price",
        "5-star store review system on every seller",
        "Fast India-wide delivery — 3–7 business days standard",
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(20),
  },

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
      scrollInterval: 4000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-featured-stores",
    type: "stores",
    order: 13,
    enabled: true,
    config: {
      title: "Verified Stores",
      subtitle: "Browse our verified seller stores across all collectible categories",
      maxStores: 8,
      autoScroll: true,
      scrollInterval: 4000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-upcoming-events",
    type: "events",
    order: 14,
    enabled: true,
    config: {
      title: "Tournaments & Community Events",
      subtitle: "Polls, raffles, sales, and spin wheels — join the fun",
      maxEvents: 6,
      autoScroll: true,
      scrollInterval: 6000,
      loop: true,
    },
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
  },

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
    updatedAt: daysAgo(2),
  },

  {
    id: "section-whatsapp-community",
    type: "whatsapp-community",
    order: 16,
    enabled: true,
    config: {
      title: "Join the LetItRip Collectors Community",
      description: "Connect with Indian collectors on WhatsApp. Share pulls, get authentication help, and be first to know about new drops.",
      // Real invite. The previous value ("…/letitrip-collectors") was not a valid
      // WhatsApp invite code, so the homepage CTA opened a dead link. Stored
      // canonical — the ?s=/&p=/&mlu= params on a shared link are share-sheet
      // attribution from the copying device, not part of the invite.
      groupLink: "https://chat.whatsapp.com/JOlbdSwhVWYDKujolcBZDr",
      memberCount: 1200,
      benefits: [
        "First look at rare listings before they go live",
        "Authentication help from experienced collectors",
        "Live auction alerts for trending collectibles",
        "Free giveaways and community events",
      ],
      buttonText: "Join WhatsApp Community",
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(8),
  },

  {
    id: "section-homepage-faq",
    type: "faq",
    order: 17,
    enabled: true,
    config: {
      title: "Frequently Asked Questions",
      subtitle: "Quick answers about buying, selling, and collecting on LetItRip",
      showOnHomepage: true,
      displayCount: 16,
      linkToFullPage: true,
      showCategoryTabs: true,
      visibleTabs: ["general", "shipping_delivery", "returns_refunds", "orders_payment", "product_information", "account_security"],
      allowMultipleOpen: true,
      defaultOpenCount: 100,
      categories: ["general", "shipping_delivery", "returns_refunds", "orders_payment", "product_information", "account_security", "technical_support"],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-newsletter",
    type: "newsletter",
    order: 18,
    enabled: true,
    config: {
      title: "Get New Drop Alerts",
      description: "Be first to know about rare listings, auction events, and upcoming releases on LetItRip.",
      placeholder: "Enter your email address",
      buttonText: "Subscribe",
      privacyText: "We respect your privacy. Unsubscribe anytime.",
      privacyLink: String(ROUTES.PUBLIC.PRIVACY),
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(12),
  },

  {
    id: "section-social-feed-instagram",
    type: "social-feed",
    order: 19,
    enabled: false,
    config: { title: "LetItRip on Instagram", subtitle: "Follow @letitrip for daily showcases", platform: "instagram", handle: "letitrip", postType: "all", count: 9, layout: "grid", showCaption: true, showStats: false },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },

  {
    id: "section-featured-bundles",
    type: "featured-bundles",
    order: 20,
    enabled: true,
    config: {
      title: "Curated Bundles",
      subtitle: "Save big on card bundles, figure sets, and sealed collections",
      maxItems: 8,
      sortBy: "savings-desc",
      showSavingsBadge: true,
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

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
      // "all" until 2026-08-24, which is why a closed, already-revealed draw
      // sat on the homepage advertising entries nobody could buy. "all" is
      // still a valid choice — it builds an archive strip — but it is not what
      // a "Prize Draws" strip on the homepage means.
      revealStatus: "open",
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-brand-takara-tomy",
    type: "products",
    order: 22,
    enabled: true,
    config: {
      title: "Takara-Tomy Official Products",
      subtitle: "Authentic Takara-Tomy Beyblades, direct from Japan",
      maxProducts: 12,
      rows: 2,
      itemsPerRow: 4,
      mobileItemsPerRow: 2,
      autoScroll: true,
      scrollInterval: 5000,
      loop: true,
      filterByBrand: "brand-takara-tomy",
      sortBy: "featured",
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-brand-beyblade",
    type: "products",
    order: 23,
    enabled: true,
    config: {
      title: "Beyblade Brand Spotlight",
      subtitle: "Original, Metal Fight, Burst, and X — every generation",
      maxProducts: 12,
      rows: 2,
      itemsPerRow: 4,
      mobileItemsPerRow: 2,
      autoScroll: true,
      scrollInterval: 5000,
      loop: true,
      filterByBrand: "brand-beyblade",
      sortBy: "featured",
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  {
    id: "section-event-raffles",
    type: "event-raffles",
    order: 24,
    enabled: true,
    config: {
      title: "Live Raffles & Spin Wheels",
      subtitle: "Participate in community events and win rare collectibles",
      maxItems: 4,
      raffleType: "all",
      showEntryCount: true,
      showCountdown: true,
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
];
