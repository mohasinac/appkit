/**
 * Carousel Domain Actions — appkit
 *
 * Pure async functions for carousel slide CRUD. No auth, no rate-limit.
 * Called by letitrip thin wrappers which handle auth + rate limiting.
 */

import { carouselRepository } from "../repository/carousel.repository";
import { NotFoundError, ValidationError } from "../../../errors/index";
import { serverLogger } from "../../../monitoring/index";
import type {
  CarouselSlideDocument,
  CarouselSlideCreateInput,
} from "../schemas/firestore";

export interface CarouselSlideInput {
  title: string;
  order?: number;
  active?: boolean;
  media: {
    type: "image" | "video";
    url: string;
    alt: string;
    thumbnail?: string;
  };
  link?: { url: string; openInNewTab: boolean };
  mobileMedia?: { type: "image" | "video"; url: string; alt: string };
  cards?: Record<string, unknown>[];
  overlay?: Record<string, unknown>;
}

export type CarouselSlideUpdateInput = Partial<CarouselSlideInput>;

export async function createCarouselSlide(
  adminId: string,
  input: CarouselSlideInput,
): Promise<CarouselSlideDocument> {
  const slide = await carouselRepository.create({
    ...input,
    createdBy: adminId,
  } as unknown as CarouselSlideCreateInput);
  serverLogger.info("createCarouselSlide", { adminId, slideId: slide.id });
  return slide;
}

export async function updateCarouselSlide(
  adminId: string,
  id: string,
  input: CarouselSlideUpdateInput,
): Promise<CarouselSlideDocument> {
  const existing = await carouselRepository.findById(id);
  if (!existing) throw new NotFoundError("Carousel slide not found");
  const updated = await carouselRepository.update(id, input as any);
  serverLogger.info("updateCarouselSlide", { adminId, slideId: id });
  return updated;
}

export async function deleteCarouselSlide(
  adminId: string,
  id: string,
): Promise<void> {
  const existing = await carouselRepository.findById(id);
  if (!existing) throw new NotFoundError("Carousel slide not found");
  await carouselRepository.delete(id);
  serverLogger.info("deleteCarouselSlide", { adminId, slideId: id });
}

export async function reorderCarouselSlides(
  adminId: string,
  slideIds: string[],
): Promise<CarouselSlideDocument[]> {
  if (!slideIds.length)
    throw new ValidationError("No slides provided for reorder");
  await carouselRepository.reorderSlides(
    slideIds.map((id, index) => ({ id, order: index + 1 })),
  );
  const updatedSlides = await carouselRepository.findAll();
  updatedSlides.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  serverLogger.info("reorderCarouselSlides", {
    adminId,
    count: slideIds.length,
  });
  return updatedSlides;
}

export async function listActiveCarouselSlides(): Promise<
  CarouselSlideDocument[]
> {
  const slides = await carouselRepository.getActiveSlides();
  return slides.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function listAllCarouselSlides(): Promise<
  CarouselSlideDocument[]
> {
  return carouselRepository.findAll();
}

export async function getCarouselSlideById(
  id: string,
): Promise<CarouselSlideDocument | null> {
  return carouselRepository.findById(id);
}
