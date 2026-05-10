import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
import { increment, serverTimestamp } from "../../../contracts/field-ops";
import type { DocumentSnapshot } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { cacheManager } from "../../../core";
import { generateUniqueId, slugify } from "../../../utils";
import {
  PRODUCT_COLLECTION,
  createAuctionId,
  createPreOrderId,
  createProductId,
  ProductStatusValues,
  type ProductCreateInput,
  type ProductDocument,
  type ProductUpdateInput,
} from "../schemas";
import type { ProductStatus } from "../types";

const PRODUCT_FIELDS = {
  STORE_ID: "storeId",
  STATUS: "status",
  FEATURED: "featured",
  CATEGORY: "category",
  SLUG: "slug",
  IS_AUCTION: "isAuction",
  IS_PRE_ORDER: "isPreOrder",
  PRE_ORDER_DELIVERY_DATE: "preOrderDeliveryDate",
  IS_PROMOTED: "isPromoted",
  AUCTION_END_DATE: "auctionEndDate",
  AVAILABLE_QUANTITY: "availableQuantity",
  VIEW_COUNT: "viewCount",
} as const;

export class ProductRepository extends BaseRepository<ProductDocument> {
  private static readonly CACHE_TTL_MS = 30_000;

  constructor() {
    super(PRODUCT_COLLECTION);
  }

  private cacheKeyById(id: string): string {
    return `repo:products:id:${id}`;
  }

  private cacheKeyBySlug(slug: string): string {
    return `repo:products:slug:${slug}`;
  }

  private cacheSet(product: ProductDocument): void {
    if (!product?.id) return;
    cacheManager.set(this.cacheKeyById(product.id), product, {
      ttl: ProductRepository.CACHE_TTL_MS,
    });
    if (product.slug) {
      cacheManager.set(this.cacheKeyBySlug(product.slug), product, {
        ttl: ProductRepository.CACHE_TTL_MS,
      });
    }
  }

  private cacheInvalidateForId(id: string): void {
    cacheManager.delete(this.cacheKeyById(id));
  }

  override async findById(id: string): Promise<ProductDocument | null> {
    const key = this.cacheKeyById(id);
    const cached = cacheManager.get<ProductDocument>(key);
    if (cached) return cached;

    const product = await super.findById(id);
    if (product) this.cacheSet(product);
    return product;
  }

  protected override mapDoc<D = ProductDocument>(snap: DocumentSnapshot): D {
    return super.mapDoc<D>(snap);
  }

  override async update(
    id: string,
    data: Partial<ProductDocument>,
  ): Promise<ProductDocument> {
    this.cacheInvalidateForId(id);
    const updated = await super.update(id, data);
    this.cacheSet(updated);
    return updated;
  }

  async create(input: ProductCreateInput): Promise<ProductDocument> {
    // Slug = document ID: derive slug from title first, then ensure uniqueness.
    const baseSlug = input.slug || slugify(input.title);

    const id = await generateUniqueId(
      (count) => (count === 0 ? baseSlug : `${baseSlug}-${count}`),
      async (candidateId) => {
        try {
          const doc = await this.findById(candidateId);
          return !!doc;
        } catch {
          return false;
        }
      },
    );

    const productData: Omit<ProductDocument, "id"> = {
      ...input,
      slug: id,
      availableQuantity: input.stockQuantity,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(productData as unknown as Record<string, unknown>));

    const created = { id, ...productData };
    this.cacheSet(created);
    return created;
  }

