import { DatabaseError, ValidationError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  MAX_STORE_CUSTOM_FEATURES,
  PRODUCT_FEATURES_COLLECTION,
  PRODUCT_FEATURE_PREFIX,
  PRODUCT_FEATURE_SIEVE_FIELDS,
  type ProductFeatureCreateInput,
  type ProductFeatureDocument,
  type ProductFeatureProductType,
  type ProductFeatureScope,
  type ProductFeatureUpdateInput,
} from "../schemas/product-features";
import { PRODUCT_COLLECTION } from "../schemas/firestore";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ProductFeatureListFilter {
  scope?: ProductFeatureScope;
  storeId?: string;
  productType?: ProductFeatureProductType;
  isActive?: boolean;
}

export class ProductFeaturesRepository extends BaseRepository<ProductFeatureDocument> {
  constructor() {
    super(PRODUCT_FEATURES_COLLECTION);
  }

  generateId(label: string): string {
    const base = slugify(label);
    return base.startsWith(PRODUCT_FEATURE_PREFIX)
      ? base
      : `${PRODUCT_FEATURE_PREFIX}${base}`;
  }

  async list(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<ProductFeatureDocument>> {
    return this.sieveQuery<ProductFeatureDocument>(
      model,
      PRODUCT_FEATURE_SIEVE_FIELDS,
    );
  }

  /** Filtered fetch used by admin/store UIs and product forms. */
  async listFiltered(
    filter: ProductFeatureListFilter,
  ): Promise<ProductFeatureDocument[]> {
    try {
      let q = this.getCollection() as FirebaseFirestore.Query;
      if (filter.scope) q = q.where("scope", "==", filter.scope);
      if (filter.storeId) q = q.where("storeId", "==", filter.storeId);
      if (typeof filter.isActive === "boolean") {
        q = q.where("isActive", "==", filter.isActive);
      }
      const snap = await q.get();
      let docs = snap.docs.map((d) => this.mapDoc(d));
      if (filter.productType) {
        const wanted = filter.productType;
        docs = docs.filter(
          (d) =>
            d.productTypes.includes("all") || d.productTypes.includes(wanted),
        );
      }
      docs.sort((a, b) => a.displayOrder - b.displayOrder);
      return docs;
    } catch (error) {
      throw new DatabaseError(
        `Failed to list product features: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async listPlatform(): Promise<ProductFeatureDocument[]> {
    return this.listFiltered({ scope: "platform", isActive: true });
  }

  async listForStore(storeId: string): Promise<ProductFeatureDocument[]> {
    return this.listFiltered({ scope: "store", storeId, isActive: true });
  }

  async create(
    input: ProductFeatureCreateInput,
  ): Promise<ProductFeatureDocument> {
    if (input.scope === "store" && !input.storeId) {
      throw new ValidationError("storeId is required for scope=store features");
    }
    if (input.scope === "platform" && input.storeId) {
      throw new ValidationError(
        "storeId must not be set for scope=platform features",
      );
    }
    if (input.scope === "store" && input.storeId) {
      const existing = await this.countByStore(input.storeId);
      if (existing >= MAX_STORE_CUSTOM_FEATURES) {
        throw new ValidationError(
          `Store has reached the maximum of ${MAX_STORE_CUSTOM_FEATURES} custom features`,
        );
      }
    }
    try {
      const id = this.generateId(input.label);
      const now = new Date();
      const doc: Omit<ProductFeatureDocument, "id"> = {
        ...input,
        slug: id,
        createdAt: now,
        updatedAt: now,
      };
      await this.db
        .collection(this.collection)
        .doc(id)
        .set(prepareForFirestore(doc));
      return this.findByIdOrFail(id);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError(
        `Failed to create product feature: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async update(
    id: string,
    input: ProductFeatureUpdateInput,
  ): Promise<ProductFeatureDocument> {
    try {
      await this.db
        .collection(this.collection)
        .doc(id)
        .update({ ...input, updatedAt: new Date() });
      return this.findByIdOrFail(id);
    } catch (error) {
      throw new DatabaseError(
        `Failed to update product feature: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Hard-delete. Throws ValidationError if any product references this feature
   * in product.features[]. Admin/store UIs should surface a "this feature is in
   * use" message instead of silently unlinking.
   */
  async delete(id: string): Promise<void> {
    try {
      const referencing = await this.db
        .collection(PRODUCT_COLLECTION)
        .where("features", "array-contains", id)
        .limit(1)
        .get();
      if (!referencing.empty) {
        throw new ValidationError(
          `Cannot delete product feature ${id}: still referenced by at least one product`,
        );
      }
      await this.db.collection(this.collection).doc(id).delete();
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError(
        `Failed to delete product feature: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async countByStore(storeId: string): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where("scope", "==", "store")
        .where("storeId", "==", storeId)
        .get();
      return snap.size;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count store features: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export const productFeaturesRepository = new ProductFeaturesRepository();
