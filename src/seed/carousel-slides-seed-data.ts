/*
 * WHY: Seeds 6 carousel slides for the marketplace homepage promo carousel.
 * WHAT: 4 active + 2 inactive. Deterministic Picsum backgrounds with a dim
 * overlay, plus a headline / supporting line / CTA on each.
 *
 * 🛑 FOUR ACTIVE, NOT FIVE, SINCE 2026-10-20. `MAX_ACTIVE_SLIDES` is a
 * ceiling, not a quota — `slide-beyblade-auction` went inactive with
 * `listings.listingTypes.auction: false` and nothing was promoted to backfill
 * it. Do NOT activate `slide-upcoming-promo` to get back to five: that one is
 * the fixture `getActiveSlides()`' own filter is tested against, and it says
 * "A draft slide kept unpublished so admins have a starting point to copy."
 *
 * 🛑 EVERY ACTIVE SLIDE MUST CARRY AN `overlay` OR `cards`, OR IT RENDERS BLANK.
 * `HeroCarousel` gates all slide copy on `slide.overlay` (line ~412) and the
 * card grid on `slide.cards.length` (line ~451). Before this pass every seeded
 * slide had NEITHER — no overlay, `cards: []` — so all five active slides
 * rendered as bare background images with no headline and no call to action.
 * The `title` field is admin-list metadata; it is not rendered on the slide.
 *
 * 🛑 NEVER give one slide BOTH an overlay and cards. The two containers are
 * sibling `POSITION_FILL` elements, so they stack on the same pixels and the
 * text overlaps. `slide-hero-homepage` is the cards slide and deliberately has
 * no overlay; the other four are overlay-only.
 *
 * Overlay titles render as <h2> — the welcome section above the carousel owns
 * the page's single <h1>.
 *
 * One slide (slide-beyblade-auction) uses background.type:"video" with a direct,
 * Creative-Commons-licensed MP4 URL — HeroCarousel renders video backgrounds via a
 * native <video> element (MediaVideo), not a YouTube iframe embed, so this needs a
 * playable video file URL rather than a YouTube video ID.
 *
 * EXPORTS:
 *   carouselSlidesSeedData — Array of Partial<CarouselSlideDocument> for seed runner
 *
 * @tag domain:carousel,homepage
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { CarouselSlideDocument } from "../features/homepage/schemas";
import { ROUTES } from "../next/routing/route-map";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

// "medium" matches the carousel section's own config: the carousel now sits
// under a full welcome hero, so a viewport-height slide would push the whole
// page below the fold.
const SLIDE_SETTINGS = { autoplayDelayMs: 6000, height: "medium" as const };

/**
 * 🛑 Real imagery, from `mediaAssets` rows that already exist.
 *
 * Every background and card on this carousel used to be `seedPhoto(...)`, which
 * since 2026-10-09 returns one of SIX flat solid-colour SVG tiles from
 * `public/images/seed-tiles/` — so the homepage hero was five grey rectangles,
 * and the width/height arguments passed beside them were accepted and ignored.
 * Meanwhile 559 wiki-sourced `mediaAssets` rows were sitting in Storage wired
 * to leaf categories and to nothing on the homepage.
 *
 * These are `/media/<shortId>` paths, which resolve through
 * `mediaAssets/{slug}` → `storagePath` and stream from OUR bucket behind a
 * 30-day immutable cache — one invocation per image per edge per month.
 *
 * 🛑 Never `seedExtMedia()` and never a third-party host here: persisting a
 * remote URL through `/api/media/ext` adds an upstream fetch plus a sharp
 * watermark pass to EVERY render, which is Root Cause #104 — ~900K proxy
 * responses and 52.52 GB of origin transfer against a 10 GB allowance, and a
 * suspended project.
 *
 * 🛑 These are publisher product shots on white, not action photography. They
 * are a floor, not a ceiling — see the shot list in the plan for what should
 * eventually replace them. Each one still carries a `dimOverlay` because the
 * overlay copy is fixed-inverse ink and needs a guaranteed-dark backdrop
 * (Root Cause #67).
 */
