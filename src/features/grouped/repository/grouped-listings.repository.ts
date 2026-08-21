import { BaseRepository } from "../../../providers/db-firebase";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import {
  GROUPED_LISTINGS_COLLECTION,
  type GroupedListingDocument,
} from "../schemas/firestore";

export class GroupedListingsRepository extends BaseRepository<GroupedListingDocument> {
  constructor() {
    super(GROUPED_LISTINGS_COLLECTION);
  }

  async listByStore(storeId: string): Promise<{ items: GroupedListingDocument[] }> {
    const items = await this.findBy("storeId", storeId);
    return { items };
  }

  /**
   * Groups a product belongs to, restricted to groups that are actually
   * eligible to render publicly (`isActive` + `visibilityStatus:"visible"` —
   * the latter is recomputed by `onProductStockChange` whenever membership
   * drops below `minActiveMembers`, so this is a read-side trust of that
   * precomputed field, not a fresh recompute).
   */
  async findByProductId(productId: string): Promise<GroupedListingDocument[]> {
    const snap = await this.getCollection()
      .where("productIds", "array-contains", productId)
      .where(PRODUCT_FIELDS.IS_ACTIVE, "==", true)
      .where("visibilityStatus", "==", "visible")
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  /** Groups tagged to a category, same eligibility filter as findByProductId. */
  async findByCategorySlug(categorySlug: string): Promise<GroupedListingDocument[]> {
    const snap = await this.getCollection()
      .where(PRODUCT_FIELDS.CATEGORY_SLUG, "==", categorySlug)
      .where(PRODUCT_FIELDS.IS_ACTIVE, "==", true)
      .where("visibilityStatus", "==", "visible")
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  /** Groups tagged to a brand, same eligibility filter as findByProductId. */
  async findByBrandSlug(brandSlug: string): Promise<GroupedListingDocument[]> {
    const snap = await this.getCollection()
      .where(PRODUCT_FIELDS.BRAND_SLUG, "==", brandSlug)
      .where(PRODUCT_FIELDS.IS_ACTIVE, "==", true)
      .where("visibilityStatus", "==", "visible")
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }
}

export const groupedListingsRepository = new GroupedListingsRepository();
