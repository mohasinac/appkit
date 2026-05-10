import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  SUBLISTING_CATEGORIES_COLLECTION,
  SUBLISTING_CATEGORY_PREFIX,
  type SublistingCategoryCreateInput,
  type SublistingCategoryDocument,
  type SublistingCategoryUpdateInput,
} from "../schemas/sublisting-categories";
import { PRODUCT_COLLECTION } from "../schemas/firestore";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class SublistingCategoriesRepository extends BaseRepository<SublistingCategoryDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    name: { canFilter: true, canSort: true },
    slug: { canFilter: true, canSort: false },
    productCount: { canFilter: false, canSort: true },
    createdAt: { canFilter: false, canSort: true },
  };

  constructor() {
    super(SUBLISTING_CATEGORIES_COLLECTION);
  }

  generateId(name: string): string {
    const base = slugify(name);
    return base.startsWith(SUBLISTING_CATEGORY_PREFIX)
      ? base
      : `${SUBLISTING_CATEGORY_PREFIX}${base}`;
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<SublistingCategoryDocument>> {
    return this.sieveQuery<SublistingCategoryDocument>(
      model,
      SublistingCategoriesRepository.SIEVE_FIELDS,
    );
  }

  async findBySlug(slug: string): Promise<SublistingCategoryDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      return this.mapDoc<SublistingCategoryDocument>(snapshot.docs[0]);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find sublisting category by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async create(input: SublistingCategoryCreateInput): Promise<SublistingCategoryDocument> {
    try {
      const id = this.generateId(input.name);
      const now = new Date();
      const doc: Omit<SublistingCategoryDocument, "id"> = {
        ...input,
        slug: id,
        productCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await this.db
        .collection(this.collection)
        .doc(id)
        .set(prepareForFirestore(doc));
      return this.findByIdOrFail(id);
    } catch (error) {
      throw new DatabaseError(
        `Failed to create sublisting category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async update(id: string, input: SublistingCategoryUpdateInput): Promise<SublistingCategoryDocument> {
    try {
      await this.db
        .collection(this.collection)
        .doc(id)
        .update({ ...input, updatedAt: new Date() });
      return this.findByIdOrFail(id);
    } catch (error) {
      throw new DatabaseError(
        `Failed to update sublisting category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const batch = this.db.batch();

      // Unlink all member products before deleting the category
      const membersSnap = await this.db
        .collection(PRODUCT_COLLECTION)
        .where("sublistingCategoryId", "==", id)
        .get();

      for (const doc of membersSnap.docs) {
        batch.update(doc.ref, { sublistingCategoryId: null, updatedAt: new Date() });
      }

      batch.delete(this.db.collection(this.collection).doc(id));
      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete sublisting category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /** Returns products/auctions/pre-orders with matching sublistingCategoryId, ordered by price asc. */
  async getListingsByCategoryId(
    categoryId: string,
    limit = 20,
  ): Promise<Record<string, unknown>[]> {
    try {
      const snap = await this.db
        .collection(PRODUCT_COLLECTION)
        .where("sublistingCategoryId", "==", categoryId)
        .where("status", "==", "published")
        .orderBy("price", "asc")
        .limit(limit)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get listings for category ${categoryId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async incrementProductCount(id: string, delta: number): Promise<void> {
    try {
      const { increment } = await import("../../../contracts/field-ops");
      await this.db
        .collection(this.collection)
        .doc(id)
        .update({ productCount: increment(delta), updatedAt: new Date() });
    } catch {
      // Fire-and-forget — count drift is acceptable; a nightly job can reconcile
    }
  }
}

export const sublistingCategoriesRepository = new SublistingCategoriesRepository();
