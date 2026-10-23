/*
 * WHY: Seeds the homepage layout — which sections render, in what order, with what copy.
 * WHAT: 27 sections (22 enabled + 5 deliberately disabled), ordered 1..27 contiguously.
 *
 * 🛑 CHANGED 2026-10-21: `section-shop-extras` was INSERTED at 10, which
 * pushed every section from the old 10 onward down one. An insert is a
 * RENUMBER, never a single write — writing the new row at 10 alone put it
 * beside `section-featured-stores`, and two sections on one order makes the
 * running order alphabetical by accident (see the unique-and-contiguous note
 * below, which this reproduced within the hour of citing it).
 *
 * `section-systems-matrix` also moved 8 → 5 at the owner's request, to sit
 * directly under pre-orders; carousel/trust/categories each took one step
 * down to keep the range contiguous.
 *
 * 🛑 Four of those five were disabled on 2026-10-20 — auctions (3),
 * featured-bundles (9), event-raffles (13) and prize-draws (14) — each with its
 * own note on the switch that did it. A disabled row KEEPS its order slot, so
 * the range stays contiguous and re-enabling one puts it back where it was
 * rather than at the end.
 *
 * 🛑 TWO OF THOSE SWAPPED ON 2026-10-21, so the count is unchanged and the
 * MEMBERSHIP is not: `featured-bundles` (9) came back ON — five real bundles
 * now exist, and its site-settings lock was flipped with it — while
 * `collector-reviews` (11) went OFF, because the `reviews` collection is
 * empty and a rail headed "What Buyers Say" over blank space is a claim the
 * page cannot support.
 *
 * The rule both decisions follow: a section is enabled when its collection
 * can fill it, and that is COUNTED rather than assumed —
 * `scripts/push-editorial-content.mjs` re-derives it from live counts, so
 * neither flag is a standing opinion about what the catalogue holds.
 * `google-reviews` is a REGISTERED type with no document — see the note
 * beside the deliberate budget-tile omission below for why.
 *
 * `how-it-works` (25) and `promo-grid` (26) were in that same unseeded set and
 * were SEEDED 2026-10-20, on the terms the rule always allowed: there is now
 * real copy for them. How-it-works quotes the three-tier authenticity policy
 * the carousel already leads with; promo-grid routes to the four generation
 * categories using the same `/media/` covers those categories use. Neither
 * invents a claim. `testimonials` stays unseeded — the site has never had a
 * customer, so every quote would be fabricated.
 *
 * 🛑 That count and range are ASSERTED, not described — `order` must stay unique
 * and contiguous. Until 2026-10-19 this header read "22 sections … 1..21" while
 * the file held 23 documents numbered 1..22, and `section-systems-matrix` and
 * `section-featured-products` BOTH claimed `order: 5`. `MarketplaceHomepageView`
 * tie-breaks on `updatedAt` (identical for both) and then `id.localeCompare`, so
 * the live running order of the homepage was decided alphabetically — a silent
 * accident, not a layout decision. The 24th document (`collection-cards`,
 * added the same day) closed the other half of that finding: a registered
 * section type with a renderer and zero seeded rows is the same class of gap,
 * just silent rather than colliding.
 *
 * ORDER: hero → SHOP (products, auctions, pre-orders) → carousel → trust →
 * orient (categories, systems matrix) → shop cont. (bundles) → supply
 * (stores) → social proof (reviews) → engage (events, raffles, prize draws) →
 * editorial (blog) → convert (seller banner, newsletter) → reassure (stats,
 * security, community, FAQ, brands).
 *
 * 🛑 Products (2), auctions (3) and pre-orders (4) were lifted above the
 * carousel on 2026-10-20 at the owner's request — real merchandise directly
 * under the hero, promotions below it. That OVERRIDES the research arrangement
 * this header used to describe (trust → orient → shop), so do not "restore"
 * the old order on the strength of the paragraphs below; they explain the
 * reasoning for the sections that are still in a research-driven position,
 * not a mandate for the three that were deliberately moved. Pre-orders came
 * up from 8 in a second pass, which is why the carousel/trust/categories/
 * matrix block reads 5 → 8 rather than 4 → 7.
 *
 * The systems matrix still sits immediately after the generation tiles (7 → 8)
 * because that is where the measured leader puts it: on worldhobbyshop
 * "Browse Beyblade Systems & Series" (25 text links) follows "Shop Beyblades
 * by Generation" (6 image tiles) — taxonomy routing stays together. See
 * docs/research/competitor-crawl-2026-10/layout.md.
 *
 * Baymard's finding still drives the hero: a static hero outperforms a
 * carousel, and the one documented carousel win came from demoting it BELOW a
 * static hero. So `welcome` is first and owns the page's single <h1>; the
 * `carousel` is now demoted further still, under the first three product
 * rails, and its slide titles render as <h2>.
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
      /*
       * 🛑 NO AUCTIONS IN THE HERO, and nothing else that the site does not
       * currently do.
       *
       * The h1 read "Buy, Sell & Auction Collectibles" and the second CTA sent
       * visitors to /auctions — which `listings.listingTypes.auction: false`
       * now switches off (2026-10-20). The first screen of the site is the
       * worst place to advertise a type whose browse page returns nothing.
       *
       * The description lost "bid in live auctions" for the same reason, and
       * "escrow-backed payments" because that claim was withdrawn from the
       * seller guide and the Become-a-Seller copy on the same day.
       *
       * ⚠️ This is SEED data. The live hero is a `homepageSections` document and
       * is NOT rewritten by editing this file — change it in the admin
       * homepage-sections editor, or re-seed.
       */
      /*
       * 🛑 The h1 carries the head term. Changed 2026-10-24.
       *
       * It read "Buy & Sell Collectibles" — four words, no "Beyblade", no
       * "India" — on the one page Google actually ranks for "beyblade india"
       * (position ~21 when measured). 100% of the live catalogue is Beyblade,
       * so the page was describing a shop that does not exist while the shop
       * that does went unnamed.
       *
       * Hybrid on purpose: the marketplace identity stays, the head term
       * leads. Matches the title/description in appkit.config.js — the three
       * must say the same thing or Google picks its own.
       */
      h1: "Buy Beyblade in India",
      subtitle:
        "Beyblade X, Burst and Metal Fight tops, spares, launchers and stadiums — verified sellers, authenticity stated on every listing.",
      description:
        "A marketplace built for collectors — browse thousands of listings, reserve upcoming releases, and buy with secure, verified payments.",
      showCTA: true,
      pillLabel: "Buy, sell & collect",
      ctaText: "Start Shopping",
      ctaLink: String(ROUTES.PUBLIC.PRODUCTS),
      secondaryCtaText: "Explore Categories",
      secondaryCtaLink: String(ROUTES.PUBLIC.CATEGORIES),
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  },

  // ---- 5. Promo carousel ---------------------------------------------------
  // "medium" rather than "tall": it now sits UNDER a full hero, so a
  // viewport-height band would push everything else below the fold.
  {
    id: "section-hero-carousel",
    type: "carousel",
    order: 6,
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

  // ---- 6. Trust bar --------------------------------------------------------
  // Research: ~80% of attention is above the fold and the first 3–4 trust
  // elements carry nearly all of the lift.
  {
    id: "section-trust-indicators",
    type: "trust-indicators",
    order: 7,
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
          // Was "Escrow-backed payments". The escrow claim was withdrawn from
          // the seller guide, the Become-a-Seller copy and the hero description
          // on 2026-10-20; a trust badge is the last place it should have
          // survived, because it is the claim a buyer is most likely to rely
          // on. The `id` is deliberately unchanged — it is this seed document's
          // identity, not its copy.
          id: "trust-escrow",
          icon: "lock",
          title: "Secure payments",
          description: "Your money reaches the seller after the item is delivered and accepted.",
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

  // ---- 7. Orient: categories ----------------------------------------------
  // Baymard's top homepage guideline, and the main internal-linking surface.
  {
    id: "section-collectibles-categories",
    type: "categories",
    order: 8,
    enabled: true,
    config: {
      title: "Shop by Category",
      /*
       * 6, from the `categories-generation-tiles` SECTION_TEMPLATE — and 6 is a
       * measured number, not a round one: worldhobbyshop's "Shop Beyblades by
       * Generation" is exactly six tiles (Beyblade X, Burst, Metal, Plastic
       * Generation, Launchers & Grips, Stadiums & Arenas), 3 columns at 1280 and
       * 1 at 390. See docs/research/competitor-crawl-2026-10/layout.md.
       */
      maxCategories: 6,
      viewMoreLabel: "All categories →",
      autoScroll: false,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
  },

  // ---- 2–4, 9. Shop --------------------------------------------------------
  // Products (2), auctions (3) and pre-orders (4) sit directly under the hero,
  // ABOVE the carousel — a merchandising-first top of page, asked for
  // 2026-10-20. Bundles (9) stay below the orientation band.
  //
  // maxItems stays <= 12 everywhere: SSR supplies exactly 12 via
  // getFeatured*(12), so a larger cap would promise rows that cannot fill.
  {
    id: "section-featured-products",
    type: "products",
    order: 2,
    enabled: true,
    config: {
      title: "Featured Products",
      subtitle: "Hand-picked listings from verified sellers.",
      /*
       * 8, from the `products-recently-added` SECTION_TEMPLATE, which took it
       * from worldhobbyshop's one product rail — measured 2026-10-19 at exactly
       * 8 cards, 4 columns (docs/research/competitor-crawl-2026-10/layout.md).
       * The SEO leader ships the fewest products on its homepage; its advantage
       * is taxonomy routing, not merchandising volume.
       *
       * Safe against the `<= 12` rule above: SSR still supplies 12 via
       * getFeatured*(12) and this renders 8 of them, so it can never under-fill.
       * The 4-row over-fetch is deliberate — `getFeaturedProducts(12)` is shared
       * with the auctions and pre-orders rails, so narrowing it to match would
       * couple three sections' counts to one fetch.
       */
      maxItems: 8,
      viewMoreLabel: "View all products →",
      rows: 1,
      autoScroll: false,
      scrollInterval: 5000,
      loop: true,
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },

  /*
   * 🛑 DISABLED, NOT DELETED — and the `order: 3` slot is held.
   *
   * `listings.listingTypes.auction: false` already stops this rail rendering
   * (HOMEPAGE_SECTION_LISTING_TYPE in MarketplaceHomepageView), so `enabled:
   * false` is the second of two locks, not the only one. It is worth having
   * because it is the one an ADMIN sees: a section listed as enabled in the
   * homepage builder, silently filtered out at render, reads as a bug in the
   * builder. Both switches say the same thing now.
   *
   * The copy and the "⚡ LIVE AUCTIONS" pill stay exactly as they were, so
   * re-enabling the type and this flag restores the rail intact.
   */
  {
    id: "section-live-auctions",
    type: "auctions",
    order: 3,
    enabled: false,
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
    order: 4,
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

  /*
   * 🛑 RE-ENABLED 2026-10-21, and BOTH locks had to move.
   *
   * It was disabled 2026-10-20 together with
   * `listings.categoryTypes.bundle: false` — the same two-lock arrangement as
   * the auctions rail above. Five real bundles now exist with resolvable
   * member mosaics, including the 10%-off prize-bey trio, so the rail has
   * genuine content.
   *
   * The site setting is the lock that actually hides it:
   * `MarketplaceHomepageView` filters through `HOMEPAGE_SECTION_CATEGORY_TYPE`
   * -> `isCategoryTypeEnabled`, so with the setting still `false` this flag
   * alone changes nothing on the page while the admin homepage builder shows
   * the section as on — two surfaces contradicting each other. Both were
   * flipped together; see `site-settings-seed-data.ts`.
   */
  {
    id: "section-featured-bundles",
    type: "featured-bundles",
    order: 9,
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

  // ---- 10. The other three ways to buy -------------------------------------
  /*
   * 🛑 THIS IS A `custom-cards` RAIL, NOT A "STICKERS SECTION".
   *
   * There is no `stickers` member of `SectionType`, and
   * `ProductsSectionConfig` marks `filterByCategory` / `filterByBrand`
   * **NO-RENDERER** ("SSR uses one shared fetch", Rule #6) — so a products
   * rail genuinely cannot be scoped to one listing type today. A real
   * per-type rail needs a union member, a config interface, a renderer and an
   * SSR fetch, which is appkit code rather than seed data.
   *
   * `custom-cards` is the honest thing that works now: real tiles, real
   * images, real links, and no fiction about what the section is.
   *
   * 🛑 Stickers browse at `/art`. There is no public `/stickers` route —
   * `ROUTES.ADMIN.STICKERS` and `ROUTES.STORE.STICKERS` are dashboard-only,
   * and `ROUTES.PUBLIC.ART` is the combined art-and-stickers page.
   *
   * 🛑 THE COPY IS SIZED TO THE REAL CATALOGUE (measured 2026-10-21: stickers
   * 2 published, spares 1, art 0, bundles 4). No tile says "hundreds of" or
   * "every part" — a tile promising a catalogue the page cannot show is the
   * dead-end-CTA defect that removed the hero's auctions card. The seed holds
   * 6 more spares and 6 more stickers, but all sit on `store-beyblade-arena`,
   * which does not exist in live Firestore; widening these rails means
   * seeding that store, not loosening the words.
   */
  {
    id: "section-shop-extras",
    type: "custom-cards",
    order: 10,
    enabled: true,
    config: {
      title: "Stickers, spares and bundles",
      subtitle:
        "Three more ways to buy — sheets to decorate with, single parts off a build, and sets that cost less together.",
      layout: "grid",
      cards: [
        {
          id: "extras-stickers",
          image: "/media/sticker-image-beyblade-x-event-sheet",
          imageAlt: "A Beyblade X special event sticker sheet",
          eyebrow: "Printed",
          title: "Sticker sheets",
          body: "Die-cut vinyl and holographic sheets of the X-series blades, from the special-event run. Weatherproof and UV-laminated.",
          buttons: [{ label: "Shop stickers", href: String(ROUTES.PUBLIC.ART), variant: "primary" }],
        },
        {
          id: "extras-spares",
          image: "/media/spare-image-elevate-bit",
          imageAlt: "A Beyblade X Elevate bit",
          eyebrow: "Single parts",
          title: "Spares",
          body: "One component off a build, priced on condition — bits, ratchets and blades, so a broken combo costs a part and not a whole top.",
          buttons: [{ label: "Browse spares", href: String(ROUTES.PUBLIC.SPARES), variant: "primary" }],
        },
        {
          id: "extras-bundles",
          image: "/media/bundle-cover-bundle-x-premium-tops",
          imageAlt: "The three prize Beyblade X tops",
          eyebrow: "Save",
          title: "Bundles",
          body: "Buy the set in one order and pay less than the parts. The Prize Beys Trio is ₹43,200 instead of ₹48,000.",
          buttons: [{ label: "Browse bundles", href: String(ROUTES.PUBLIC.BUNDLES), variant: "primary" }],
        },
      ],
    },
    createdAt: NOW,
    updatedAt: NOW,
  },

  // ---- 11. Supply side -----------------------------------------------------
  {
    id: "section-featured-stores",
    type: "stores",
    order: 11,
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
  /*
   * 🛑 DISABLED 2026-10-21 — the `reviews` collection is EMPTY.
   *
   * A review rail with nothing in it renders a heading, a "See all reviews →"
   * link and blank space. That is worse than absent: the heading is a claim
   * ("What Buyers Say") the page cannot support, and the link leads to an
   * empty list. The site has also never had a customer, so there is nothing
   * honest to seed here — a fabricated testimonial is the one thing this
   * codebase already refuses for `testimonials`, for the same reason.
   *
   * The `order: 11` slot is HELD so re-enabling puts it back in place rather
   * than at the end. Flip `enabled` the moment a real review exists.
   */
  {
    id: "section-collector-reviews",
    type: "reviews",
    order: 12,
    enabled: false,
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
    order: 13,
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
    /*
     * 🛑 DISABLED, and here `enabled: false` is the ONLY lock there is.
     *
     * Raffles and spin wheels are EVENT types, not listing types and not
     * category types, so no Site Settings toggle reaches them and
     * `HOMEPAGE_SECTION_LISTING_TYPE` has nothing to map them to. The same gap
     * put Lotteries, Bundles and Promotions in the footer's hand-written hidden
     * block (src/constants/navigation.tsx) — a per-document flag is the whole
     * mechanism for this one, which is exactly why it is spelled out.
     */
    order: 14,
    enabled: false,
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
    // Disabled 2026-10-20 with `listings.listingTypes.prize-draw: false` — the
    // same two-lock arrangement as the auctions rail.
    order: 15,
    enabled: false,
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
    order: 16,
    enabled: true,
    config: {
      title: "From Our Blog",
      // 4, from the `blog-four-excerpts` SECTION_TEMPLATE (beybladeartshop ships
      // four article excerpts). Safe against the SSR fetch, which supplies 6 via
      // getFeaturedBlogPosts(6) — this renders 4 of them.
      maxArticles: 4,
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
    order: 17,
    enabled: true,
    config: {
      height: "md",
      /* Real imagery instead of a `seedPhoto()` grey tile — see the MEDIA block
         in carousel-slides-seed-data.ts for why that helper produces one of six
         flat SVG rectangles and why a third-party host is not the alternative.
         🛑 A seller pitch wants a HUMAN packing an order, which the wiki corpus
         does not contain; this generation cover is a stand-in until a real photo
         exists for the slot. */
      backgroundImage: "/media/category-beyblade-x-image",
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
    order: 18,
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
    order: 19,
    enabled: true,
    config: {
      /*
       * 🛑 VERIFIABLE FACTS, not volume claims.
       *
       * This read "200+ Listings · 8+ Verified Sellers · 35+ Buyer Reviews ·
       * 50+ Orders Completed". Those were `source: "live"` FALLBACKS, shown
       * whenever the metric fetch fails — and all four were falsifiable in the
       * same breath as the page that showed them: `realListingsOnly()` in
       * seed-cli.mjs loads on the order of a dozen products, and the site has
       * never taken a real order, so "50+ Orders Completed" was a number about
       * nothing. A visitor who reads it and then browses the catalogue
       * concludes the whole page is decoration.
       *
       * The replacements are things a visitor can CHECK by clicking through,
       * and each was counted from source in the change that wrote it:
       *   - parts       `PART_LEAF_COUNT` (_helpers/category-parts.ts:17528) = 2490.
       *                 🛑 CLAUDE.md says 752; that is stale, the corpus grew.
       *   - generations 4 tier-1 rows under `category-spinning-tops`.
       *   - brands      28 `BRAND_SEED_INPUTS` entries (`BRAND_ROW_COUNT`).
       * Re-count before editing any of them rather than trusting this comment.
       *
       * `total_listings` stays LIVE and keeps a `"0"` fallback: a live number is
       * verifiable by definition, and a zero fallback can only ever understate.
       * `total_orders` and `total_reviews` are dropped rather than zeroed — a
       * giant "0" in 48pt type is worse than not raising the subject.
       *
       * `iconName` is required on a static stat; a live one derives its glyph
       * from `metric` via STAT_PRESET_ICON.
       */
      title: "By the numbers",
      stats: [
        { key: "products", label: "Listings", value: "0", source: "live", metric: "total_listings", suffix: "+" },
        { key: "parts", label: "Parts catalogued", value: "2,490", source: "static", iconName: "spares" },
        { key: "generations", label: "Generations covered", value: "4", source: "static", iconName: "archive" },
        { key: "brands", label: "Brands", value: "28", source: "static", iconName: "deals" },
      ],
    },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(15),
  },

  {
    id: "section-platform-features",
    type: "features",
    order: 20,
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
    order: 21,
    enabled: true,
    config: {
      title: "Join the community",
      description: "Deal alerts, auction reminders, and early access to drops.",
      /* 🛑 The line that used to sit here — "Keep this link verbatim — a
         tester-checklist case asserts it" — was FALSE and is deleted. Verified:
         zero hits for `chat.whatsapp.com` anywhere under
         `appkit/src/features/tester/seed-data/`. It had also outlived its
         subject: the value it was protecting (a bare `https://chat.whatsapp.com/`
         with no invite code) is gone, so the comment defended a string that no
         longer existed while discouraging anyone from touching the field. */
      /*
       * 🛑 STILL UNSET HERE, AND THAT IS NOT THE SAME AS "NOT SET ANYWHERE".
       *
       * A bare chat.whatsapp.com URL is not a valid invite and opens a page
       * resolving to no group, so a placeholder would be worse than nothing.
       * The real invite is env-owned (`WHATSAPP_GROUP_INVITE`) and must not be
       * committed to a seed file that ships in the package.
       *
       * What changed 2026-10-21: the indirection this comment relied on —
       * "reaches the card through appkit.config" — was NOT reaching
       * production. The live document had no `groupLink` at all, while
       * `WhatsAppCommunitySectionConfig` declares it required and the
       * component renders its join button only `{groupLink && …}`. So the
       * section showed "Join the community" with the button silently missing.
       *
       * `scripts/push-editorial-content.mjs --only layout` now resolves the
       * env var onto the live document, and refuses anything that is not a
       * `chat.whatsapp.com/` invite (a `wa.me/` link opens a DM, not the
       * group — it would look fixed and behave wrongly). Run it after changing
       * the env var; seeding alone will not set this.
       */
      groupLink: undefined,
      /*
       * 🛑 NO AUCTION PROMISE. A benefits list is a list of promises, and
       * "Reminders when auctions you watch are closing" could not be kept —
       * auctions are switched off at `listings.listingTypes.auction: false`,
       * the rail is disabled and the hero's auctions card was removed for the
       * same reason. Replaced with restock pings, which the catalogue can
       * actually do.
       */
      benefits: [
        "Deal alerts before they hit the homepage",
        "Early access to limited drops and event codes",
        "Restock pings for sold-out tops, parts and stickers",
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
    order: 22,
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
    order: 23,
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
    order: 24,
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
   *
   * 🛑 Each card's `image` is the SAME `/media/<shortId>` the generation
   * CATEGORY carries, not a second asset. `CustomCardsSection` renders a card
   * with artwork as a poster — the image fills it and a scrim carries the type
   * — so the four cards here and the four `promo-grid` banners below and the
   * four category tiles are one set of four objects, uploaded once. Minting a
   * parallel `matrix-*` shortId would be a mirror that drifts the first time
   * one of them is re-fetched (Root Cause #42).
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
          image: "/media/category-beyblade-original-image",
          imageAlt: "",
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
          image: "/media/category-beyblade-metal-image",
          imageAlt: "",
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
          image: "/media/category-beyblade-burst-image",
          imageAlt: "",
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
          image: "/media/category-beyblade-x-image",
          imageAlt: "",
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
   * `collection-cards` had a renderer and a builder with zero seeded rows — a
   * type nobody ever saw, structurally identical to 22 missing-order or
   * mis-ordered sections elsewhere in this file: a gap only a human reading
   * the schema would ever notice.
   *
   * 🛑 Deliberately scoped to `categories` / `brands` / `stores` — the three
   * axes that are PERMANENT regardless of product count. Even if every one of
   * the 1,237 generated catalogue products were deleted, these three entry
   * types would still resolve to real, populated rows: 1,185 categories, 28
   * brand rows, 5 stores, all seeded independently of the product catalogue.
   * A `"products"` or `"auctions"` entry here would be the opposite — a card
   * that goes empty the moment the catalogue does, on a section whose entire
   * point is to always have something to show.
   */
  {
    id: "section-top-collections",
    type: "collection-cards",
    order: 25,
    enabled: true,
    config: {
      title: "Explore the Marketplace",
      subtitle: "Three ways into the catalogue that never go empty.",
      layout: "grid",
      itemsPerRow: 3,
      showCollectionTabs: false,
      collections: [
        { type: "categories", label: "Shop by Generation", limit: 6 },
        { type: "brands", label: "Shop by Brand", limit: 8 },
        { type: "stores", label: "Verified Sellers", limit: 5 },
      ],
      cta: { label: "View all categories →", href: String(ROUTES.PUBLIC.CATEGORIES), variant: "text" },
    },
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  /*
   * ---- 25. How it works ----------------------------------------------------
   *
   * `how-it-works` and `promo-grid` (26) were registered types with renderers,
   * admin create-picker entries and ZERO seeded rows — so both returned `null`
   * and the page was missing the two blocks a 2026 marketplace homepage most
   * obviously has. They were left unseeded on the principle that this file must
   * not invent placeholder content, which was the right call: the reason they
   * can be seeded NOW is that there is real, checkable copy to put in them.
   *
   * 🛑 Every step below is a claim the site actually honours. No "ships in 24
   * hours", no "100% buyer protection" — the authenticity labelling in step 2
   * is the one genuine differentiator the carousel already leads with, quoted
   * from the same policy.
   *
   * 🛑 NO BIDDING STEP. `listings.listingTypes.auction` is false, so a step
   * telling visitors to place a bid would route them to a browse page with
   * nothing in it.
   *
   * 🛑 PLACEMENT IS PROVISIONAL. Appended at 25/26 rather than inserted mid-page
   * (how-it-works belongs nearer the top, after the trust bar) because the
   * section order is being tuned with the owner in a parallel change and
   * renumbering 24 rows underneath that would collide. Reposition from
   * /admin/sections, which is cheaper than a reseed.
   */
  {
    id: "section-how-it-works",
    type: "how-it-works",
    order: 26,
    enabled: true,
    config: {
      title: "How buying here works",
      subtitle: "Three steps, and the second one is the part other marketplaces skip.",
      pillLabel: "New here?",
      ctaLabel: "Browse the catalogue →",
      ctaLink: String(ROUTES.PUBLIC.PRODUCTS),
      steps: [
        {
          number: 1,
          iconKey: "search",
          title: "Find the piece",
          desc: "Filter by generation, part family, condition and price across every seller on the marketplace.",
        },
        {
          number: 2,
          iconKey: "verify",
          title: "Read the authenticity label",
          desc: "Every listing carries one of three labels — original, reproduction or unverified. If a seller does not say which, it reads “unverified”; we will not claim “original” on their behalf.",
        },
        {
          number: 3,
          iconKey: "lock",
          title: "Buy with the seller verified",
          desc: "Identity and payout details are checked before a store can publish, and your address and phone number are encrypted at rest.",
        },
      ],
    },
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  /*
   * ---- 26. Promo grid ------------------------------------------------------
   *
   * The always-dark 4-tile editorial mosaic: one large slot plus three, each a
   * full-bleed image under a bottom-up scrim. Routes to the four generations,
   * which is the one set of destinations guaranteed to be populated however the
   * product catalogue changes — a promo tile pointing at an empty page is worse
   * than no tile.
   *
   * 🛑 `image` is a `/media/<shortId>` slug backed by a real `mediaAssets` row,
   * never `seedPhoto()` (six flat grey tiles) and never a third-party host
   * (Root Cause #104). These four covers are the same ones the generation
   * categories use, so they are known-present.
   *
   * 🛑 The component caps at `PROMO_GRID_MAX_BANNERS` (4) and silently drops a
   * fifth — the layout has exactly one hero slot and three regular ones.
   */
  {
    id: "section-generation-promos",
    type: "promo-grid",
    order: 27,
    enabled: true,
    config: {
      eyebrow: "FOUR GENERATIONS",
      heading: "Pick your era",
      banners: [
        {
          id: "promo-beyblade-x",
          title: "Beyblade X",
          ctaLabel: "Shop Beyblade X",
          ctaUrl: "/categories/category-beyblade-x",
          image: "/media/category-beyblade-x-image",
        },
        {
          id: "promo-beyblade-burst",
          title: "Burst",
          ctaLabel: "Shop Burst",
          ctaUrl: "/categories/category-beyblade-burst",
          image: "/media/category-beyblade-burst-image",
        },
        {
          id: "promo-beyblade-metal",
          title: "Metal Fight",
          ctaLabel: "Shop Metal Fight",
          ctaUrl: "/categories/category-beyblade-metal",
          image: "/media/category-beyblade-metal-image",
        },
        {
          id: "promo-beyblade-original",
          title: "The Originals",
          ctaLabel: "Shop the originals",
          ctaUrl: "/categories/category-beyblade-original",
          image: "/media/category-beyblade-original-image",
        },
      ],
    },
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  /*
   * 🛑 `google-reviews` stays DELIBERATELY UNSEEDED — not an oversight, the
   * same decision already made for `googleMapsApiKey`/`googlePlaceId` in
   * `site-settings-seed-data.ts`: those are seeded `""` on purpose, because
   * their consumers (`GoogleReviewsSectionConfig.placeId` is this section's
   * only REQUIRED field) read them directly and would treat a placeholder as
   * a usable credential, producing a failed, possibly BILLED Google Places
   * API call instead of skipping cleanly.
   *
   * Reviews pulled from this section are real third-party content keyed to a
   * real Google Business Profile this project does not have. Fabricating a
   * `placeId` would either hit Google's API with an invalid key (cost, for a
   * call that can never succeed) or — worse — a VALID placeId for a real,
   * unrelated business, rendering someone else's reviews as this store's own.
   * Neither is a seed-data problem to paper over; it is a real business
   * prerequisite (a Google Business Profile must exist) that has not happened
   * yet. The type stays in `SectionType` and `SECTION_REGISTRY` — it is a real
   * feature with zero fabricated data, not a bug.
   */

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
