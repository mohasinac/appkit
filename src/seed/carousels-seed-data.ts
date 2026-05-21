/*
 * WHY: Seeds the hero carousel container that references slide IDs.
 * WHAT: 1 active carousel (homepage hero). slideIds populated after carousel-slides seed.
 *
 * @tag domain:carousel,homepage
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
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
      "slide-blue-eyes-auction",
      "slide-exodia-hunt",
      "slide-gx-era",
      "slide-psa-graded",
    ],
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },
];
