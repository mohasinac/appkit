/*
 * WHY: Seeds 6 carousel slides for the marketplace homepage hero carousel.
 * WHAT: 5 active + 1 inactive. Picsum.photos placeholder backgrounds (deterministic,
 * free, no API key) with dim overlay, CTAs for shop/auctions/bundles/pre-orders/graded.
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
import { seedExtMedia } from "./_helpers/media";
import { ROUTES } from "../next/routing/route-map";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawSlides: Partial<CarouselSlideDocument>[] = [
  {
    id: "slide-hero-homepage",
    title: "India's Largest Collectibles Marketplace",
    order: 1,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://picsum.photos/seed/carousel-hero-homepage-20260101/1600/700"),
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
  },
  {
    id: "slide-beyblade-auction",
    title: "Rare Auctions Live Now",
    order: 2,
    active: true,
    background: {
      type: "video",
      // Direct MP4 URL, deliberately NOT wrapped in seedExtMedia() — that
      // helper routes through /api/media/ext, which only serves images
      // (rejects non-image content-type with 400). MediaVideo watermarks
      // video client-side instead, so the raw external URL is correct here.
      url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      thumbnail: seedExtMedia("https://picsum.photos/seed/carousel-auctions-live-20260101/1600/700"),
      dimOverlay: { enabled: true, opacity: 0.4 },
    },
    link: { url: String(ROUTES.PUBLIC.AUCTIONS), openInNewTab: false },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(55),
    updatedAt: daysAgo(2),
  },
  {
    id: "slide-beyblade-collection-hunt",
    title: "Complete Your Collection",
    order: 3,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://picsum.photos/seed/carousel-complete-collection-20260101/1600/700"),
      dimOverlay: { enabled: true, opacity: 0.45 },
    },
    link: { url: String(ROUTES.PUBLIC.PRODUCTS), openInNewTab: false },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(50),
    updatedAt: daysAgo(5),
  },
  {
    id: "slide-preorders-open",
    title: "Pre-Orders Now Open",
    order: 4,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://picsum.photos/seed/carousel-preorders-open-20260101/1600/700"),
      dimOverlay: { enabled: true, opacity: 0.4 },
    },
    link: { url: String(ROUTES.PUBLIC.PRE_ORDERS), openInNewTab: false },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(4),
  },
  {
    id: "slide-authenticated-originals",
    title: "Authenticated Takara-Tomy Originals",
    order: 5,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://picsum.photos/seed/carousel-authenticated-originals-20260101/1600/700"),
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    link: { url: String(ROUTES.PUBLIC.CATEGORY_DETAIL("category-spinning-tops")), openInNewTab: false },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(3),
  },
  {
    id: "slide-upcoming-promo",
    title: "Upcoming Tournament Season Promo",
    order: 6,
    active: false,
    background: {
      type: "image",
      url: seedExtMedia("https://picsum.photos/seed/carousel-tournament-promo-20260101/1600/700"),
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];

export const carouselSlidesSeedData: Partial<CarouselSlideDocument>[] = _rawSlides.map((s) => ({
  cards: [] as any[],
  ...s,
}));
