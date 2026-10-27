/*
 * WHY: Seeds the carousel slides for the marketplace homepage promo carousel.
 * WHAT: 8 slides — 5 active + 3 inactive — each a CC0/public-domain background
 * with a dim overlay, plus a headline / supporting line / CTA.
 *
 * 🛑 FIVE ACTIVE SINCE 2026-10-21, which exactly MEETS `MAX_ACTIVE_SLIDES`.
 * A sixth active slide is not an error — `features/homepage/api/carousel/
 * route.ts` slices to five, so the extra is silently never rendered. Adding
 * one means disabling one.
 *
 * This replaced an earlier note reading "FOUR ACTIVE, NOT FIVE, SINCE
 * 2026-10-20 … nothing was promoted to backfill it". Two slides were promoted
 * on 2026-10-21 (`slide-festive-cashback`, `slide-bundles-save`) and two
 * demoted: `slide-beyblade-auction` (CTA into a vertical switched off at
 * `listings.listingTypes.auction: false`) and `slide-beyblade-collection-hunt`
 * (a restatement of the hero's own first card).
 *
 * Do NOT activate `slide-upcoming-promo` to change the count: that one is the
 * fixture `getActiveSlides()`' own filter is tested against, and it says
 * "A draft slide kept unpublished so admins have a starting point to copy."
 *
 * 🛑 `order` must stay UNIQUE across all eight (currently 1-8).
 * `MarketplaceHomepageView` tie-breaks on `updatedAt` then `id.localeCompare`,
 * so two slides sharing an order makes the running order alphabetical by
 * accident rather than a layout decision — which is exactly what happened
 * when `slide-beyblade-auction` and `slide-upcoming-promo` both sat on 6.
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
import { MAX_ACTIVE_SLIDES } from "../features/homepage/schemas";
import { buildSlidesFromEvents } from "../features/events/utils/carousel-slide";
import { eventsSeedData } from "./events-seed-data";
import { ROUTES } from "../next/routing/route-map";
import { TABLE_KEYS } from "../constants/table-keys";
import { sortBy } from "../constants/sort";
import { PRODUCT_FIELDS } from "../constants/field-names";

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
 * 🛑 SUPERSEDED 2026-10-21 for the BACKGROUNDS, still true for everything
 * else. This paragraph read "These are publisher product shots on white, not
 * action photography … a floor, not a ceiling". Correct, and the reason the
 * backgrounds moved off them: a product shot on white behind inverse-ink copy
 * at 55% dim is a grey rectangle with text on it. Slide and card backgrounds
 * are now abstract CC0 art fetched for the purpose (see the block below); the
 * product shots stay where they read properly — the rails, the cards' own
 * subject matter, and the blog.
 *
 * Each background still carries a `dimOverlay` because the overlay copy is
 * fixed-inverse ink and needs a guaranteed-dark backdrop (Root Cause #67).
 */