  async findByStore(storeId: string): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.STORE_ID, storeId);
  }

  async findByStatus(status: ProductStatus): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.STATUS, status);
  }

  async findFeatured(): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.FEATURED, true);
  }

  async findByCategory(category: string): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.CATEGORY, category);
  }

  async findBySlug(slug: string): Promise<ProductDocument | undefined> {
    const key = this.cacheKeyBySlug(slug);
    const cached = cacheManager.get<ProductDocument>(key);
    if (cached) return cached;

    const docs = await this.findBy(PRODUCT_FIELDS.SLUG, slug);
    const product = docs[0] as ProductDocument | undefined;
    if (product) this.cacheSet(product);
    return product;
  }

  async findByIdOrSlug(idOrSlug: string): Promise<ProductDocument | undefined> {
    const bySlug = await this.findBySlug(idOrSlug);
    if (bySlug) return bySlug;

    const byId = await this.findById(idOrSlug);
    return byId ?? undefined;
  }

  async findAuctions(): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.IS_AUCTION, true);
  }

  async findPreOrders(): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.IS_PRE_ORDER, true);
  }

  async findActivePreOrders(): Promise<ProductDocument[]> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.IS_PRE_ORDER, "==", true)
      .where(PRODUCT_FIELDS.PRE_ORDER_DELIVERY_DATE, ">=", now)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<ProductDocument>(doc));
  }

  async findPromoted(): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.IS_PROMOTED, true);
  }

  async updateProduct(
    productId: string,
    data: ProductUpdateInput,
  ): Promise<ProductDocument> {
    const updateData: Partial<ProductDocument> = {
      ...data,
      updatedAt: new Date(),
    };
    return this.update(productId, updateData);
  }

  async updateAvailableQuantity(
    productId: string,
    quantity: number,
  ): Promise<void> {
    await this.update(productId, { availableQuantity: quantity });
  }

  async updateBid(
    productId: string,
    bidAmount: number,
    bidCount: number,
  ): Promise<void> {
    await this.update(productId, {
      currentBid: bidAmount,
      bidCount,
      updatedAt: new Date(),
    });
  }

  async findAvailable(): Promise<ProductDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.STATUS, "==", "published")
      .where(PRODUCT_FIELDS.AVAILABLE_QUANTITY, ">", 0)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<ProductDocument>(doc));
  }

  async findByGroupId(groupId: string): Promise<ProductDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where("groupId", "==", groupId)
      .where(PRODUCT_FIELDS.IS_AUCTION, "==", false)
      .get();
    return snapshot.docs.map((doc) => this.mapDoc<ProductDocument>(doc));
  }

  async findActiveAuctions(): Promise<ProductDocument[]> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.IS_AUCTION, "==", true)
      .where(PRODUCT_FIELDS.AUCTION_END_DATE, ">=", now)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<ProductDocument>(doc));
  }

  async startGroup(productId: string, slug: string): Promise<void> {
    await this.getCollection().doc(productId).update({
      groupId: slug,
      isGroupParent: true,
      groupChildSlugs: [],
    });
  }

  async updateGroupTitle(productId: string, groupTitle: string): Promise<void> {
    await this.getCollection().doc(productId).update({ groupTitle });
  }

  async dissolveGroup(groupId: string): Promise<void> {
    const members = await this.findByGroupId(groupId);
    const batch = this.db.batch();
    const clearFields = {
      groupId: null,
      isGroupParent: null,
      groupParentSlug: null,
      groupChildSlugs: null,
      groupTitle: null,
    };
    for (const m of members) {
      batch.update(this.getCollection().doc(m.id), clearFields);
    }
    await batch.commit();
  }

  async linkChildToGroup(parent: ProductDocument, child: ProductDocument): Promise<void> {
    const batch = this.db.batch();
    batch.update(this.getCollection().doc(child.id), {
      groupId: parent.groupId!,
      groupParentSlug: parent.slug ?? parent.id,
      groupTitle: parent.groupTitle ?? null,
    });
    batch.update(this.getCollection().doc(parent.id), {
      groupChildSlugs: [...(parent.groupChildSlugs ?? []), child.id],
    });
    await batch.commit();
  }

  async unlinkChildFromGroup(parent: ProductDocument, child: ProductDocument): Promise<void> {
    const batch = this.db.batch();
    batch.update(this.getCollection().doc(child.id), {
      groupId: null,
      groupParentSlug: null,
      groupTitle: null,
    });
    const updated = (parent.groupChildSlugs ?? []).filter((s) => s !== child.id && s !== child.slug);
    batch.update(this.getCollection().doc(parent.id), { groupChildSlugs: updated });
    await batch.commit();
  }

  async leaveGroup(child: ProductDocument, parent: ProductDocument | null): Promise<void> {
    const batch = this.db.batch();
    batch.update(this.getCollection().doc(child.id), {
      groupId: null,
      groupParentSlug: null,
      groupTitle: null,
    });
    if (parent) {
      const updated = (parent.groupChildSlugs ?? []).filter((s) => s !== child.id && s !== child.slug);
      batch.update(this.getCollection().doc(parent.id), { groupChildSlugs: updated });
    }
    await batch.commit();
  }

  async addChildProduct(
    parent: ProductDocument,
    child: Omit<import("../schemas/firestore").ProductCreateInput, "groupId" | "isGroupParent" | "groupParentSlug" | "groupTitle">,
  ): Promise<ProductDocument> {
    const newChild = await this.create({
      ...child,
      groupId: parent.groupId!,
      isGroupParent: false,
      groupParentSlug: parent.slug ?? parent.id,
      groupTitle: parent.groupTitle,
    });
    const updated = [...(parent.groupChildSlugs ?? []), newChild.id];
    await this.getCollection().doc(parent.id).update({ groupChildSlugs: updated });
    return newChild;
  }

  async deleteByStore(storeId: string): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(PRODUCT_FIELDS.STORE_ID, "==", storeId)
        .get();

      if (snapshot.empty) return 0;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete products for store: ${storeId}`,
        error,
      );
    }
  }

  override async delete(id: string): Promise<void> {
    this.cacheInvalidateForId(id);
    return super.delete(id);
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    title: { canFilter: true, canSort: true },
    slug: { canFilter: true, canSort: false },
    category: { canFilter: true, canSort: true },
    subcategory: { canFilter: true, canSort: true },
    brand: { canFilter: true, canSort: true },
    condition: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    storeId: { canFilter: true, canSort: false },
    storeName: { canFilter: true, canSort: true },
    featured: { canFilter: true, canSort: false },
    isAuction: { canFilter: true, canSort: false },
    isPreOrder: { canFilter: true, canSort: false },
    isPromoted: { canFilter: true, canSort: false },
    price: { canFilter: true, canSort: true },
    stockQuantity: { canFilter: true, canSort: true },
    viewCount: { canFilter: true, canSort: true },
    currentBid: { canFilter: true, canSort: true },
    bidCount: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
    updatedAt: { canFilter: true, canSort: true },
    auctionEndDate: { canFilter: true, canSort: true },
    startingBid: { canFilter: true, canSort: true },
    buyNowPrice: { canFilter: true, canSort: true },
    minBidIncrement: { canFilter: true, canSort: false },
    autoExtendable: { canFilter: true, canSort: false },
    reservePrice: { canFilter: true, canSort: true },
    preOrderDeliveryDate: { canFilter: true, canSort: true },
    preOrderDepositPercent: { canFilter: true, canSort: false },
    preOrderDepositAmount: { canFilter: true, canSort: true },
    preOrderMaxQuantity: { canFilter: true, canSort: true },
    preOrderCurrentCount: { canFilter: true, canSort: true },
    preOrderProductionStatus: { canFilter: true, canSort: false },
    preOrderCancellable: { canFilter: true, canSort: false },
    tags: { canFilter: true, canSort: false },
    features: { canFilter: true, canSort: false },
    insurance: { canFilter: true, canSort: false },
    currency: { canFilter: true, canSort: false },
    freeShipping: { canFilter: true, canSort: false },
  };

  async list(
    model: SieveModel,
    opts?: { storeId?: string; status?: string; categoriesIn?: string[] },
  ): Promise<FirebaseSieveResult<ProductDocument>> {
    let baseQuery = this.getCollection();

    if (opts?.status) {
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.STATUS,
        "==",
        opts.status,
      ) as typeof baseQuery;
    }

    if (opts?.storeId) {
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.STORE_ID,
        "==",
        opts.storeId,
      ) as typeof baseQuery;
    }

    if (opts?.categoriesIn && opts.categoriesIn.length > 0) {
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.CATEGORY,
        "in",
        opts.categoriesIn,
      ) as typeof baseQuery;
    }

    return this.sieveQuery<ProductDocument>(
      model,
      ProductRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 20,
        maxPageSize: 100,
      },
    );
  }

  async incrementViewCount(productId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collection)
        .doc(productId)
        .update({
          [PRODUCT_FIELDS.VIEW_COUNT]: increment(1),
        });
    } catch {
      // View analytics must not break product read path.
    }
  }

  /**
   * Cloud Functions: find published auctions whose end date has already passed.
   * Used by the auction settlement job to finalize expired auctions.
   */
  async getExpiredAuctions(
    now: Date,
  ): Promise<
    Array<{ id: string; ref: DocumentReference; data: ProductDocument }>
  > {
    const snap = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.IS_AUCTION, "==", true)
      .where(PRODUCT_FIELDS.AUCTION_END_DATE, "<", now)
      .where(PRODUCT_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED)
      .limit(500)
      .get();

    return snap.docs.map((d) => ({
      id: d.id,
      ref: d.ref as DocumentReference,
      data: this.mapDoc<ProductDocument>(d),
    }));
  }

  /**
   * Cloud Functions: return IDs of all published products (lightweight scan).
   * Used by search index rebuild jobs.
   */
  async getPublishedIds(): Promise<string[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED)
      .limit(2000)
      .get();

    return snap.docs.map((d) => d.id);
  }

  /**
   * Cloud Functions: stage a status update into a caller-owned WriteBatch.
   */
  updateStatusInBatch(batch: WriteBatch, id: string, status: string): void {
    batch.update(this.db.collection(this.collection).doc(id), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Cloud Functions: stage an atomic bid-count increment into a caller-owned WriteBatch.
   */
  incrementBidCountInBatch(
    batch: WriteBatch,
    productId: string,
    currentBid: number,
  ): void {
    batch.update(this.db.collection(this.collection).doc(productId), {
      currentBid,
      bidCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }
}

export class ProductsRepository extends ProductRepository {}

export const productRepository = new ProductRepository();
