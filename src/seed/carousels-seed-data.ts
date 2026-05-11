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
    slideIds: [],
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },
];
