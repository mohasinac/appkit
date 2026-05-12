/**
 * bundlesRepository — SB1-H (S20 2026-05-12).
 *
 * Provides CRUD + targeted query helpers over the `bundles` collection.
 * Stock sync is best-effort transactional: `markItemSold` flips the matching
 * `bundleItems[].isSold` and re-derives bundle-level `status` from the items.
 *
 * Additive: no consumers wire this in yet. API routes + views land in later
 * SB sessions (S21+).
 */

import {
  BaseRepository,
  prepareForFirestore,
  type DocumentSnapshot,
} from "../../../providers/db-firebase";
import {
  BUNDLES_COLLECTION,
  type BundleDocument,
  type BundleStatus,
} from "../schemas";

const BUNDLE_FIELDS = {
  STORE_ID: "storeId",
  CATEGORY: "category",
  CATEGORY_SLUG: "categorySlug",
  STATUS: "status",
  IS_FEATURED: "isFeatured",
  IS_PROMOTED: "isPromoted",
  PART_OF: "partOfBundleProductIds",
  CREATED_AT: "createdAt",
  SLUG: "slug",
} as const;

export class BundlesRepository extends BaseRepository<BundleDocument> {
  constructor() {
    super(BUNDLES_COLLECTION);
  }

  protected override mapDoc<D = BundleDocument>(snap: DocumentSnapshot): D {
    return super.mapDoc<BundleDocument>(snap) as unknown as D;
  }

  async findAll(): Promise<BundleDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .orderBy(BUNDLE_FIELDS.CREATED_AT, "desc")
      .limit(100)
      .get();
    return snap.docs.map((d) => this.mapDoc<BundleDocument>(d));
  }

  async findByStore(
    storeId: string,
    status?: BundleStatus,
  ): Promise<BundleDocument[]> {
    let query = this.db
      .collection(this.collection)
      .where(BUNDLE_FIELDS.STORE_ID, "==", storeId);
    if (status) query = query.where(BUNDLE_FIELDS.STATUS, "==", status);
    const snap = await query
      .orderBy(BUNDLE_FIELDS.CREATED_AT, "desc")
      .limit(100)
      .get();
    return snap.docs.map((d) => this.mapDoc<BundleDocument>(d));
  }

  async findByCategory(category: string): Promise<BundleDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(BUNDLE_FIELDS.CATEGORY_SLUG, "==", category)
      .where(BUNDLE_FIELDS.STATUS, "==", "published")
      .orderBy(BUNDLE_FIELDS.CREATED_AT, "desc")
      .limit(50)
      .get();
    return snap.docs.map((d) => this.mapDoc<BundleDocument>(d));
  }

  async findFeatured(): Promise<BundleDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(BUNDLE_FIELDS.IS_FEATURED, "==", true)
      .where(BUNDLE_FIELDS.STATUS, "==", "published")
      .orderBy(BUNDLE_FIELDS.CREATED_AT, "desc")
      .limit(20)
      .get();
    return snap.docs.map((d) => this.mapDoc<BundleDocument>(d));
  }

  async findBySlug(slug: string): Promise<BundleDocument | null> {
    const snap = await this.db
      .collection(this.collection)
      .where(BUNDLE_FIELDS.SLUG, "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return this.mapDoc<BundleDocument>(snap.docs[0]);
  }

  async findContainingProduct(productId: string): Promise<BundleDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(BUNDLE_FIELDS.PART_OF, "array-contains", productId)
      .limit(20)
      .get();
    return snap.docs.map((d) => this.mapDoc<BundleDocument>(d));
  }

  override async create(data: Partial<BundleDocument>): Promise<BundleDocument> {
    const id = data.id ?? data.slug;
    if (!id) {
      throw new Error("bundlesRepository.create requires id or slug");
    }
    const now = new Date();
    const doc: BundleDocument = {
      ...(data as BundleDocument),
      id,
      slug: data.slug ?? id,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
      partOfBundleProductIds:
        data.partOfBundleProductIds ??
        (data.bundleItems ?? []).map((it) => it.productId),
    };
    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(doc as unknown as Record<string, unknown>));
    return doc;
  }

  /**
   * SB1-H stock sync — flips the matching `bundleItems[].isSold` to true and
   * re-derives bundle-level `status`. If ANY item is sold, bundle goes to
   * `out_of_stock`. Idempotent: re-marking an already-sold item is a no-op.
   */
  async markItemSold(
    bundleId: string,
    productId: string,
  ): Promise<BundleDocument | null> {
    const ref = this.db.collection(this.collection).doc(bundleId);
    return this.db.runTransaction(async (txn) => {
      const snap = await txn.get(ref);
      if (!snap.exists) return null;
      const current = this.mapDoc<BundleDocument>(
        snap as unknown as DocumentSnapshot,
      );
      const items = current.bundleItems.map((it) =>
        it.productId === productId ? { ...it, isSold: true } : it,
      );
      const anySold = items.some((it) => it.isSold);
      const next: BundleDocument = {
        ...current,
        bundleItems: items,
        status: anySold && current.status === "published"
          ? "out_of_stock"
          : current.status,
        updatedAt: new Date(),
      };
      txn.set(ref, prepareForFirestore(next as unknown as Record<string, unknown>));
      return next;
    });
  }

  /**
   * Read-only stock check — returns the live bundle doc with item flags
   * without mutating anything. Useful when the caller wants to *display*
   * stock state without triggering a write.
   */
  async checkBundleStock(bundleId: string): Promise<BundleDocument | null> {
    const snap = await this.db.collection(this.collection).doc(bundleId).get();
    if (!snap.exists) return null;
    return this.mapDoc<BundleDocument>(snap as unknown as DocumentSnapshot);
  }
}

export const bundlesRepository = new BundlesRepository();
