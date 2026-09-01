/*
 * WHY: Seeds 6 carousel slides for the marketplace homepage promo carousel.
 * WHAT: 5 active + 1 inactive. Deterministic Picsum backgrounds with a dim
 * overlay, plus a headline / supporting line / CTA on each.
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
import { seedPhoto } from "./_helpers/media";
import { ROUTES } from "../next/routing/route-map";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

// "medium" matches the carousel section's own config: the carousel now sits
// under a full welcome hero, so a viewport-height slide would push the whole
// page below the fold.
const SLIDE_SETTINGS = { autoplayDelayMs: 6000, height: "medium" as const };

const _rawSlides: Partial<CarouselSlideDocument>[] = [
  {
    id: "slide-hero-homepage",
    title: "Three ways to shop",
    order: 1,
    active: true,
    background: {
      type: "image",
      url: seedPhoto("carousel-hero-homepage-20260101", 1600, 700),
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
        background: { type: "image", url: seedPhoto("carousel-card-shop-now", 600, 600), dimOverlay: { enabled: true, opacity: 0.45 } },
        content: {
          eyebrow: "Buy now",
          title: "Ready to ship",
          description: "In-stock listings from verified sellers.",
        },
        buttons: [{ id: "card-hero-shop-now-cta", text: "Shop products", href: String(ROUTES.PUBLIC.PRODUCTS), variant: "primary" }],
        hover: { effect: "scale" },
      },
      {
        id: "card-hero-bid",
        zone: 2,
        mobileZone: 2,
        background: { type: "image", url: seedPhoto("carousel-card-bid", 600, 600), dimOverlay: { enabled: true, opacity: 0.45 } },
        content: {
          eyebrow: "Bid",
          title: "Live auctions",
          description: "Place a bid before the timer runs out.",
        },
        buttons: [{ id: "card-hero-bid-cta", text: "Browse auctions", href: String(ROUTES.PUBLIC.AUCTIONS), variant: "primary" }],
        hover: { effect: "scale" },
      },
      {
        id: "card-hero-reserve",
        zone: 3,
        mobileZone: 2,
        background: { type: "image", url: seedPhoto("carousel-card-reserve", 600, 600), dimOverlay: { enabled: true, opacity: 0.45 } },
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
    id: "slide-beyblade-auction",
    title: "Live auctions",
    order: 2,
    active: true,
    background: {
      type: "video",
      // Direct MP4 URL, deliberately NOT wrapped in seedExtMedia() — that
      // helper routes through /api/media/ext, which only serves images
      // (rejects non-image content-type with 400). MediaVideo watermarks
      // video client-side instead, so the raw external URL is correct here.
      url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // audit-seed-external-url-ok: raw <video> src, /api/media/ext is image-only (Root Cause #27)
      thumbnail: seedPhoto("carousel-auctions-live-20260101", 1600, 700),
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
      url: seedPhoto("carousel-complete-collection-20260101", 1600, 700),
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
      url: seedPhoto("carousel-preorders-open-20260101", 1600, 700),
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
    id: "slide-authenticated-originals",
    title: "Sell on the marketplace",
    order: 5,
    active: true,
    background: {
      type: "image",
      url: seedPhoto("carousel-authenticated-originals-20260101", 1600, 700),
      dimOverlay: { enabled: true, opacity: 0.55 },
    },
    overlay: {
      enabled: true,
      subtitle: "For sellers",
      title: "Turn your collection into income",
      description: "Open a store in minutes, list for free, and get paid on a predictable schedule.",
      button: {
        id: "slide-sell-cta",
        text: "Start selling",
        link: String(ROUTES.PUBLIC.SELLER_GUIDE),
        variant: "primary",
        openInNewTab: false,
      },
    },
    link: { url: String(ROUTES.PUBLIC.SELLER_GUIDE), openInNewTab: false },
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
      url: seedPhoto("carousel-tournament-promo-20260101", 1600, 700),
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
