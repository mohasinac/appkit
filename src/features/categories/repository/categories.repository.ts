import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
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
      throw new DatabaseError(
        `Failed to retrieve category by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getRootCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("tier", "==", 0)
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve root categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getLeafCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("isLeaf", "==", true)
        .where("isActive", "==", true)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CategoryDocument>(doc));
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve leaf categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoriesByTier(tier: number): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("tier", "==", tier)
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve categories by tier: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoriesByRootId(rootId: string): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("rootId", "==", rootId)
        .orderBy("tier", "asc")
        .orderBy("order", "asc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CategoryDocument>(doc));
    } catch (error) {
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
        .orderBy("order", "asc")
        .get();

      const parent = await this.findById(parentId);
      if (!parent) return [];

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter(
          (category) =>
            category.parentIds[category.parentIds.length - 1] === parentId,
        );
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve children categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getFeaturedCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("isFeatured", "==", true)
        .where("isActive", "==", true)
        .orderBy("featuredPriority", "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
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
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      const brands = snapshot.docs.map((doc) =>
        this.mapDoc<CategoryDocument>(doc),
      );
      return limit > 0 ? brands.slice(0, limit) : brands;
    } catch (error) {
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
        "metrics.productCount": FieldValue.increment(productDelta),
        "metrics.auctionCount": FieldValue.increment(auctionDelta),
        "metrics.totalProductCount": FieldValue.increment(productDelta),
        "metrics.totalAuctionCount": FieldValue.increment(auctionDelta),
        "metrics.totalItemCount": FieldValue.increment(
          productDelta + auctionDelta,
        ),
        "metrics.lastUpdated": now,
        updatedAt: now,
      };

      if (productId && productDelta !== 0) {
        updates["metrics.productIds"] =
          productDelta > 0
            ? FieldValue.arrayUnion(productId)
            : FieldValue.arrayRemove(productId);
      }

      batch.update(categoryRef, updates);

      for (const ancestorId of category.parentIds) {
        const ancestorRef = this.db.collection(this.collection).doc(ancestorId);
        batch.update(ancestorRef, {
          "metrics.totalProductCount": FieldValue.increment(productDelta),
          "metrics.totalAuctionCount": FieldValue.increment(auctionDelta),
          "metrics.totalItemCount": FieldValue.increment(
            productDelta + auctionDelta,
          ),
          "metrics.lastUpdated": now,
          updatedAt: now,
        });
      }

      await batch.commit();
    } catch (error) {
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
          childrenIds: FieldValue.arrayRemove(categoryId),
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
          childrenIds: FieldValue.arrayUnion(categoryId),
          isLeaf: false,
          updatedAt: now,
        });
      }

      await batch.commit();

      return this.findByIdOrFail(categoryId);
    } catch (error) {
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
      throw new DatabaseError(
        `Failed to toggle featured status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export const categoriesRepository = new CategoriesRepository();
