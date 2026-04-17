import "server-only";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { decryptPiiFields, encryptPiiFields } from "../../../security";
import { generateUniqueId, slugify } from "../../../utils";
import {
  PRODUCT_COLLECTION,
  createAuctionId,
  createPreOrderId,
  createProductId,
  type ProductCreateInput,
  type ProductDocument,
  type ProductUpdateInput,
} from "../schemas";
import type { ProductStatus } from "../types";

const PRODUCT_FIELDS = {
  SELLER_ID: "sellerId",
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

const PRODUCT_PII_FIELDS = ["sellerName", "sellerEmail"] as const;

export class ProductRepository extends BaseRepository<ProductDocument> {
  constructor() {
    super(PRODUCT_COLLECTION);
  }

  protected override mapDoc<D = ProductDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<ProductDocument>(snap);
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...PRODUCT_PII_FIELDS,
    ]) as unknown as D;
  }

  override async update(
    id: string,
    data: Partial<ProductDocument>,
  ): Promise<ProductDocument> {
    const encrypted = encryptPiiFields(
      data as unknown as Record<string, unknown>,
      [...PRODUCT_PII_FIELDS],
    );
    return super.update(id, encrypted as Partial<ProductDocument>);
  }

  async create(input: ProductCreateInput): Promise<ProductDocument> {
    const id = await generateUniqueId(
      (count) => {
        if (input.isAuction) {
          return createAuctionId({
            name: input.title,
            category: input.category,
            condition: "new",
            sellerName: input.sellerName,
            count,
          });
        }

        if (input.isPreOrder) {
          return createPreOrderId({
            name: input.title,
            category: input.category,
            condition: "new",
            sellerName: input.sellerName,
            count,
          });
        }

        return createProductId({
          name: input.title,
          category: input.category,
          condition: "new",
          sellerName: input.sellerName,
          count,
        });
      },
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
      slug: input.slug || `${slugify(input.title)}-${Date.now()}`,
      availableQuantity: input.stockQuantity,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = encryptPiiFields(
      productData as unknown as Record<string, unknown>,
      [...PRODUCT_PII_FIELDS],
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...productData };
  }

  async findBySeller(sellerId: string): Promise<ProductDocument[]> {
    return this.findBy(PRODUCT_FIELDS.SELLER_ID, sellerId);
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
    const docs = await this.findBy(PRODUCT_FIELDS.SLUG, slug);
    return docs[0] as ProductDocument | undefined;
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

  async findActiveAuctions(): Promise<ProductDocument[]> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.IS_AUCTION, "==", true)
      .where(PRODUCT_FIELDS.AUCTION_END_DATE, ">=", now)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<ProductDocument>(doc));
  }

  async deleteBySeller(sellerId: string): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(PRODUCT_FIELDS.SELLER_ID, "==", sellerId)
        .get();

      if (snapshot.empty) return 0;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete products for seller: ${sellerId}`,
        error,
      );
    }
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
    sellerId: { canFilter: true, canSort: false },
    sellerName: { canFilter: true, canSort: true },
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
  };

  async list(
    model: SieveModel,
    opts?: { sellerId?: string; status?: string; categoriesIn?: string[] },
  ): Promise<FirebaseSieveResult<ProductDocument>> {
    let baseQuery = this.getCollection();

    if (opts?.status) {
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.STATUS,
        "==",
        opts.status,
      ) as typeof baseQuery;
    }

    if (opts?.sellerId) {
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.SELLER_ID,
        "==",
        opts.sellerId,
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
          [PRODUCT_FIELDS.VIEW_COUNT]: FieldValue.increment(1),
        });
    } catch {
      // View analytics must not break product read path.
    }
  }
}

export class ProductsRepository extends ProductRepository {}

export const productRepository = new ProductRepository();
