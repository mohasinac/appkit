/*
 * WHY: Seeds the hero carousel container that references slide IDs.
 * WHAT: 1 active carousel (homepage hero). slideIds populated after carousel-slides seed.
 *
 * @tag domain:carousel,homepage
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { CarouselDocument } from "../features/homepage/schemas";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export const carouselsSeedData: CarouselDocument[] = [
  {
    id: "carousel-hero-default",
    name: "Homepage Hero",
    status: "active",
    slideIds: [
      "slide-hero-homepage",
      "slide-beyblade-auction",
      "slide-beyblade-collection-hunt",
      "slide-preorders-open",
      // Was "slide-psa-graded", which has never existed in
      // carousel-slides-seed-data.ts. `getCarouselWithSlides` filters missing
      // refs away, so it failed silently rather than erroring.
      "slide-authenticated-originals",
    ],
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },
];
