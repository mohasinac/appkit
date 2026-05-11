/**
 * Named Carousels Repository (EX2)
 *
 * Manages CarouselDocument records — each named carousel holds an ordered list
 * of up to MAX_SLIDES_PER_CAROUSEL slide IDs. The default hero carousel
 * continues to operate without a CarouselDocument (carouselId = null).
 */

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import {
  CAROUSELS_COLLECTION,
  MAX_SLIDES_PER_CAROUSEL,
  TooManySlidesError,
  CarouselDocument,
  CarouselCreateInput,
  CarouselUpdateInput,
} from "../schemas";
import { DatabaseError } from "../../../errors";
import { getAdminDb } from "../../../providers/db-firebase";

export class CarouselsRepository extends BaseRepository<CarouselDocument> {
  constructor() {
    super(CAROUSELS_COLLECTION);
  }

  /** All named carousels, ordered by name. */
  async listCarousels(): Promise<CarouselDocument[]> {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection(CAROUSELS_COLLECTION)
        .orderBy("name")
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CarouselDocument);
    } catch (err) {
      throw new DatabaseError("Failed to list carousels", err);
    }
  }

  /** Create a new named carousel with zero slides. */
  async createCarousel(name: string, createdBy: string): Promise<CarouselDocument> {
    const input: CarouselCreateInput = {
      name,
      status: "draft",
      slideIds: [],
      createdBy,
    };
    return this.create(input) as Promise<CarouselDocument>;
  }

  /** Update name or status. */
  async updateCarousel(id: string, patch: CarouselUpdateInput): Promise<void> {
    try {
      const db = getAdminDb();
      await db
        .collection(CAROUSELS_COLLECTION)
        .doc(id)
        .update(prepareForFirestore(patch));
    } catch (err) {
      throw new DatabaseError("Failed to update carousel", err);
    }
  }

  /**
   * Add a slide ID to a carousel. Throws TooManySlidesError if already at max.
   * Appends to the end of slideIds.
   */
  async addSlide(carouselId: string, slideId: string): Promise<void> {
    try {
      const db = getAdminDb();
      const ref = db.collection(CAROUSELS_COLLECTION).doc(carouselId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new DatabaseError("Carousel not found");
        const data = snap.data() as CarouselDocument;
        if ((data.slideIds ?? []).length >= MAX_SLIDES_PER_CAROUSEL) {
          throw new TooManySlidesError();
        }
        const updatedIds = [...(data.slideIds ?? []), slideId];
        tx.update(ref, prepareForFirestore({ slideIds: updatedIds }));
      });
    } catch (err) {
      if (err instanceof TooManySlidesError) throw err;
      throw new DatabaseError("Failed to add slide to carousel", err);
    }
  }

  /** Remove a slide ID from a carousel. */
  async removeSlide(carouselId: string, slideId: string): Promise<void> {
    try {
      const db = getAdminDb();
      const ref = db.collection(CAROUSELS_COLLECTION).doc(carouselId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new DatabaseError("Carousel not found");
        const data = snap.data() as CarouselDocument;
        const updatedIds = (data.slideIds ?? []).filter((id) => id !== slideId);
        tx.update(ref, prepareForFirestore({ slideIds: updatedIds }));
      });
    } catch (err) {
      throw new DatabaseError("Failed to remove slide from carousel", err);
    }
  }

  /**
   * Replace the full slideIds order. Length must not exceed MAX_SLIDES_PER_CAROUSEL.
   */
  async reorderSlides(carouselId: string, orderedSlideIds: string[]): Promise<void> {
    if (orderedSlideIds.length > MAX_SLIDES_PER_CAROUSEL) {
      throw new TooManySlidesError();
    }
    try {
      const db = getAdminDb();
      await db
        .collection(CAROUSELS_COLLECTION)
        .doc(carouselId)
        .update(prepareForFirestore({ slideIds: orderedSlideIds }));
    } catch (err) {
      throw new DatabaseError("Failed to reorder slides", err);
    }
  }

  /**
   * Fetch a carousel together with the full slide documents for its slideIds.
   * Slides are returned in slideIds order.
   */
  async getCarouselWithSlides(
    carouselId: string,
  ): Promise<{ carousel: CarouselDocument; slides: import("../schemas").CarouselSlideDocument[] } | null> {
    try {
      const db = getAdminDb();
      const carouselSnap = await db.collection(CAROUSELS_COLLECTION).doc(carouselId).get();
      if (!carouselSnap.exists) return null;
      const carousel = { id: carouselSnap.id, ...carouselSnap.data() } as CarouselDocument;

      if (!carousel.slideIds?.length) return { carousel, slides: [] };

      const slideSnaps = await Promise.all(
        carousel.slideIds.map((sid) =>
          db.collection("carouselSlides").doc(sid).get(),
        ),
      );
      const slides = slideSnaps
        .filter((s) => s.exists)
        .map((s) => ({
          id: s.id,
          ...s.data(),
        })) as import("../schemas").CarouselSlideDocument[];

      return { carousel, slides };
    } catch (err) {
      throw new DatabaseError("Failed to get carousel with slides", err);
    }
  }
}

export const carouselsRepository = new CarouselsRepository();
