import "server-only";

/**
 * Carousel Repository
 *
 * Manages homepage carousel slides with grid card system
 */

import {
  BaseRepository,
  prepareForFirestore,
  type SieveModel,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import { FieldValue } from "firebase-admin/firestore";
import {
  CAROUSEL_SLIDES_COLLECTION,
  CarouselSlideDocument,
  CarouselSlideCreateInput,
  MAX_ACTIVE_SLIDES,
  DEFAULT_CAROUSEL_SLIDE_DATA,
  canActivateSlide,
  createCarouselId,
} from "../schemas";
import { DatabaseError } from "../../../errors";

/**
 * Repository for carousel slide management
 */
class CarouselRepository extends BaseRepository<CarouselSlideDocument> {
  constructor() {
    super(CAROUSEL_SLIDES_COLLECTION);
  }

  /**
   * Sieve field definitions for admin paginated/filtered listing
   */
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    id: { canFilter: true, canSort: false },
    title: { canFilter: true, canSort: true },
    active: { canFilter: true, canSort: false },
    order: { canFilter: true, canSort: true },
    createdBy: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
    updatedAt: { canFilter: true, canSort: true },
  };

  /**
   * Paginated carousel slide list for admin.
   * Use `?filters=active==true&sorts=order&pageSize=20` query params.
   */
  async list(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<CarouselSlideDocument>> {
    return this.sieveQuery<CarouselSlideDocument>(
      model,
      CarouselRepository.SIEVE_FIELDS,
      { defaultPageSize: 20, maxPageSize: 100 },
    );
  }

  /**
   * Create new carousel slide with SEO-friendly ID
   */
  async create(
    input: CarouselSlideCreateInput,
  ): Promise<CarouselSlideDocument> {
    // Generate carousel ID from title
    const id = createCarouselId(input.title);

    const slideData: Omit<CarouselSlideDocument, "id"> = {
      ...DEFAULT_CAROUSEL_SLIDE_DATA,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(slideData));

    return { id, ...slideData };
  }

  /**
   * Get all active carousel slides (sorted by order)
   *
   * @returns Promise<CarouselSlideDocument[]>
   */
  async getActiveSlides(): Promise<CarouselSlideDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("active", "==", true)
        .orderBy("order", "asc")
        .limit(MAX_ACTIVE_SLIDES)
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<CarouselSlideDocument>(doc),
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve active slides: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get all inactive carousel slides
   *
   * @returns Promise<CarouselSlideDocument[]>
   */
  async getInactiveSlides(): Promise<CarouselSlideDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("active", "==", false)
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<CarouselSlideDocument>(doc),
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve inactive slides: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get slides created by specific user
   *
   * @param userId - Creator user ID
   * @returns Promise<CarouselSlideDocument[]>
   */
  async getSlidesByCreator(userId: string): Promise<CarouselSlideDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("createdBy", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<CarouselSlideDocument>(doc),
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve slides by creator: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Activate a carousel slide
   * Throws error if max active limit reached
   *
   * @param slideId - Slide ID to activate
   * @returns Promise<CarouselSlideDocument>
   */
  async activateSlide(slideId: string): Promise<CarouselSlideDocument> {
    try {
      // Check current active count
      const activeSlides = await this.getActiveSlides();

      if (!canActivateSlide(activeSlides.length)) {
        throw new DatabaseError(
          `Cannot activate slide: Maximum ${MAX_ACTIVE_SLIDES} active slides allowed`,
        );
      }

      await this.db.collection(this.collection).doc(slideId).update({
        active: true,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(slideId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to activate slide: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Deactivate a carousel slide
   *
   * @param slideId - Slide ID to deactivate
   * @returns Promise<CarouselSlideDocument>
   */
  async deactivateSlide(slideId: string): Promise<CarouselSlideDocument> {
    try {
      await this.db.collection(this.collection).doc(slideId).update({
        active: false,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(slideId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to deactivate slide: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Reorder active slides
   *
   * @param slideOrders - Array of {id, order} objects
   * @returns Promise<void>
   */
  async reorderSlides(
    slideOrders: Array<{ id: string; order: number }>,
  ): Promise<void> {
    try {
      const batch = this.db.batch();
      const now = new Date();

      for (const { id, order } of slideOrders) {
        const ref = this.db.collection(this.collection).doc(id);
        batch.update(ref, {
          order,
          updatedAt: now,
        });
      }

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to reorder slides: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Swap active/inactive status between two slides
   * Useful for replacing active slide with inactive one
   *
   * @param activeSlideId - Currently active slide ID
   * @param inactiveSlideId - Currently inactive slide ID
   * @returns Promise<void>
   */
  async swapSlides(
    activeSlideId: string,
    inactiveSlideId: string,
  ): Promise<void> {
    try {
      const batch = this.db.batch();
      const now = new Date();

      // Deactivate current active slide
      const activeRef = this.db.collection(this.collection).doc(activeSlideId);
      batch.update(activeRef, { active: false, updatedAt: now });

      // Activate inactive slide
      const inactiveRef = this.db
        .collection(this.collection)
        .doc(inactiveSlideId);
      batch.update(inactiveRef, { active: true, updatedAt: now });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to swap slides: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get active slide count
   *
   * @returns Promise<number>
   */
  async getActiveCount(): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("active", "==", true)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count active slides: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check if more slides can be activated
   *
   * @returns Promise<boolean>
   */
  async canActivateMore(): Promise<boolean> {
    const activeCount = await this.getActiveCount();
    return canActivateSlide(activeCount);
  }

  /**
   * Increment view count for a carousel slide (fire-and-forget analytics).
   * Called asynchronously from the public GET /api/carousel route.
   * Updates stats.views (+1) and stats.lastViewed (now).
   *
   * @param slideId - Slide ID to record a view for
   */
  async incrementViews(slideId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collection)
        .doc(slideId)
        .update({
          "stats.views": FieldValue.increment(1),
          "stats.lastViewed": new Date(),
        });
    } catch (_e) {
      // Swallow errors — analytics failures must not break the carousel response
    }
  }
}

// Export singleton instance
export const carouselRepository = new CarouselRepository();
