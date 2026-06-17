import { normalizeError } from "../../../errors/normalize";
import { DatabaseError, ValidationError } from "../../../errors";
import { ERROR_MESSAGES } from "../../../errors/messages";
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
import { PRODUCT_FIELDS, COUPON_FIELDS } from "../../../constants/field-names";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// audit-unknown-ok: error-handler entry point — accepts thrown values of any shape
function failureMessage(prefix: string, error: unknown): string {
  return `${prefix}: ${error instanceof Error ? error.message : "Unknown error"}`;
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
      if (filter.scope) q = q.where(COUPON_FIELDS.SCOPE, "==", filter.scope);
      if (filter.storeId) q = q.where(PRODUCT_FIELDS.STORE_ID, "==", filter.storeId);
      if (typeof filter.isActive === "boolean") {
        q = q.where("isActive", "==", filter.isActive); // audit-field-name-ok — product_features collection has no dedicated FIELDS constant
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
      void normalizeError(error);
      throw new DatabaseError(
        failureMessage(ERROR_MESSAGES.PRODUCT_FEATURES.FETCH_FAILED, error),
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
      throw new ValidationError(
        ERROR_MESSAGES.PRODUCT_FEATURES.SCOPE_STORE_REQUIRES_STORE_ID,
      );
    }
    if (input.scope === "platform" && input.storeId) {
      throw new ValidationError(
        ERROR_MESSAGES.PRODUCT_FEATURES.SCOPE_PLATFORM_DISALLOWS_STORE_ID,
      );
    }
    if (input.scope === "store" && input.storeId) {
      const existing = await this.countByStore(input.storeId);
      if (existing >= MAX_STORE_CUSTOM_FEATURES) {
        throw new ValidationError(
          `${ERROR_MESSAGES.PRODUCT_FEATURES.STORE_CAP_REACHED} (${MAX_STORE_CUSTOM_FEATURES})`,
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
        failureMessage(ERROR_MESSAGES.PRODUCT_FEATURES.CREATE_FAILED, error),
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
      void normalizeError(error);
      throw new DatabaseError(
        failureMessage(ERROR_MESSAGES.PRODUCT_FEATURES.UPDATE_FAILED, error),
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
        .where(PRODUCT_FIELDS.FEATURES, "array-contains", id)
        .limit(1)
        .get();
      if (!referencing.empty) {
        throw new ValidationError(
          ERROR_MESSAGES.PRODUCT_FEATURES.DELETE_REFERENCED,
        );
      }
      await this.db.collection(this.collection).doc(id).delete();
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError(
        failureMessage(ERROR_MESSAGES.PRODUCT_FEATURES.DELETE_FAILED, error),
      );
    }
  }

  async countByStore(storeId: string): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(COUPON_FIELDS.SCOPE, "==", "store")
        .where(PRODUCT_FIELDS.STORE_ID, "==", storeId)
        .get();
      return snap.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        failureMessage("Failed to count store features", error),
      );
    }
  }
}

export const productFeaturesRepository = new ProductFeaturesRepository();