const MEDIA = {
  franchise: "/media/franchise-beyblade-image",
  genOriginal: "/media/category-beyblade-original-image",
  genMetal: "/media/category-beyblade-metal-image",
  genBurst: "/media/category-beyblade-burst-image",
  genX: "/media/category-beyblade-x-image",
  dranzer: "/media/category-dranzer-f-image",
  dragoon: "/media/category-dragoon-f-image",
  aeroPegasus: "/media/category-aeropegasus-3-70a-image",
  spryzen: "/media/category-spryzen-requiem-s3-image",
  lDrago: "/media/category-l-drago-destructor-f-s-image",
} as const;

const _rawSlides: Partial<CarouselSlideDocument>[] = [
  {
    id: "slide-hero-homepage",
    title: "Three ways to shop",
    order: 1,
    active: true,
    background: {
      type: "image",
      url: MEDIA.franchise,
      dimOverlay: { enabled: true, opacity: 0.55 },
    },
    // The ONE cards slide — and therefore the one slide with no `overlay`.
    // Exists so the zone-grid render path has real data to exercise; all three
    // collapse to zone 2 on mobile.
    cards: [
      {
        id: "card-hero-shop-now",
        zone: 1,
        mobileZone: 2,
        background: { type: "image", url: MEDIA.dranzer, dimOverlay: { enabled: true, opacity: 0.45 } },
        content: {
          eyebrow: "Buy now",
          title: "Ready to ship",
          description: "In-stock listings from verified sellers.",
        },
        buttons: [{ id: "card-hero-shop-now-cta", text: "Shop products", href: String(ROUTES.PUBLIC.PRODUCTS), variant: "primary" }],
        hover: { effect: "scale" },
      },
      {
        /*
         * 🛑 THIS WAS THE AUCTIONS CARD ("Bid / Live auctions / Place a bid
         * before the timer runs out" → `/auctions`), and it was still on the
         * first screen of the site weeks after `listings.listingTypes.auction`
         * went `false`. The section-level gate in `MarketplaceHomepageView` is
         * keyed on `SectionType` and a carousel is type `carousel` whatever it
         * contains, so nothing could see it. `gateCarouselSlides` now can — but
         * a filter that leaves a hole in a `repeat(3, 1fr)` row is a fallback,
         * not a fix, so the slot gets real content instead.
         *
         * 🛑 NOT `/spares` and NOT `/art`, which were the obvious swaps: both
         * types are ENABLED, both have a working browse page, and both held
         * ZERO published products when this was written (measured against
         * production, 2026-10-20). Replacing a dead-end card with a different
         * dead-end card is not a fix. `/categories` is populated — six roots,
         * 28 brands, 8 franchises — and browsing the tree is genuinely the
         * third way to shop here.
         */
        id: "card-hero-browse",
        zone: 2,
        mobileZone: 2,
        background: { type: "image", url: MEDIA.lDrago, dimOverlay: { enabled: true, opacity: 0.45 } },
        content: {
          eyebrow: "Explore",
          title: "Shop by category",
          description: "Walk the tree from generation down to a single part.",
        },
        buttons: [{ id: "card-hero-browse-cta", text: "Browse categories", href: String(ROUTES.PUBLIC.CATEGORIES), variant: "primary" }],
        hover: { effect: "scale" },
      },
      {
        id: "card-hero-reserve",
        zone: 3,
        mobileZone: 2,
        background: { type: "image", url: MEDIA.aeroPegasus, dimOverlay: { enabled: true, opacity: 0.45 } },
        content: {
          eyebrow: "Reserve",
          title: "Pre-orders",
          description: "Lock in upcoming releases with a deposit.",
        },
        buttons: [{ id: "card-hero-reserve-cta", text: "See pre-orders", href: String(ROUTES.PUBLIC.PRE_ORDERS), variant: "primary" }],
        hover: { effect: "scale" },
      },
    ],
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
  },
  {
    /*
     * 🛑 DISABLED, NOT DELETED — the same arrangement the auctions RAIL uses in
     * `homepage-sections-seed-data.ts`, and for the same reason. Every word of
     * the copy, the video background and the CTA stay exactly as they were, so
     * flipping `listings.listingTypes.auction` back to `true` and this flag
     * with it restores the slide intact.
     *
     * Two locks, deliberately. `gateCarouselSlides` already drops this at
     * render because `overlay.button.link` and `link.url` both resolve to
     * `/auctions` — but that one is invisible, and a slide listed as active in
     * the carousel admin while never appearing on the page reads as a bug in
     * the admin. `active: false` is the lock a human sees.
     *
     * 🛑 The copy names no listing type — "Win it at your price" — which is
     * exactly why the gate matches on the LINK and not on the words.
     */
    id: "slide-beyblade-auction",
    title: "Live auctions",
    order: 2,
    active: false,
    background: {
      type: "video",
      // Direct MP4 URL, deliberately NOT wrapped in seedExtMedia() — that
      // helper routes through /api/media/ext, which only serves images
      // (rejects non-image content-type with 400). MediaVideo watermarks
      // video client-side instead, so the raw external URL is correct here.
      url: "/demo-media/sample-video.mp4",
      thumbnail: MEDIA.genMetal,
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    overlay: {
      enabled: true,
      subtitle: "Bidding open now",
      title: "Win it at your price",
      description: "Live auctions close every day. Place a bid, set your maximum, and let it ride.",
      button: {
        id: "slide-auctions-cta",
        text: "Browse live auctions",
        link: String(ROUTES.PUBLIC.AUCTIONS),
        variant: "primary",
        openInNewTab: false,
      },
    },
    link: { url: String(ROUTES.PUBLIC.AUCTIONS), openInNewTab: false },
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(55),
    updatedAt: daysAgo(2),
  },
  {
    id: "slide-beyblade-collection-hunt",
    title: "Complete your collection",
    order: 3,
    active: true,
    background: {
      type: "image",
      url: MEDIA.genBurst,
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    overlay: {
      enabled: true,
      subtitle: "Thousands of listings",
      title: "Find the piece you're missing",
      description: "Filter by category, condition and price across every seller on the marketplace.",
      button: {
        id: "slide-collection-cta",
        text: "Start browsing",
        link: String(ROUTES.PUBLIC.PRODUCTS),
        variant: "primary",
        openInNewTab: false,
      },
    },
    link: { url: String(ROUTES.PUBLIC.PRODUCTS), openInNewTab: false },
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(50),
    updatedAt: daysAgo(5),
  },
  {
    id: "slide-preorders-open",
    title: "Pre-orders open",
    order: 4,
    active: true,
    background: {
      type: "image",
      url: MEDIA.genX,
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    overlay: {
      enabled: true,
      subtitle: "Reserve before release",
      title: "Don't miss the drop",
      description: "Secure upcoming releases with a deposit and pay the balance when they ship.",
      button: {
        id: "slide-preorders-cta",
        text: "See open pre-orders",
        link: String(ROUTES.PUBLIC.PRE_ORDERS),
        variant: "primary",
        openInNewTab: false,
      },
    },
    link: { url: String(ROUTES.PUBLIC.PRE_ORDERS), openInNewTab: false },
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
  },
  {
    /*
     * ── G1c — THE AUTHENTICITY SLIDE ────────────────────────────────────────
     *
     * 🛑 This slide's id has said `authenticated-originals` since it was
     * written and its copy said "Turn your collection into income" — a
     * seller-acquisition message under an authenticity name. So authenticity,
     * which is this marketplace's actual differentiator, had NO hero surface
     * at all while the id implied it did.
     *
     * It is the one hero message the crawl independently validates three ways:
     * beybladeartshop runs it as their slide 5 ("100% original Takara Tomy
     * Beyblades. Don't fall for cheap imitations!"); worldhobbyshop — the SEO
     * leader of the fifteen — ships a top-level "MidFake Beyblades" category
     * and an FAQ promising that midfake and reproduction stock is kept
     * separate with authenticity disclosed; and we already have the feature
     * (`ProductAuthenticity` is a REQUIRED field with a badge and four FAQ
     * rows) with nowhere on the homepage that says so.
     *
     * 🛑 THE COPY ANSWERS "AFTERMARKET", NOT "FAKE", and that is the finding
     * that matters. The counterfeit seller measured in section 3.7 makes **zero**
     * authenticity claims across 1,277 listings — no "original", no "replica",
     * no "fake" — and sells itself as "a popular brand" offering "custom parts
     * or upgraded components", "like many other aftermarket brands". So
     * "aftermarket" and "custom" are the words our buyers will actually be
     * sold, and a slide that only rebuts the word "fake" rebuts nothing they
     * will hear.
     *
     * It also states the three-tier vocabulary rather than a binary, because
     * the tiers are the honest part: a reproduction IS sellable when labelled,
     * and claiming everything is original would be the same unfalsifiable
     * promise the counterfeiter makes in reverse.
     *
     * 🛑 Seller acquisition is NOT lost — it keeps its own `banner` section
     * ("Have collectibles to sell?" → "Start selling →"), the `features` and
     * `stats` sections, and two nav entries. Verified before this was changed.
     * `MAX_ACTIVE_SLIDES` is 5 and all five were taken, so this is a swap
     * rather than an addition.
     */
    id: "slide-authenticated-originals",
    title: "Original, reproduction, or unverified — every listing says which",
    order: 5,
    active: true,
    background: {
      type: "image",
      url: MEDIA.genOriginal,
      dimOverlay: { enabled: true, opacity: 0.55 },
    },
    overlay: {
      enabled: true,
      subtitle: "Authenticity, stated",
      // 🛑 "We make sellers say which" was the same overclaim as the body —
      // the field is optional, so nobody is MADE to. What is true is that
      // every listing carries a label, which is the verifiable version.
      title: "“Aftermarket” is not a brand. Every listing says which.",
      /*
       * 🛑 THE CLAIM WAS FALSE WHEN FIRST WRITTEN, and the check is the point.
       *
       * It read "the seller has to pick one before it can go live" — and
       * `authenticity` is `.optional()` in the write schema while being ABSENT
       * on all 71 live products. A hero promise nobody could keep, on the one
       * subject where this marketplace's credibility rests.
       *
       * Both halves were fixed before the copy was: the root default now makes
       * 381/381 listing nodes resolve a value, and `withDerivedCategoryFields`
       * stamps it on every seeded product (measured after loading:
       * `original=4`, `unverified=67`, zero absent).
       *
       * The copy still says what is TRUE rather than what would be strongest.
       * A seller may still omit the field — the category then decides, and it
       * decides `unverified`, never `original`. So the promise is "every
       * listing carries a label and we never silently claim original", which
       * is both accurate and the more useful thing to say.
       */
      description:
        "Every listing carries one of three labels — original, reproduction or unverified. A seller can say which; if they do not, it reads “unverified”, because we will not claim “original” on your behalf. Reproductions are welcome here when they are labelled; a listing that leaves you guessing is not.",
      button: {
        id: "slide-authenticity-cta",
        text: "How to spot a fake",
        /*
         * 🛑 `/faqs/product_information`, the CATEGORY — not a question slug.
         * The route is `/faqs/[category]` and it matches on
         * `CATEGORY_KEYS.includes(category)`, so `/faqs/faq-how-to-spot-a-fake`
         * would silently fall back to "all" and land the reader on the full
         * index instead of the answer. Verified against the route before
         * writing it, because the FAQ documents DO carry a `seo.slug` of
         * exactly that shape, which makes the wrong link the obvious one.
         *
         * This category holds both authenticity answers — "How do I spot a fake
         * Beyblade?" and "What is a reproduction or midfake? Is it a fake?" —
         * which is the pair the slide's claim rests on.
         */
        link: "/faqs/product_information",
        variant: "primary",
        openInNewTab: false,
      },
    },
    link: { url: "/faqs/product_information", openInNewTab: false },
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(3),
  },
  // Inactive on purpose — exercises the active/inactive filter in
  // `getActiveSlides()`. It carries a full overlay so that enabling it in
  // admin produces a finished slide rather than a blank one.
  {
    id: "slide-upcoming-promo",
    title: "Seasonal promo (draft)",
    order: 6,
    active: false,
    background: {
      type: "image",
      url: MEDIA.spryzen,
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    overlay: {
      enabled: true,
      subtitle: "Coming soon",
      title: "Season sale",
      description: "A draft slide kept unpublished so admins have a starting point to copy.",
      button: {
        id: "slide-promo-cta",
        text: "See all events",
        link: String(ROUTES.PUBLIC.EVENTS),
        variant: "primary",
        openInNewTab: false,
      },
    },
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];

export const carouselSlidesSeedData: Partial<CarouselSlideDocument>[] = _rawSlides.map((s) => ({
  cards: [] as CarouselSlideDocument["cards"],
  ...s,
}));
