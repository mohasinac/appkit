/*
 * WHY: Seeds 6 carousel slides for YGO marketplace homepage hero carousel.
 * WHAT: 5 active + 1 inactive. YGO card art backgrounds with dim overlay, CTAs for shop/auctions/bundles/pre-orders/graded.
 *
 * EXPORTS:
 *   carouselSlidesSeedData — Array of Partial<CarouselSlideDocument> for seed runner
 *
 * @tag domain:carousel,homepage
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { CarouselSlideDocument } from "../features/homepage/schemas";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawSlides: Partial<CarouselSlideDocument>[] = [
  {
    id: "slide-hero-homepage",
    title: "India's #1 YGO Collectibles Marketplace",
    order: 1,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/46986414.jpg"),
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
  },
  {
    id: "slide-blue-eyes-auction",
    title: "Blue-Eyes White Dragon Auctions Live",
    order: 2,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/89631139.jpg"),
      dimOverlay: { enabled: true, opacity: 0.4 },
    },
    link: { url: "/auctions", openInNewTab: false },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(55),
    updatedAt: daysAgo(2),
  },
  {
    id: "slide-exodia-hunt",
    title: "Complete Your Exodia Set",
    order: 3,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/33396948.jpg"),
      dimOverlay: { enabled: true, opacity: 0.45 },
    },
    link: { url: "/products?q=exodia", openInNewTab: false },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(50),
    updatedAt: daysAgo(5),
  },
  {
    id: "slide-gx-era",
    title: "GX Era Pre-Orders Now Open",
    order: 4,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/89943723.jpg"),
      dimOverlay: { enabled: true, opacity: 0.4 },
    },
    link: { url: "/pre-orders", openInNewTab: false },
    settings: { autoplayDelayMs: 5000, height: "tall" },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(4),
  },
  {
    id: "slide-psa-graded",
    title: "PSA Graded Slabs — Authenticated Cards",
    order: 5,
    active: true,
    background: {
      type: "image",
      url: seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/38033121.jpg"),
      dimOverlay: { enabled: true, opacity: 0.5 },
    },
    link: { url: "/categories/category-graded-cards", openInNewTab: false },
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
      url: seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/83764718.jpg"),
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
