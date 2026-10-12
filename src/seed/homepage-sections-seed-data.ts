/*
 * WHY: Seeds the homepage layout — which sections render, in what order, with what copy.
 * WHAT: 22 sections (21 enabled + 1 deliberately disabled), ordered 1..21 contiguously.
 *
 * ORDER follows current marketplace-homepage research rather than the previous
 * arbitrary arrangement: hero → trust → orient (categories) → shop (products,
 * auctions, pre-orders, bundles) → supply (stores) → social proof (reviews) →
 * engage (events, raffles, prize draws) → editorial (blog) → convert (seller
 * banner, newsletter) → reassure (stats, security, community, FAQ, brands).
 *
 * Baymard's finding drives the top: a static hero outperforms a carousel, and
 * the one documented carousel win came from demoting it BELOW a static hero.
 * So `welcome` is first and owns the page's single <h1>; `carousel` sits under
 * it and its slide titles render as <h2>.
 *
 * COPY IS CATALOGUE-NEUTRAL on purpose. "Shop by Category" stays correct
 * however the catalogue changes; "Burst & X Series" goes stale the moment it
 * broadens. Two brand-filtered Beyblade product strips were removed for this
 * reason — and because they filtered the shared 12-item featured set
 * client-side, so they usually rendered empty anyway.
 *
 * 🛑 Every field set here is one the renderer actually READS. Before this pass
 * the seed configured banner buttons, trust indicators, a features list, blog
 * display flags and the entire carousel config, none of which
 * `lib/section-renderer.tsx` forwarded. If you add a field, confirm it reaches
 * a component prop — see the config-coverage check in the plan.
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
import { seedPhoto } from "./_helpers/media";
import { ROUTES } from "../next/routing/route-map";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const homepageSectionsSeedData: Partial<HomepageSectionDocument>[] = [
  // ---- 1. Hero -------------------------------------------------------------
  // Owns the page's single <h1>. Keep it enabled: disabling it while the
  // carousel stays on leaves the document with NO h1 at all.
  {
    id: "section-welcome-hero",
    type: "welcome",
    order: 1,
    enabled: true,
    config: {
      h1: "Buy, Sell & Auction Collectibles",
      subtitle: "Verified sellers, secure payments, and authenticity checks on every listing.",
      description:
        "A marketplace built for collectors — browse thousands of listings, bid in live auctions, reserve upcoming releases, and buy with escrow-backed payments.",
      showCTA: true,
      pillLabel: "Buy, sell & collect",
      ctaText: "Start Shopping",
      ctaLink: String(ROUTES.PUBLIC.PRODUCTS),
      secondaryCtaText: "Browse Auctions",
      secondaryCtaLink: String(ROUTES.PUBLIC.AUCTIONS),
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  // ---- 2. Promo carousel ---------------------------------------------------
  // "medium" rather than "tall": it now sits UNDER a full hero, so a
  // viewport-height band would push everything else below the fold.
  {
    id: "section-hero-carousel",
    type: "carousel",
    order: 2,
    enabled: true,
    config: {
      title: "Featured promotions",
      height: "medium",
      defaultAutoplayDelayMs: 6000,
      pauseOnHover: true,
      showDots: true,
      showArrows: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
  },

  // ---- 3. Trust bar --------------------------------------------------------
  // Moved up from 4. Research: ~80% of attention is above the fold and the
  // first 3–4 trust elements carry nearly all of the lift.
  {
    id: "section-trust-indicators",
    type: "trust-indicators",
    order: 3,
    enabled: true,
    config: {
      title: "Why buyers trust us",
      indicators: [
        {
          id: "trust-authenticity",
          icon: "shield-check",
          title: "Authenticity checked",
          description: "Every seller is verified before their first listing goes live.",
        },
        {
          id: "trust-escrow",
          icon: "lock",
          title: "Escrow-backed payments",
          description: "Your money is held until the item is delivered and accepted.",
        },
        {
          id: "trust-returns",
          icon: "rotate-ccw",
          title: "Straightforward returns",
          description: "Report a problem within the return window and we step in.",
        },
        {
          id: "trust-support",
          icon: "message-circle",
          title: "Real human support",
          description: "Questions about an order reach a person, not a form.",
        },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(20),
  },

  // ---- 4. Orient: categories ----------------------------------------------
  // Baymard's top homepage guideline, and the main internal-linking surface.
  {
    id: "section-collectibles-categories",
    type: "categories",
    order: 4,
    enabled: true,
    config: {
      title: "Shop by Category",
      maxCategories: 8,
      viewMoreLabel: "All categories →",
      autoScroll: false,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
  },

  // ---- 5–8. Shop -----------------------------------------------------------
  // maxItems stays <= 12 everywhere: SSR supplies exactly 12 via
  // getFeatured*(12), so a larger cap would promise rows that cannot fill.
  {
    id: "section-featured-products",
    type: "products",
    order: 5,
    enabled: true,
    config: {
      title: "Featured Products",
      subtitle: "Hand-picked listings from verified sellers.",
      maxItems: 12,
      viewMoreLabel: "View all products →",
      rows: 1,
      autoScroll: false,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },

  {
    id: "section-live-auctions",
    type: "auctions",
    order: 6,
    enabled: true,
    config: {
      title: "Live Auctions",
      subtitle: "Bidding open now — place yours before the timer runs out.",
      maxAuctions: 12,
      viewMoreLabel: "View all auctions →",
      rows: 1,
      autoScroll: false,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },

  {
    id: "section-pre-orders",
    type: "pre-orders",
    order: 7,
    enabled: true,
    config: {
      title: "Reserve Before It Ships",
      subtitle: "Lock in upcoming releases with a deposit.",
      maxItems: 12,
      viewMoreLabel: "View all pre-orders →",
      rows: 1,
      autoScroll: false,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3),
  },

  {
    id: "section-featured-bundles",
    type: "featured-bundles",
    order: 8,
    enabled: true,
    config: {
      title: "Curated Bundles",
      subtitle: "Multiple items, one discounted price.",
      maxItems: 8,
      showSavingsBadge: true,
      viewMoreLabel: "View all bundles →",
    },
    createdAt: daysAgo(60),
    updatedAt: daysAgo(4),
  },

  // ---- 9. Supply side ------------------------------------------------------
  {
    id: "section-featured-stores",
    type: "stores",
    order: 9,
    enabled: true,
    config: {
      title: "Featured Stores",
      subtitle: "Sellers with a track record collectors rate highly.",
      maxStores: 8,
      viewMoreLabel: "View all stores →",
      autoScroll: false,
      scrollInterval: 6000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(8),
  },

  // ---- 10. Social proof ----------------------------------------------------
  {
    id: "section-collector-reviews",
    type: "reviews",
    order: 10,
    enabled: true,
    config: {
      title: "What Buyers Say",
      maxReviews: 12,
      itemsPerView: 3,
      mobileItemsPerView: 1,
      viewMoreLabel: "See all reviews →",
      autoScroll: true,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(6),
  },

  // ---- 11–13. Engage -------------------------------------------------------
  {
    id: "section-upcoming-events",
    type: "events",
    order: 11,
    enabled: true,
    config: {
      title: "Events & Offers",
      subtitle: "Sales, giveaways and community events running now.",
      maxEvents: 6,
      viewMoreLabel: "View all events →",
      autoScroll: false,
      scrollInterval: 6000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(7),
  },

  {
    id: "section-event-raffles",
    type: "event-raffles",
    order: 12,
    enabled: true,
    config: {
      title: "Raffles & Spin Wheels",
      subtitle: "Enter for free and see if the odds are with you.",
      maxItems: 6,
      raffleType: "all",
      showEntryCount: true,
      showCountdown: true,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(3),
  },

  {
    id: "section-prize-draws",
    type: "prize-draws",
    order: 13,
    enabled: true,
    config: {
      title: "Prize Draws",
      subtitle: "Buy an entry for a shot at something rare.",
      maxItems: 6,
      // "open" is deliberate — a closed draw is not enterable, so surfacing it
      // on the homepage would be an invitation to a dead end.
      revealStatus: "open",
      showCountdown: true,
      showEntriesRemaining: true,
    },
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
  },

  // ---- 14. Editorial -------------------------------------------------------
  {
    id: "section-collector-blog",
    type: "blog-articles",
    order: 14,
    enabled: true,
    config: {
      title: "From Our Blog",
      maxArticles: 6,
      viewMoreLabel: "View all posts →",
      showReadTime: true,
      showAuthor: true,
      showThumbnails: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(12),
  },

  // ---- 15. Seller CTA ------------------------------------------------------
  // Same document as the old "Beyblade banner", re-purposed. The id keeps its
  // stale name on purpose: renaming it would create a fresh document and orphan
  // whatever an admin has already edited on this one.
  {
    id: "section-beyblade-banner",
    type: "banner",
    order: 15,
    enabled: true,
    config: {
      height: "md",
      backgroundImage: seedPhoto("marketplace-seller-banner", 1600, 500),
      content: {
        title: "Have collectibles to sell?",
        subtitle: "Open a store in minutes.",
        description:
          "List for free, reach collectors across the country, and get paid on a predictable schedule.",
      },
      buttons: [
        { text: "Start selling →", link: String(ROUTES.PUBLIC.SELLER_GUIDE), variant: "primary" },
        { text: "Browse the marketplace", link: String(ROUTES.PUBLIC.PRODUCTS), variant: "outline" },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(9),
  },

  // ---- 16. Newsletter ------------------------------------------------------
  // Inline with a real reason to subscribe, not an overlay — 59% of sites do
  // overlay signup badly, per Baymard.
  {
    id: "section-newsletter",
    type: "newsletter",
    order: 16,
    enabled: true,
    config: {
      title: "Get new listings first",
      description:
        "One email a week: fresh drops, auctions closing soon, and price cuts on your saved categories.",
      privacyText: "We never share your address. Unsubscribe in one click.",
      privacyLink: String(ROUTES.PUBLIC.PRIVACY),
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(14),
  },

  // ---- 17–21. Reassure -----------------------------------------------------
  // Stats moved DOWN from 3rd. Numbers are corroboration for a visitor who is
  // already interested; they answer no question a first-time visitor is asking
  // at the top of the page.
  {
    id: "section-platform-stats",
    type: "stats",
    order: 17,
    enabled: true,
    config: {
      title: "By the numbers",
      stats: [
        { key: "products", label: "Listings", value: "200", source: "live", metric: "total_listings", suffix: "+" },
        { key: "sellers", label: "Verified Sellers", value: "8", source: "live", metric: "verified_sellers", suffix: "+" },
        { key: "reviews", label: "Buyer Reviews", value: "35", source: "live", metric: "total_reviews", suffix: "+" },
        { key: "orders", label: "Orders Completed", value: "50", source: "live", metric: "total_orders", suffix: "+" },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(15),
  },

  {
    id: "section-platform-features",
    type: "features",
    order: 18,
    enabled: true,
    config: {
      title: "Security You Can Trust",
      pillLabel: "Built for trust",
      learnMoreLabel: "Learn about our security →",
      learnMoreLink: String(ROUTES.PUBLIC.SECURITY),
      items: [
        {
          key: "escrow",
          title: "Escrow on every order",
          description: "Funds reach the seller only after the item is delivered and accepted.",
        },
        {
          key: "verified-sellers",
          title: "Verified sellers only",
          description: "Identity and payout details are checked before a store can publish.",
        },
        {
          key: "scam-registry",
          title: "Public scam registry",
          description: "Reported bad actors are recorded so buyers can check before they pay.",
        },
        {
          key: "encrypted-data",
          title: "Encrypted personal data",
          description: "Addresses, phone numbers and payout details are encrypted at rest.",
        },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(11),
  },

  {
    id: "section-whatsapp-community",
    type: "whatsapp-community",
    order: 19,
    enabled: true,
    config: {
      title: "Join the community",
      description: "Deal alerts, auction reminders, and early access to drops.",
      // Keep this link verbatim — a tester-checklist case asserts it.
      groupLink: "https://chat.whatsapp.com/",
      benefits: [
        "Deal alerts before they hit the homepage",
        "Reminders when auctions you watch are closing",
        "Early access to limited drops",
        "Direct line to the team for order questions",
      ],
      buttonText: "Join the group",
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(13),
  },

  {
    id: "section-homepage-faq",
    type: "faq",
    order: 20,
    enabled: true,
    config: {
      title: "Frequently Asked Questions",
      subtitle: "The questions new buyers ask most.",
      showOnHomepage: true,
      /*
       * B6b — 6 → 10. The FAQ block is the densest single SEO win on the page
       * (worldhobbyshop's 10-question block is a measured part of why it leads
       * the fifteen on SEO) and it is an answer-engine surface, so it feeds
       * `faqJsonLd`. 20 rows are flagged `showOnHomepage`; showing 10 of them
       * is the intended shape.
       */
      displayCount: 10,
      linkToFullPage: true,
      viewMoreLabel: "View all FAQs →",
      showCategoryTabs: true,
      /*
       * 🛑 EMPTY ON PURPOSE — the tabs DERIVE from the items actually shown.
       *
       * This listed `["shipping_delivery", "returns_refunds",
       * "orders_payment"]` and measured live on 2026-10-12 **all three
       * rendered EMPTY PANELS**, while the three categories whose rows were
       * actually displayed (`general`, `product_information`,
       * `fees_and_taxes`) had no tab at all.
       *
       * The cause is that the two halves answer different questions and
       * neither knows about the other: the ITEMS come from
       * `getHomepageFAQs()` — `showOnHomepage` ordered by `priority` DESC,
       * then sliced to `displayCount` — while the TABS were a hand-written
       * list. Raise a row's priority, or add a higher-priority row in another
       * category (B6b's FAQ half added 22, including a whole new
       * `fees_and_taxes`), and the slice moves out from under the tabs
       * silently. That is Root Cause #72's shape: a tab you can click with
       * nothing behind it.
       *
       * `FAQSection` already derives tabs from its items when `tabs` is empty
       * (`if (tabsProp && tabsProp.length > 0) return tabsProp;`), so an empty
       * array makes an empty tab STRUCTURALLY IMPOSSIBLE rather than something
       * to re-sync by hand. A hand-maintained enumeration beside a query is
       * the defect, not the list's contents.
       *
       * 🛑 `[]` rather than deleting the key, because `appkit-seed load` is a
       * MERGE write and cannot remove a field — dropping it from the seed
       * would leave the three stale values in Firestore forever and the fix
       * would read as applied while changing nothing.
       */
      visibleTabs: [],
      allowMultipleOpen: false,
      defaultOpenCount: 1,
      /*
       * 🛑 NOT a filter, despite the name. The renderer uses this ONLY as a
       * fallback tab list when `visibleTabs` is empty
       * (`cfg?.visibleTabs?.length ? cfg.visibleTabs : cfg?.categories`), and
       * the items are never filtered by it. So a category absent from here is
       * still displayed — which is why `fees_and_taxes` rows appear on the
       * homepage today while being absent from this list.
       *
       * Emptied too, or it would simply become the hand-written tab list this
       * change exists to delete.
       */
      categories: [],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(16),
  },

  {
    id: "section-top-brands",
    type: "brands",
    order: 21,
    enabled: true,
    config: {
      title: "Top Brands",
      subtitle: "Browse by the makers collectors look for.",
      maxBrands: 12,
      viewMoreLabel: "All brands →",
      autoScroll: false,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(18),
  },

  // ---- Disabled ------------------------------------------------------------
  // Kept, NOT deleted: the tester case `sections-social-feed-hidden` asserts a
  // disabled section does not render, and deleting the document would make that
  // case untestable rather than passing.
  {
    id: "section-social-feed-instagram",
    type: "social-feed",
    order: 22,
    enabled: false,
    config: {
      title: "Follow along",
      subtitle: "New arrivals and community highlights.",
      platform: "instagram",
      handle: "letitrip.in",
      postType: "all",
      count: 9,
      layout: "grid",
      showCaption: true,
      showStats: false,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(25),
  },

  /*
   * REMOVED — `section-brand-takara-tomy` and `section-brand-beyblade`.
   *
   * Both were `products` sections with a `filterByBrand`. All three products
   * sections share ONE `getFeaturedProducts(12)` result and the brand filter is
   * applied client-side, so each strip filtered the same twelve rows and
   * usually rendered empty. They were also the most catalogue-specific thing on
   * the page.
   *
   * 🛑 `appkit-seed load` UPSERTS and never deletes. Dropping them from this
   * array does not remove them from Firestore — delete both documents at
   * /admin/sections after seeding, or they keep rendering.
   */
  /*
   * ── B6b — THE SYSTEMS MATRIX ─────────────────────────────────────────────
   *
   * worldhobbyshop's single biggest SEO asset, and it is TAXONOMY ROUTING
   * rather than merchandising: 25 internal links telling a crawler which
   * sub-collections exist. It is most of why they have 79 unique internal
   * links (BAS has 57) while running the FEWEST products and words on their
   * homepage of the fifteen crawled — 8 product cards and 1,816 words.
   *
   * 🛑 `custom-cards`, NOT `collection-cards`, and the plan had this wrong.
   * `collection-cards` is capped at `COLLECTION_CARDS_MAX_ENTRIES = 3` and its
   * entries are LIVE-CONTENT queries (`{type, limit, categorySlug}`), so it
   * cannot express a link matrix at all. `custom-cards` carries
   * `cards[].buttons[]` of `{label, href}`, which is exactly a matrix.
   *
   * 🛑 Every href is a REAL post-B5 category id, read off `categoriesSeedData`
   * rather than typed from memory. A dead link here is the Root Cause #33
   * shape on the routing axis — it 404s, and `audit-nav-page-wiring` does not
   * reach section configs.
   *
   * No prices anywhere, which is what makes this safe where a price-band tile
   * is not — see the note below the array.
   */
  {
    id: "section-systems-matrix",
    type: "custom-cards",
    order: 5,
    enabled: true,
    config: {
      title: "Every system, every part family",
      layout: "grid",
      columns: 4,
      autoScroll: false,
      loop: false,
      cards: [
        {
          id: "matrix-original",
          eyebrow: "1999–2003",
          title: "Beyblade Original",
          body: "Four part systems in four years, and they do not interchange. Plastic Generation through Heavy Metal System.",
          buttons: [
            { label: "Plastic Generation", href: "/categories/category-original-plastic-gen", variant: "ghost" as const },
            { label: "Spin Gear", href: "/categories/category-original-spin-gear", variant: "ghost" as const },
            { label: "Magnacore", href: "/categories/category-original-magnacore", variant: "ghost" as const },
            { label: "Engine Gear", href: "/categories/category-original-engine-gear", variant: "ghost" as const },
            { label: "Heavy Metal System", href: "/categories/category-original-hms", variant: "ghost" as const },
            { label: "Parts", href: "/categories/category-original-parts", variant: "outline" as const },
            { label: "Launchers", href: "/categories/category-original-launchers", variant: "outline" as const },
          ],
        },
        {
          id: "matrix-metal",
          eyebrow: "2008–2013",
          title: "Metal Fight",
          body: "The tuning era, and the only generation where loose parts outnumber complete tops.",
          buttons: [
            { label: "Metal System", href: "/categories/category-metal-phws", variant: "ghost" as const },
            { label: "Metal Fusion", href: "/categories/category-metal-fusion", variant: "ghost" as const },
            { label: "Metal Masters", href: "/categories/category-metal-masters", variant: "ghost" as const },
            { label: "Metal Fury (4D)", href: "/categories/category-metal-fury-4d", variant: "ghost" as const },
            { label: "Shogun Steel", href: "/categories/category-metal-shogun-steel", variant: "ghost" as const },
            { label: "Parts", href: "/categories/category-metal-parts", variant: "outline" as const },
            { label: "Launchers", href: "/categories/category-metal-launchers", variant: "outline" as const },
          ],
        },
        {
          id: "matrix-burst",
          eyebrow: "2015–2023",
          title: "Beyblade Burst",
          body: "Seven waves of the bursting mechanic, from single-layer Classic to Burst Ultimate.",
          buttons: [
            { label: "Burst Classic", href: "/categories/category-burst-classic", variant: "ghost" as const },
            { label: "Burst God", href: "/categories/category-burst-god", variant: "ghost" as const },
            { label: "Cho-Z", href: "/categories/category-burst-cho-z", variant: "ghost" as const },
            { label: "GT", href: "/categories/category-burst-gt", variant: "ghost" as const },
            { label: "Superking", href: "/categories/category-burst-superking", variant: "ghost" as const },
            { label: "Dynamite Battle", href: "/categories/category-burst-db", variant: "ghost" as const },
            { label: "Burst Ultimate", href: "/categories/category-burst-bu", variant: "ghost" as const },
            { label: "Parts", href: "/categories/category-burst-parts", variant: "outline" as const },
          ],
        },
        {
          id: "matrix-x",
          eyebrow: "2023–",
          title: "Beyblade X",
          body: "The Xtreme Line rail is the centre of the design — blades, ratchets and bits, and a stadium that is part of the game.",
          buttons: [
            { label: "Basic Line", href: "/categories/category-x-basic", variant: "ghost" as const },
            { label: "Unique Line (UX)", href: "/categories/category-x-unique-ux", variant: "ghost" as const },
            { label: "Custom Line (CX)", href: "/categories/category-x-custom-cx", variant: "ghost" as const },
            { label: "X-Over Project", href: "/categories/category-x-over", variant: "ghost" as const },
            { label: "Parts", href: "/categories/category-x-parts", variant: "outline" as const },
            { label: "Launchers", href: "/categories/category-x-launchers", variant: "outline" as const },
            { label: "Stadiums", href: "/categories/category-x-stadiums", variant: "outline" as const },
          ],
        },
      ],
    },
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  /*
   * 🛑 TCI's five BUDGET TILES ("Under ₹499 / ₹799 / ₹999 / ₹1499") are
   * DELIBERATELY NOT SEEDED, and this is a decision rather than an omission.
   *
   * The plan argued they are safe because "the tiles are LINKS, not prices".
   * That is true of the tile and false of the mechanism. Prices are hidden from
   * signed-out visitors, and the price-range facet and every money sort are
   * withheld specifically because "hiding the number is not hiding the value" —
   * bracketing a hidden price with a range filter is the one casually reachable
   * way around the gate. The documented residue is that a HAND-WRITTEN
   * `?f=price<499` still works, and five tiles on the homepage promote that
   * residue to the most prominent path on the site: a guest could bucket the
   * entire catalogue into five price bands in five clicks, without an account.
   *
   * The matrix above has no such property — a category link reveals no amount.
   * Revisit if guest price-gating is ever relaxed; until then this is a tile
   * that would quietly undo a gate another step built.
   */
];
