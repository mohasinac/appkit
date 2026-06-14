import { normalizeError } from "../../../errors/normalize";
import {
  increment,
  arrayUnion,
  arrayRemove,
} from "../../../contracts/field-ops";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import {
  CATEGORY_FIELDS,
  CATEGORIES_COLLECTION,
  MIN_ITEMS_FOR_FEATURED,
  buildCategoryTree,
  calculateCategoryFields,
  canBeFeatured,
  createCategoryId,
  isValidCategoryMove,
  type CategoryCreateInput,
  type CategoryDocument,
  type CategoryMoveInput,
  type CategoryTreeNode,
} from "../schemas";

export class CategoriesRepository extends BaseRepository<CategoryDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    name: { canFilter: true, canSort: true },
    slug: { canFilter: true, canSort: false },
    tier: { canFilter: true, canSort: true },
    isActive: { canFilter: true, canSort: false },
    isFeatured: { canFilter: true, canSort: false },
    isBrand: { canFilter: true, canSort: false },
    categoryType: { canFilter: true, canSort: false },
    isSearchable: { canFilter: true, canSort: false },
    parentId: { canFilter: true, canSort: false, path: "parentIds" },
    order: { canFilter: true, canSort: true },
    "metrics.productCount": {
      path: "metrics.productCount",
      canFilter: true,
      canSort: true,
    },
    "metrics.totalItemCount": {
      path: "metrics.totalItemCount",
      canFilter: true,
      canSort: true,
    },
    "metrics.auctionCount": {
      path: "metrics.auctionCount",
      canFilter: true,
      canSort: true,
    },
    id: { canFilter: true, canSort: false },
    isLeaf: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
  };

  constructor() {
    super(CATEGORIES_COLLECTION);
  }

  async list(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<CategoryDocument>> {
    return this.sieveQuery<CategoryDocument>(
      model,
      CategoriesRepository.SIEVE_FIELDS,
    );
  }

  async createWithHierarchy(
    input: CategoryCreateInput,
  ): Promise<CategoryDocument> {
    try {
      let parentCategory: CategoryDocument | null = null;
      let rootCategory: CategoryDocument | null = null;
      const parentIds =
        input.parentIds ?? (input.parentId ? [input.parentId] : []);

      if (parentIds.length > 0) {
        const parentId = parentIds[parentIds.length - 1];
        parentCategory = await this.findById(parentId);

        if (parentIds[0] !== parentId) {
          rootCategory = await this.findById(parentIds[0]);
        }
      }

      const newCategoryId = createCategoryId(
        input.name,
        parentCategory?.name,
        rootCategory?.name,
      );

      const hierarchyFields = calculateCategoryFields(
        parentCategory,
        input.name,
        newCategoryId,
      );

      const categoryData: Omit<CategoryDocument, "id"> = {
        ...input,
        ...hierarchyFields,
        metrics: {
          productCount: 0,
          productIds: [],
          auctionCount: 0,
          auctionIds: [],
          totalProductCount: 0,
          totalAuctionCount: 0,
          totalItemCount: 0,
          lastUpdated: new Date(),
        },
        childrenIds: [],
        isLeaf: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(newCategoryId)
        .set(prepareForFirestore(categoryData));

      if (parentCategory) {
        await this.db
          .collection(this.collection)
          .doc(parentCategory.id)
          .update({
            childrenIds: [...parentCategory.childrenIds, newCategoryId],
            isLeaf: false,
            updatedAt: new Date(),
          });
      }

      return this.findByIdOrFail(newCategoryId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to create category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoryBySlug(slug: string): Promise<CategoryDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.SLUG, "==", slug)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      return this.mapDoc<CategoryDocument>(snapshot.docs[0]);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve category by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getRootCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.TIER, "==", 0)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve root categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getLeafCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.IS_LEAF, "==", true)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .limit(500)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CategoryDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve leaf categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoriesByTier(tier: number): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.TIER, "==", tier)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve categories by tier: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoriesByRootId(rootId: string): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.ROOT_ID, "==", rootId)
        .orderBy(CATEGORY_FIELDS.TIER, "asc")
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CategoryDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve categories by rootId: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getChildren(parentId: string): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("parentIds", "array-contains", parentId)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .limit(100)
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter(
          (category) =>
            category.parentIds[category.parentIds.length - 1] === parentId,
        );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve children categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getFeaturedCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.IS_FEATURED, "==", true)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy("featuredPriority", "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve featured categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getBrandCategories(limit = 0): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("isBrand", "==", true)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      const brands = snapshot.docs.map((doc) =>
        this.mapDoc<CategoryDocument>(doc),
      );
      return limit > 0 ? brands.slice(0, limit) : brands;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve brand categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async updateMetrics(
    categoryId: string,
    productDelta: number,
    auctionDelta: number,
    productId?: string,
  ): Promise<void> {
    try {
      const category = await this.findByIdOrFail(categoryId);
      const batch = this.db.batch();
      const now = new Date();

      const categoryRef = this.db.collection(this.collection).doc(categoryId);
      const updates: Record<string, unknown> = {
        "metrics.productCount": increment(productDelta),
        "metrics.auctionCount": increment(auctionDelta),
        "metrics.totalProductCount": increment(productDelta),
        "metrics.totalAuctionCount": increment(auctionDelta),
        "metrics.totalItemCount": increment(productDelta + auctionDelta),
        "metrics.lastUpdated": now,
        updatedAt: now,
      };

      if (productId && productDelta !== 0) {
        updates["metrics.productIds"] =
          productDelta > 0 ? arrayUnion(productId) : arrayRemove(productId);
      }

      batch.update(categoryRef, updates);

      for (const ancestorId of category.parentIds) {
        const ancestorRef = this.db.collection(this.collection).doc(ancestorId);
        batch.update(ancestorRef, {
          "metrics.totalProductCount": increment(productDelta),
          "metrics.totalAuctionCount": increment(auctionDelta),
          "metrics.totalItemCount": increment(productDelta + auctionDelta),
          "metrics.lastUpdated": now,
          updatedAt: now,
        });
      }

      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to update category metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async moveCategory(input: CategoryMoveInput): Promise<CategoryDocument> {
    try {
      const { categoryId, newParentId } = input;
      const category = await this.findByIdOrFail(categoryId);

      if (!isValidCategoryMove(categoryId, newParentId, category)) {
        throw new DatabaseError(
          "Invalid category move: circular reference detected",
        );
      }

      let newParent: CategoryDocument | null = null;
      if (newParentId) {
        newParent = await this.findByIdOrFail(newParentId);
      }

      const hierarchyFields = calculateCategoryFields(
        newParent,
        category.name,
        categoryId,
      );

      const oldParentId =
        category.parentIds.length > 0
          ? category.parentIds[category.parentIds.length - 1]
          : null;

      const batch = this.db.batch();
      const now = new Date();

      const categoryRef = this.db.collection(this.collection).doc(categoryId);
      batch.update(categoryRef, {
        ...hierarchyFields,
        updatedAt: now,
      });

      if (oldParentId) {
        const oldParentRef = this.db
          .collection(this.collection)
          .doc(oldParentId);
        batch.update(oldParentRef, {
          childrenIds: arrayRemove(categoryId),
          updatedAt: now,
        });

        const oldParent = await this.findById(oldParentId);
        if (oldParent && oldParent.childrenIds.length === 1) {
          batch.update(oldParentRef, { isLeaf: true });
        }
      }

      if (newParentId) {
        const newParentRef = this.db
          .collection(this.collection)
          .doc(newParentId);
        batch.update(newParentRef, {
          childrenIds: arrayUnion(categoryId),
          isLeaf: false,
          updatedAt: now,
        });
      }

      await batch.commit();

      return this.findByIdOrFail(categoryId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to move category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async buildTree(rootId?: string): Promise<CategoryTreeNode[]> {
    try {
      let categories: CategoryDocument[];

      if (rootId) {
        categories = await this.getCategoriesByRootId(rootId);
      } else {
        const snapshot = await this.getCollection()
          .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
          .orderBy(CATEGORY_FIELDS.TIER, "asc")
          .orderBy(CATEGORY_FIELDS.ORDER, "asc")
          .get();
        categories = snapshot.docs
          .map((doc) => this.mapDoc<CategoryDocument>(doc))
          .filter((category) => !category.isBrand);
      }

      return buildCategoryTree(categories, rootId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to build category tree: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async toggleFeatured(
    categoryId: string,
    featured: boolean,
  ): Promise<CategoryDocument> {
    try {
      const category = await this.findByIdOrFail(categoryId);

      if (featured && !canBeFeatured(category)) {
        throw new DatabaseError(
          `Category must have at least ${MIN_ITEMS_FOR_FEATURED} items to be featured`,
        );
      }

      await this.db.collection(this.collection).doc(categoryId).update({
        isFeatured: featured,
        updatedAt: new Date(),
      });

      return this.findByIdOrFail(categoryId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to toggle featured status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Cloud Functions: stage metric increments into a caller-owned WriteBatch.
   * The caller must have already fetched `parentIds` for the category.
   */
  updateMetricsInBatch(
    batch: import("firebase-admin/firestore").WriteBatch,
    categoryId: string,
    parentIds: string[],
    productDelta: number,
    auctionDelta: number,
    productId?: string,
  ): void {
    const now = new Date();
    const colRef = this.db.collection(this.collection);

    const directRef = colRef.doc(categoryId);
    const directUpdate: Record<string, unknown> = {
      "metrics.productCount": increment(productDelta),
      "metrics.auctionCount": increment(auctionDelta),
      "metrics.totalProductCount": increment(productDelta),
      "metrics.totalAuctionCount": increment(auctionDelta),
      "metrics.totalItemCount": increment(productDelta + auctionDelta),
      "metrics.lastUpdated": now,
      updatedAt: now,
    };

    if (productId && productDelta !== 0) {
      directUpdate["metrics.productIds"] =
        productDelta > 0 ? arrayUnion(productId) : arrayRemove(productId);
    }
    if (productId && auctionDelta !== 0) {
      directUpdate["metrics.auctionIds"] =
        auctionDelta > 0 ? arrayUnion(productId) : arrayRemove(productId);
    }

    batch.update(directRef, directUpdate);

    for (const ancestorId of parentIds) {
      batch.update(colRef.doc(ancestorId), {
        "metrics.totalProductCount": increment(productDelta),
        "metrics.totalAuctionCount": increment(auctionDelta),
        "metrics.totalItemCount": increment(productDelta + auctionDelta),
        "metrics.lastUpdated": now,
        updatedAt: now,
      });
    }
  }

  /**
   * Cloud Functions: full-overwrite category metrics (used by nightly reconciliation job).
   */
  async setMetrics(
    categoryId: string,
    productCount: number,
    auctionCount: number,
    productIds: string[],
    auctionIds: string[],
  ): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(categoryId)
      .update({
        "metrics.productCount": productCount,
        "metrics.auctionCount": auctionCount,
        "metrics.totalProductCount": productCount,
        "metrics.totalAuctionCount": auctionCount,
        "metrics.totalItemCount": productCount + auctionCount,
        "metrics.productIds": productIds,
        "metrics.auctionIds": auctionIds,
        "metrics.lastUpdated": new Date(),
        updatedAt: new Date(),
      });
  }

  /** SB-UNI — discriminator-keyed listing (sublistings, brands, bundles). */
  async listByType(
    type: import("../types").CategoryType,
    opts: { limit?: number; activeOnly?: boolean } = {},
  ): Promise<CategoryDocument[]> {
    let q: FirebaseFirestore.Query = this.db
      .collection(this.collection)
      .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", type);
    if (opts.activeOnly) q = q.where(CATEGORY_FIELDS.IS_ACTIVE, "==", true);
    if (opts.limit) q = q.limit(opts.limit);
    const snap = await q.get();
    return snap.docs.map((d) => this.mapDoc<CategoryDocument>(d));
  }

  /** SB-UNI — locate a category by slug, optionally constrained by discriminator. */
  async findBySlugAndType(
    slug: string,
    type?: import("../types").CategoryType,
  ): Promise<CategoryDocument | null> {
    let q: FirebaseFirestore.Query = this.db
      .collection(this.collection)
      .where(CATEGORY_FIELDS.SLUG, "==", slug)
      .limit(1);
    if (type) q = q.where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", type);
    const snap = await q.get();
    if (snap.empty) return null;
    return this.mapDoc<CategoryDocument>(snap.docs[0]);
  }

  /**
   * SB-UNI-B — fetch products linked to a sublisting category (legacy
   * sublistingCategoryId field on ProductDocument), ordered by price asc.
   * Used by /api/sublisting-categories/[slug]/listings.
   */
  async getSublistingListings(
    sublistingId: string,
    limit = 20,
  ): Promise<Record<string, unknown>[]> {
    const snap = await this.db
      .collection("products")
      .where("sublistingCategoryId", "==", sublistingId)
      .where(PRODUCT_FIELDS.STATUS, "==", "published")
      .orderBy(PRODUCT_FIELDS.PRICE, "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /**
   * SB-UNI-B — delete a sublisting category and unlink all products
   * that referenced it. Mirrors the cascade behavior of the old
   * SublistingCategoriesRepository.delete().
   */
  async deleteWithSublistingUnlink(categoryId: string): Promise<void> {
    const batch = this.db.batch();
    const productsSnap = await this.db
      .collection("products")
      .where("sublistingCategoryId", "==", categoryId)
      .get();
    for (const doc of productsSnap.docs) {
      batch.update(doc.ref, { sublistingCategoryId: null, updatedAt: new Date() });
    }
    batch.delete(this.db.collection(this.collection).doc(categoryId));
    await batch.commit();
  }

  /**
   * SB-UNI-C — list active brand categories ordered by displayOrder.
   * Replaces the old `brandsRepository.findActive()` call site.
   */
  async findActiveBrands(): Promise<CategoryDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", "brand")
      .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
      .orderBy(CATEGORY_FIELDS.ORDER, "asc")
      .get();
    return snap.docs.map((d) => this.mapDoc<CategoryDocument>(d));
  }

  /**
   * SB-UNI-B — derive the canonical `sublisting-{slug}` ID from a
   * human-entered category name.
   */
  generateSublistingId(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base.startsWith("sublisting-") ? base : `sublisting-${base}`;
  }
}

export const categoriesRepository = new CategoriesRepository();