const MEDIA = {
  /*
   * ── Carousel backgrounds: CC0 / public domain, abstract, fetched for this ──
   *
   * 🛑 These are NOT product shots, deliberately. A carousel background sits
   * full-bleed under inverse-ink copy at ~55% dim; a photograph of a top
   * competes with the headline and both lose. Item photography belongs on the
   * CARDS, the rails and the blog — which is where it now is.
   *
   * 🛑 CC0 / public domain ONLY. CC BY and CC BY-SA are free but require
   * visible credit, and a full-bleed hero has nowhere to render it. Enforced
   * at fetch time by `publicDomainOnly` in
   * `scripts/lib/editorial-image-manifest.mjs`, not left to review.
   *
   * Staged by `scripts/fetch-editorial-images.mjs`, uploaded with their
   * `mediaAssets` rows by `scripts/push-editorial-images.mjs`; provenance in
   * `docs/research/editorial-images/image-provenance.json`.
   */
  bgHero: "/media/carousel-bg-hero",
  bgCashback: "/media/carousel-bg-cashback",
  eventDiwali: "/media/event-cover-diwali-lamps",
  bgBundles: "/media/carousel-bg-bundles",
  bgPreorders: "/media/carousel-bg-preorders",
  bgAuthenticity: "/media/carousel-bg-authenticity",
  cardShop: "/media/carousel-card-shop",
  cardBundles: "/media/carousel-card-bundles",
  cardPreorders: "/media/carousel-card-preorders",

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
      url: MEDIA.bgHero,
      dimOverlay: { enabled: true, opacity: 0.6 },
    },
    // The ONE cards slide — and therefore the one slide with no `overlay`.
    // Exists so the zone-grid render path has real data to exercise; all three
    // collapse to zone 2 on mobile.
    cards: [
      {
        id: "card-hero-shop-now",
        zone: 1,
        mobileZone: 2,
        background: { type: "image", url: MEDIA.cardShop, dimOverlay: { enabled: true, opacity: 0.5 } },
        content: {
          eyebrow: "Buy now",
          title: "Ready to ship",
          /*
           * 🛑 Keep this specific — it is load-bearing copy, not filler.
           *
           * It read "In-stock listings from verified sellers." here while the
           * LIVE Firestore document (written by scripts/push-editorial-content.mjs)
           * said "In-stock Beyblade X tops, spares and stickers, dispatched
           * from India." The two had drifted, and a reseed would have replaced
           * the better wording with the vaguer one.
           *
           * The live version is the one to keep: measured 2026-10-24, Google
           * discarded the homepage meta description and built its search
           * snippet out of THIS card's text instead. That makes it real
           * user-facing SEO copy, and "listings from verified sellers" says
           * nothing about what is being sold.
           */
          description: "In-stock Beyblade X tops, spares and stickers, dispatched from India.",
        },
        buttons: [{ id: "card-hero-shop-now-cta", text: "Shop products", href: String(ROUTES.PUBLIC.PRODUCTS), variant: "primary" }],
        hover: { effect: "scale" },
      },
      {
        /*
         * 🛑 THIS SLOT HAS NOW BEEN REPOINTED TWICE, AND THE PATTERN IS THE
         * LESSON: on a site that keeps withdrawing surfaces, the safe
         * destination for a hero card is one that cannot close.
         *
         * It was the AUCTIONS card ("Bid / Live auctions / Place a bid before
         * the timer runs out" → `/auctions`), still on the first screen weeks
         * after `listings.listingTypes.auction` went `false` — the
         * section-level gate is keyed on `SectionType` and a carousel is type
         * `carousel` whatever it contains, so nothing could see it.
         *
         * It was then repointed to `/categories`, which was the right call at
         * the time and was closed four days later (`browsePages.categories:
         * false`, 2026-10-24). The card outlived that too: measured against
         * production 2026-10-27, this was one of 34 live `/categories` links
         * on the homepage.
         *
         * 🛑 STILL NOT `/spares` and NOT `/art` — the same swaps rejected last
         * time, for a reason that has only got stronger. Both held ZERO
         * published listings then, both are now flagged `false` outright, and
         * both already answer a real 404. Replacing a dead-end card with a
         * different dead-end card is not a fix.
         *
         * So: `/products`, deep-linked to the newest-first sort. It is the one
         * surface that cannot close while the site is open — and if the sort
         * token is ever renamed, an unrecognised `?sort=` is IGNORED rather
         * than erroring, so the card degrades to the plain catalogue instead
         * of breaking. `gateCarouselSlides` reads the path with the query
         * stripped, so the deep link is gated as `/products`.
         */
        id: "card-hero-browse",
        zone: 2,
        mobileZone: 2,
        background: { type: "image", url: MEDIA.cardBundles, dimOverlay: { enabled: true, opacity: 0.5 } },
        content: {
          eyebrow: "Just in",
          title: "New arrivals",
          description: "The latest tops and parts listed, newest first.",
        },
        buttons: [
          {
            id: "card-hero-browse-cta",
            text: "See what's new",
            href: `${String(ROUTES.PUBLIC.PRODUCTS)}?${TABLE_KEYS.SORT}=${sortBy(PRODUCT_FIELDS.CREATED_AT)}`,
            variant: "primary",
          },
        ],
        hover: { effect: "scale" },
      },
      {
        id: "card-hero-reserve",
        zone: 3,
        mobileZone: 2,
        background: { type: "image", url: MEDIA.cardPreorders, dimOverlay: { enabled: true, opacity: 0.5 } },
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

  /*
   * ── Two promo slides, added 2026-10-21 ───────────────────────────────────
   *
   * Both took slots freed by disabling `slide-beyblade-auction` (a CTA into a
   * switched-off vertical) and `slide-beyblade-collection-hunt` (the hero's
   * first card restated). `MAX_ACTIVE_SLIDES` is 5 and remains exactly met —
   * a sixth active slide is not an error, it is silently never rendered.
   *
   * Overlay-only with `cards: []`, per the header's rule 2.
   */
  /*
   * 🛑 SUPERSEDED 2026-10-24 by the event-owned slide generated from
   * `event-festive-cashback-10`'s own `carouselConfig` — see the note above
   * the `buildSlidesFromEvents` call at the foot of this file.
   *
   * Kept rather than deleted, `active: false`: `appkit-seed load` is a MERGE
   * write and cannot remove a document, so deleting this literal would leave
   * the live slide exactly as it is, still active, still carrying the stale
   * headline. Flipping the flag is the only edit that actually reaches
   * production.
   */
  {
    id: "slide-festive-cashback",
    title: "Festive cashback (promo) — superseded by the event-owned slide",
    order: 2,
    active: false,
    background: {
      type: "image",
      // Uses the EVENT cover so the slide and the page it links to look
      // like one promotion. `bgCashback` stays in MEDIA for the next promo.
      url: MEDIA.eventDiwali,
      dimOverlay: { enabled: true, opacity: 0.55 },
    },
    cards: [],
    overlay: {
      enabled: true,
      subtitle: "Coming soon",
      title: "10% cashback on every order",
      description:
        "Spend ₹999 or more and get 10% back, up to ₹1,000. Copy the code now — it goes live when the event opens.",
      /*
       * Links by SLUG, matching `EventCard`'s own `event.slug ?? event.id`.
       * `getPublicEventById` resolves through `findByIdOrSlug`, so either
       * works — the slug is the one a human would recognise in the address
       * bar, and it is what every other link to this event uses.
       */
      button: {
        id: "slide-cashback-cta",
        text: "See the offer",
        link: String(ROUTES.PUBLIC.EVENT_DETAIL("festive-cashback-10")),
        variant: "primary",
        openInNewTab: false,
      },
    },
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
  },
  /*
   * 🛑 DEACTIVATED 2026-10-24 to make room, not because it is bad.
   *
   * Two event-owned slides joined the rail (the festive hub and launch week)
   * and the ceiling is five. Bundles lost the slot because it is the one
   * message already carried elsewhere on the slide that replaced it — zone 1
   * of the festive cards slide is BUY3GET1, which is the bundle pitch in the
   * form people actually act on during the season.
   *
   * Re-activate it when the season ends; nothing else needs to change.
   */
  {
    id: "slide-bundles-save",
    title: "Bundles",
    order: 3,
    active: false,
    background: {
      type: "image",
      url: MEDIA.bgBundles,
      dimOverlay: { enabled: true, opacity: 0.55 },
    },
    cards: [],
    overlay: {
      enabled: true,
      subtitle: "Buy the set, pay less",
      title: "Prize Beys Trio — 10% off",
      description:
        "CobaltDrake 4-60F, AeroPegasus 3-70A and ValkyrieVolt S4-70V in one order, ₹43,200 instead of ₹48,000.",
      button: {
        id: "slide-bundles-cta",
        text: "Browse bundles",
        link: String(ROUTES.PUBLIC.BUNDLES),
        variant: "primary",
        openInNewTab: false,
      },
    },
    settings: SLIDE_SETTINGS,
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
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
    // Moved 2 → 6 to free the top slots for the two promo slides added
    // 2026-10-21. A disabled slide keeps a slot so re-enabling restores its
    // position; it does not need an EARLY one.
    order: 6,
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
    /*
     * 🛑 DISABLED 2026-10-21 — not because it is broken, but because it is a
     * DUPLICATE. "Complete your collection → Start browsing → /products" is
     * the hero's first card in different words, and the hero says it above
     * the fold with a picture. `MAX_ACTIVE_SLIDES` is 5 and the carousel now
     * has two promo slides with something specific to say (a live cashback
     * code, a priced bundle), so the generic one gives up its slot.
     */
    order: 7,
    active: false,
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
      url: MEDIA.bgPreorders,
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
      url: MEDIA.bgAuthenticity,
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
    // Moved 6 → 8: `slide-beyblade-auction` now holds 6, and two slides on
    // one order is the collision the header warns about —
    // `MarketplaceHomepageView` tie-breaks on `updatedAt` then
    // `id.localeCompare`, making the running order alphabetical by accident.
    order: 8,
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

/*
 * ── EVENT-OWNED SLIDES ───────────────────────────────────────────────────
 *
 * An event that carries a `carouselConfig` generates its own slide, through
 * the one builder both this file and `push-editorial-content.mjs` consume.
 *
 * 🛑 THIS IS WHY `slide-festive-cashback` ABOVE IS NOW `active: false`.
 * The homepage slide advertising the Diwali offer and the event page it links
 * to were two separately-edited documents, and they drifted: the slide said
 * "Diwali: 10% cashback on every order" long after the event had been
 * rebranded to "Diwali to New Year: Four Offers, Three Months". Neither edit
 * knew about the other and nothing reported the disagreement.
 *
 * The replacement is generated FROM the event, so the headline cannot say
 * something the page does not. Its id is `slide-event-festive-cashback-10`
 * (derived from the event id), which is deliberately NOT the old slide's id —
 * a merge-write onto the old id would inherit its stale overlay.
 *
 * `buildSlidesFromEvents` throws if the active count exceeds
 * `MAX_ACTIVE_SLIDES`, counting ONLY event-owned slides. The hand-written
 * ones above are counted here, together with them, because the rail renders
 * one combined list and five is the ceiling for the whole thing.
 */
const _eventSlides = buildSlidesFromEvents(
  eventsSeedData,
  (event) => String(ROUTES.PUBLIC.EVENT_DETAIL(event.slug ?? event.id)),
  "user-admin-letitrip",
);

const _allSlides = [..._rawSlides, ..._eventSlides];

const _activeTotal = _allSlides.filter((s) => s.active).length;
if (_activeTotal > MAX_ACTIVE_SLIDES) {
  throw new Error(
    `carousel-slides-seed-data: ${_activeTotal} active slides across hand-written ` +
      `(${_rawSlides.filter((s) => s.active).length}) and event-owned ` +
      `(${_eventSlides.filter((s) => s.active).length}), but MAX_ACTIVE_SLIDES is ` +
      `${MAX_ACTIVE_SLIDES}. HeroCarousel renders the first five; the rest would be ` +
      `authored, stored and never seen. Deactivate one, or fold several promotions ` +
      `into one \`placement: "cards"\` slide — that is what the six zones are for.`,
  );
}

export const carouselSlidesSeedData: Partial<CarouselSlideDocument>[] = _allSlides.map((s) => ({
  cards: [] as CarouselSlideDocument["cards"],
  ...s,
}));
