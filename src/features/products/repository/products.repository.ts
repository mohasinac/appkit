import { normalizeError } from "../../../errors/normalize";

import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
import { increment, serverTimestamp } from "../../../contracts/field-ops";
import type { DocumentSnapshot } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type FirebaseSieveResult,
  type SieveFilterAliases,
  type SieveModel,
} from "../../../providers/db-firebase";
import { cacheManager } from "../../../core";
import { serverLogger } from "../../../monitoring";
import { generateUniqueId, slugify, generateBarcodeId } from "../../../utils";
import { buildSearchTxt, parseSearchTxtQuery } from "../../../utils/search-txt";
import { PRODUCT_COLLECTION, ProductStatusValues, type ProductCreateInput, type ProductDocument, type ProductUpdateInput } from "../schemas";
import type { ProductStatus } from "../types";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

/**
 * Canonical listing-kind tokens used in `listingType`. Note: the public Sieve
 * alias accepts the legacy "preorder" / "product" spelling; we normalise to
 * the Firestore-stored value here.
 */
const LISTING_TYPE_VALUES = PRODUCT_FIELDS.LISTING_TYPE_VALUES;

// Reused Sieve clauses for FILTER_ALIASES. SB1-G replaced the boolean-combo
// clauses with single-field `listingType==X` clauses now that every doc
// carries the discriminator.
const SIEVE_CLAUSE_PUBLISHED = `${PRODUCT_FIELDS.STATUS}==${ProductStatusValues.PUBLISHED}`;
const SIEVE_CLAUSE_LT_AUCTION = `${PRODUCT_FIELDS.LISTING_TYPE}==${LISTING_TYPE_VALUES.AUCTION}`;
const SIEVE_CLAUSE_LT_PREORDER = `${PRODUCT_FIELDS.LISTING_TYPE}==${LISTING_TYPE_VALUES.PRE_ORDER}`;
const SIEVE_CLAUSE_LT_STANDARD = `${PRODUCT_FIELDS.LISTING_TYPE}==${LISTING_TYPE_VALUES.STANDARD}`;
const SIEVE_CLAUSE_LT_PRIZE_DRAW = `${PRODUCT_FIELDS.LISTING_TYPE}==${LISTING_TYPE_VALUES.PRIZE_DRAW}`;
const SIEVE_CLAUSE_LT_CLASSIFIED = `${PRODUCT_FIELDS.LISTING_TYPE}==${LISTING_TYPE_VALUES.CLASSIFIED}`;
const SIEVE_CLAUSE_LT_DIGITAL_CODE = `${PRODUCT_FIELDS.LISTING_TYPE}==${LISTING_TYPE_VALUES.DIGITAL_CODE}`;
const SIEVE_CLAUSE_LT_LIVE = `${PRODUCT_FIELDS.LISTING_TYPE}==${LISTING_TYPE_VALUES.LIVE}`;

// Canonical tokens match the `ListingType` union in
// `appkit/src/features/products/types/index.ts`. Legacy aliases (`preorder`,
// `product`, `prizedraw`) are accepted for backwards compatibility with older
// consumer routes/clients; they normalise to the canonical value before
// reaching Firestore.
type ProductListingKind =
  | "standard"
  | "auction"
  | "pre-order"
  | "prize-draw"
  | "classified"
  | "digital-code"
  | "live"
  | "art"
  | "stickers"
  // Legacy aliases — see `LISTING_KIND_ALIAS_MAP` below.
  | "preorder"
  | "product"
  | "prizedraw";

const LISTING_KIND_ALIAS_MAP: Record<ProductListingKind, string> = {
  standard: LISTING_TYPE_VALUES.STANDARD,
  auction: LISTING_TYPE_VALUES.AUCTION,
  "pre-order": LISTING_TYPE_VALUES.PRE_ORDER,
  "prize-draw": LISTING_TYPE_VALUES.PRIZE_DRAW,
  classified: LISTING_TYPE_VALUES.CLASSIFIED,
  "digital-code": LISTING_TYPE_VALUES.DIGITAL_CODE,
  live: LISTING_TYPE_VALUES.LIVE,
  art: LISTING_TYPE_VALUES.ART,
  stickers: LISTING_TYPE_VALUES.STICKERS,
  // Legacy → canonical.
  product: LISTING_TYPE_VALUES.STANDARD,
  preorder: LISTING_TYPE_VALUES.PRE_ORDER,
  prizedraw: LISTING_TYPE_VALUES.PRIZE_DRAW,
};

const LISTING_KIND_ACCEPTED = new Set<string>(
  Object.keys(LISTING_KIND_ALIAS_MAP),
);

function buildListingKindClause(
  kind: ProductListingKind,
  inverted: boolean,
): string {
  const canonical = LISTING_KIND_ALIAS_MAP[kind];
  const op = inverted ? "!=" : "==";
  return `${PRODUCT_FIELDS.LISTING_TYPE}${op}${canonical}`;
}

function buildProductSearchTxt(p: Partial<ProductDocument>): string[] {
  return buildSearchTxt([
    p.title,
    p.description,
    p.brand,
    p.brandSlug,
    p.categoryNames,
    p.tags,
    p.features,
    p.condition,
    p.card?.setName,
    p.card?.cardNumber,
    p.grading?.service,
    p.specifications?.map((s) => `${s.name} ${s.value}`),
  ]);
}

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
    const doc = super.mapDoc<ProductDocument>(snap);
    // Backward compat: normalise legacy `category` string into `categorySlugs[]`.
    if (!doc.categorySlugs || doc.categorySlugs.length === 0) {
      doc.categorySlugs = doc.category ? [doc.category] : [];
    }
    return doc as unknown as D;
  }

  override async update(
    id: string,
    data: Partial<ProductDocument>,
  ): Promise<ProductDocument> {
    this.cacheInvalidateForId(id);
    const current = await super.findById(id);
    const merged = { ...current, ...data } as ProductDocument;
    const updated = await super.update(id, {
      ...data,
      searchTxt: buildProductSearchTxt(merged),
    });
    this.cacheSet(updated);
    return updated;
  }

  override async create(input: ProductCreateInput): Promise<ProductDocument> {
    // Slug = document ID: derive slug from title first, then ensure uniqueness.
    const baseSlug = input.slug || slugify(input.title);

    const id = await generateUniqueId(
      (count) => (count === 0 ? baseSlug : `${baseSlug}-${count}`),
      async (candidateId) => {
        try {
          const doc = await this.findById(candidateId);
          return !!doc;
        } catch (_err) {
          void normalizeError(_err);
          return false;
        }
      },
    );

    const barcodeId = input.barcodeId ?? await generateBarcodeId(id);
    const productData: Omit<ProductDocument, "id"> = {
      ...input,
      barcodeId,
      slug: id,
      availableQuantity: input.stockQuantity,
      searchTxt: buildProductSearchTxt(input),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(productData));

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
    const snap = await this.getCollection()
      .where(PRODUCT_FIELDS.CATEGORY_SLUGS, "array-contains", category)
      .get();
    return snap.docs.map((d) => this.mapDoc<ProductDocument>(d));
  }

  /**
   * Published products sharing at least one tag with the given list — "you
   * might also like" style discovery. `array-contains-any` caps at 10 values,
   * so only the first 10 tags are used.
   */
  async findByTagsOverlap(tags: string[], limit = 8): Promise<ProductDocument[]> {
    if (tags.length === 0) return [];
    const snap = await this.getCollection()
      .where(PRODUCT_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED)
      .where(PRODUCT_FIELDS.TAGS, "array-contains-any", tags.slice(0, 10))
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc<ProductDocument>(d));
  }

  async findByBarcodeId(barcodeId: string): Promise<ProductDocument | null> {
    const docs = await this.findBy("barcodeId", barcodeId);
    return docs[0] ?? null;
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

  /**
   * Batch read for the Compare overlay (BK3). Reads up to ~10 products in a
   * single `getAll` round-trip. Missing IDs are silently dropped — callers
   * (CompareOverlay) treat the returned array as "what we could find".
   */
  async listByIds(ids: string[]): Promise<ProductDocument[]> {
    const unique = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)));
    if (unique.length === 0) return [];
    const refs = unique.map((id) => this.db.collection(this.collection).doc(id));
    const snaps = await this.db.getAll(...refs);
    return snaps
      .filter((s) => s.exists)
      .map((s) => this.mapDoc<ProductDocument>(s));
  }

  async findAuctions(): Promise<ProductDocument[]> {
    return this.findBy(
      PRODUCT_FIELDS.LISTING_TYPE,
      LISTING_TYPE_VALUES.AUCTION,
    );
  }

  async findPreOrders(): Promise<ProductDocument[]> {
    return this.findBy(
      PRODUCT_FIELDS.LISTING_TYPE,
      LISTING_TYPE_VALUES.PRE_ORDER,
    );
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
    // Tier GP: groups may mix standard products + pre-orders (never auctions).
    const snapshot = await this.db
      .collection(this.collection)
      .where("groupId", "==", groupId)
      .where(PRODUCT_FIELDS.LISTING_TYPE, "in", [
        LISTING_TYPE_VALUES.STANDARD,
        LISTING_TYPE_VALUES.PRE_ORDER,
      ])
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
      void normalizeError(error);
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
    categorySlugs: { canFilter: true, canSort: false },
    subcategory: { canFilter: true, canSort: true },
    brand: { canFilter: true, canSort: true },
    condition: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    storeId: { canFilter: true, canSort: false },
    storeName: { canFilter: true, canSort: true },
    // canSort:true — STANDARD_SORT_OPTIONS offers "Featured First" and
    // "Promoted First". They were `canSort:false` until 2026-08-21, so sievejs
    // silently dropped the sort and both dropdown options did nothing on the
    // admin and seller product lists.
    featured: { canFilter: true, canSort: true },
    listingType: { canFilter: true, canSort: false },
    isPromoted: { canFilter: true, canSort: true },
    isOnSale: { canFilter: true, canSort: false },
    price: { canFilter: true, canSort: true },
    stockQuantity: { canFilter: true, canSort: true },
    availableQuantity: { canFilter: true, canSort: true },
    viewCount: { canFilter: true, canSort: true },
    currentBid: { canFilter: true, canSort: true },
    bidCount: { canFilter: true, canSort: true },
    bidsHaveStarted: { canFilter: true, canSort: false },
    isSold: { canFilter: true, canSort: true },
    isPartOfBundle: { canFilter: true, canSort: false },
    isTestData: { canFilter: true, canSort: false },
    brandSlug: { canFilter: true, canSort: false },
    sublistingCategoryId: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    auctionEndDate: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    prizeRevealWindowStart: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    prizeRevealWindowEnd: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    prizeRevealStatus: { canFilter: true, canSort: false },
    prizeDrawMode: { canFilter: true, canSort: false },
    // Prize-draw entry price. PrizeDrawsListingView emits min/max filters on
    // this field; without an entry here sievejs dropped both clauses silently.
    pricePerEntry: { canFilter: true, canSort: true },
    prizeCurrentEntries: { canFilter: true, canSort: true },
    prizeMaxEntries: { canFilter: true, canSort: true },
    startingBid: { canFilter: true, canSort: true },
    buyNowPrice: { canFilter: true, canSort: true },
    minBidIncrement: { canFilter: true, canSort: false },
    autoExtendable: { canFilter: true, canSort: false },
    reservePrice: { canFilter: true, canSort: true },
    preOrderDeliveryDate: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    preOrderDepositPercent: { canFilter: true, canSort: false },
    preOrderDepositAmount: { canFilter: true, canSort: true },
    preOrderMaxQuantity: { canFilter: true, canSort: true },
    preOrderCurrentCount: { canFilter: true, canSort: true },
    preOrderProductionStatus: { canFilter: true, canSort: false },
    preOrderCancellable: { canFilter: true, canSort: false },
    preOrderClosed: { canFilter: true, canSort: false },
    tags: { canFilter: true, canSort: false },
    features: { canFilter: true, canSort: false },
    insurance: { canFilter: true, canSort: false },
    currency: { canFilter: true, canSort: false },
    // `freeShipping` used to be listed here and is NOT a ProductDocument field
    // at all — free shipping is derived from `shippingPaidBy === "seller"`.
    // The public "Free shipping" toggle emitted `shippingPaidBy==seller`
    // (buildFirestoreSafeFilters), which sievejs then dropped because the real
    // field had no entry: `throwExceptions:false` means an unknown field is
    // silently skipped. The toggle did nothing at all until 2026-08-21.
    shippingPaidBy: { canFilter: true, canSort: false },
    searchTxt: { canFilter: true, canSort: false },
    "classified.meetupArea": { canFilter: true, canSort: false },
    "classified.acceptsShipping": { canFilter: true, canSort: false },
    "classified.negotiable": { canFilter: true, canSort: false },
    "digitalCode.codeDeliveryMethod": { canFilter: true, canSort: false },
    "digitalCode.codesAvailable": { canFilter: true, canSort: true },
    "liveItem.species": { canFilter: true, canSort: false },
    "liveItem.sex": { canFilter: true, canSort: false },
    "liveItem.jurisdictionAllowed": { canFilter: true, canSort: false },
    "liveItem.cites": { canFilter: true, canSort: false },
  };

  /**
   * Virtual filter aliases — callers can pass `f=listingType==auction` for
   * the canonical listing-kind discriminator. The Sieve adapter expands the
   * alias into real clauses before reaching Firestore.
   *
   * Adding a new alias here makes it usable everywhere `productRepository.list`
   * is called from — Vercel routes, listingProcessor, server-action views.
   */
  static readonly FILTER_ALIASES: SieveFilterAliases = {
    /**
     * Canonical listing-kind alias (SB1-G).
     *
     *   listingType==auction   →  listingType==auction
     *   listingType==preorder  →  listingType==pre-order  (normalises spelling)
     *   listingType==product   →  listingType==standard   (canonical token)
     *   listingType!=auction   →  listingType!=auction
     *
     * The alias is kept (instead of letting raw `listingType==X` through) so
     * the public Sieve API still accepts the legacy `preorder` / `product`
     * tokens for backwards compatibility with existing consumer routes.
     */
    listingType: (value, operator) => {
      if (operator !== "==" && operator !== "!=") return "";
      // Accept both canonical tokens (`standard`, `auction`, `pre-order`,
      // `prize-draw`, `art`, `stickers`, …) and legacy aliases (`product`,
      // `preorder`, `prizedraw`). `LISTING_KIND_ACCEPTED` is the single source
      // of truth — keep it in sync with `LISTING_KIND_ALIAS_MAP`.
      //
      // A pipe-joined value (`art|stickers`, `standard|classified|live`) is a
      // sievejs OR-group that the Firebase adapter upgrades to a `.where(…,
      // "in", …)` query — the combined browse pages (/products, /art) send
      // exactly this. Before 2026-08-21 the whole string was tested against
      // `LISTING_KIND_ACCEPTED` as one token, never matched, and the clause was
      // dropped silently, so those pages queried with NO listing-type filter at
      // all. Split first, map each part, then re-emit the OR-group.
      const parts = value.split("|").filter(Boolean);
      if (parts.length === 0) return "";
      const unknown = parts.filter((p) => !LISTING_KIND_ACCEPTED.has(p));
      if (unknown.length > 0) {
        // Loud, not silent — a dropped filter reads as "no results" downstream
        // with nothing to trace it back to (Root Cause: the art/stickers bug).
        serverLogger.warn("Unknown listingType filter value(s) — clause dropped", {
          value,
          unknown,
          accepted: [...LISTING_KIND_ACCEPTED],
        });
        return "";
      }
      if (operator === "!=") {
        // Firestore allows at most one `!=` per query, so a multi-value
        // exclusion can't be expressed here — reject rather than half-apply it.
        if (parts.length > 1) {
          serverLogger.warn("Multi-value listingType != is not supported — clause dropped", { value });
          return "";
        }
        return buildListingKindClause(parts[0] as ProductListingKind, true);
      }
      const canonical = parts.map((p) => LISTING_KIND_ALIAS_MAP[p as ProductListingKind]);
      // De-dupe: legacy aliases can collapse onto the same canonical token
      // (e.g. `product|standard`), and Firestore rejects a duplicate `in` value.
      const unique = [...new Set(canonical)];
      return `${PRODUCT_FIELDS.LISTING_TYPE}==${unique.join("|")}`;
    },

    /**
     * Public catalog scope shorthand. Maps a single token to the canonical
     * combination most public pages use.
     *
     *   scope==publicProducts   →  status==published,listingType==standard
     *   scope==publicAuctions   →  status==published,listingType==auction
     *   scope==publicPreorders  →  status==published,listingType==pre-order
     *   scope==published        →  status==published
     */
    scope: (value, operator) => {
      if (operator !== "==") return "";
      switch (value) {
        case "publicProducts":
          return [SIEVE_CLAUSE_PUBLISHED, SIEVE_CLAUSE_LT_STANDARD].join(",");
        case "publicAuctions":
          return [SIEVE_CLAUSE_PUBLISHED, SIEVE_CLAUSE_LT_AUCTION].join(",");
        case "publicPreorders":
          return [SIEVE_CLAUSE_PUBLISHED, SIEVE_CLAUSE_LT_PREORDER].join(",");
        case "publicPrizeDraws":
          return [SIEVE_CLAUSE_PUBLISHED, SIEVE_CLAUSE_LT_PRIZE_DRAW].join(",");
        case "publicClassifieds":
          return [SIEVE_CLAUSE_PUBLISHED, SIEVE_CLAUSE_LT_CLASSIFIED].join(",");
        case "publicDigitalCodes":
          return [SIEVE_CLAUSE_PUBLISHED, SIEVE_CLAUSE_LT_DIGITAL_CODE].join(",");
        case "publicLive":
          return [SIEVE_CLAUSE_PUBLISHED, SIEVE_CLAUSE_LT_LIVE].join(",");
        case "published":
          return SIEVE_CLAUSE_PUBLISHED;
        default:
          return "";
      }
    },

    /**
     * Backward-compat: `category==slug` → `categorySlugs @= slug`
     * Allows existing consumers using the old single-value filter to keep
     * working after the category → categorySlugs[] migration (Track C).
     */
    category: (value, operator) => {
      if (operator !== "==") return "";
      return `${PRODUCT_FIELDS.CATEGORY_SLUGS}@=${value}`;
    },

    /** Shorthand for the homepage promoted strip. `promoted==true` only. */
    promoted: (value, operator) => {
      if (operator !== "==" || value !== "true") return "";
      return [
        SIEVE_CLAUSE_PUBLISHED,
        `${PRODUCT_FIELDS.IS_PROMOTED}==true`,
      ].join(",");
    },

    /** Shorthand for the homepage featured strip. `featuredPublic==true` only. */
    featuredPublic: (value, operator) => {
      if (operator !== "==" || value !== "true") return "";
      return [
        SIEVE_CLAUSE_PUBLISHED,
        `${PRODUCT_FIELDS.FEATURED}==true`,
      ].join(",");
    },
  };

  /**
   * Firestore's ceiling for `array-contains-any` / `in` comparison values.
   * Exceeding it throws `INVALID_ARGUMENT`, and every caller of `list()` wraps
   * the call in `.catch(() => null)`, so the throw would surface as a silently
   * empty page rather than an error (Root Cause #59).
   */
  private static readonly MAX_ARRAY_CONTAINS_ANY = 30;

  /**
   * Shared scope construction for `list()` and `countBy*()` — both must narrow
   * by exactly the same store/status/category/search predicates or a tab's
   * count would disagree with the rows behind it.
   */
  private buildScopedQuery(opts?: {
    storeId?: string;
    status?: string;
    categoriesIn?: string[];
    search?: string;
    brandName?: string;
  }) {
    let baseQuery = this.getCollection();

    if (opts?.brandName) {
      // The free-text display name, NOT brandSlug — BrandDetailPageView filters
      // products this way, so a count keyed on brandSlug would disagree with
      // the rows the tab goes on to show.
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.BRAND,
        "==",
        opts.brandName,
      ) as typeof baseQuery;
    }

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

    // Longest term first — only ONE may become the array-contains clause.
    const searchTxt = parseSearchTxtQuery(opts?.search ?? "");

    if (searchTxt.length > 0) {
      // Firestore permits a single array operator per query, so when a search
      // and a category filter are both present the SEARCH takes the clause and
      // the category is refined by the caller.
      //
      // Two shapes here have each been reverted once and are both guarded by
      // scripts/audit-search-semantics.mjs:
      //
      //   1. This branch was an empty `if` body — it emitted NO clause, so a
      //      search combined with `categoriesIn` dropped BOTH filters and
      //      returned an unrelated superset, silently.
      //   2. Multi-term used `array-contains-any`, which is OR — "red dranzer"
      //      matched anything with either word. One `array-contains` on the most
      //      selective term, remaining terms AND-refined against `searchTxt`.
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.SEARCH_TXT,
        "array-contains",
        searchTxt[0],
      ) as typeof baseQuery;
    }

    if (searchTxt.length === 0 && opts?.categoriesIn && opts.categoriesIn.length > 0) {
      let categoriesIn = opts.categoriesIn;
      if (categoriesIn.length > ProductRepository.MAX_ARRAY_CONTAINS_ANY) {
        // Products carry their FULL ancestor chain in `categorySlugs`, so a
        // category page only ever needs to pass its own id — a list this long
        // means a caller is still expanding descendants. Truncating keeps the
        // query legal (an over-long list throws INVALID_ARGUMENT, which every
        // caller's `.catch(() => null)` would turn into a blank page), and the
        // warning names the real bug instead of hiding it.
        serverLogger.warn(
          `productRepository: categoriesIn had ${categoriesIn.length} values, above Firestore's ${ProductRepository.MAX_ARRAY_CONTAINS_ANY} limit — truncating. Pass only the category's own id; products are tagged with their full ancestor chain.`,
        );
        categoriesIn = categoriesIn.slice(
          0,
          ProductRepository.MAX_ARRAY_CONTAINS_ANY,
        );
      }
      baseQuery = baseQuery.where(
        PRODUCT_FIELDS.CATEGORY_SLUGS,
        "array-contains-any",
        categoriesIn,
      ) as typeof baseQuery;
    }

    return baseQuery;
  }

  async list(
    model: SieveModel,
    opts?: { storeId?: string; status?: string; categoriesIn?: string[]; search?: string },
  ): Promise<FirebaseSieveResult<ProductDocument>> {
    return this.sieveQuery<ProductDocument>(
      model,
      ProductRepository.SIEVE_FIELDS,
      {
        baseQuery: this.buildScopedQuery(opts),
        defaultPageSize: 20,
        maxPageSize: 100,
        aliases: ProductRepository.FILTER_ALIASES,
      },
    );
  }

  /**
   * How many products of each listing type exist within a scope — the numbers
   * behind every listing-type tab bar and filter chip group.
   *
   * `types` entries are passed through verbatim, so a pipe-joined OR-group
   * (`"art|stickers"`, the combined Art & Stickers tab) is counted as one
   * bucket, matching how the tab itself queries.
   *
   * A type whose count query fails maps to `undefined`, not 0 — callers hide a
   * tab at zero, and a swallowed failure reading as "none exist" would hide a
   * tab holding real inventory (Root Cause #59).
   */
  async countByListingTypes(
    types: readonly string[],
    opts?: {
      storeId?: string;
      status?: string;
      categoriesIn?: string[];
      brandName?: string;
    },
  ): Promise<Record<string, number | undefined>> {
    return this.facetCounts(
      PRODUCT_FIELDS.LISTING_TYPE,
      types,
      ProductRepository.SIEVE_FIELDS,
      {
        baseQuery: this.buildScopedQuery(opts),
        aliases: ProductRepository.FILTER_ALIASES,
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
    } catch (_err) {
      void normalizeError(_err);
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
      .where(PRODUCT_FIELDS.LISTING_TYPE, "==", LISTING_TYPE_VALUES.AUCTION)
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
   * SB6-C / SB4-H — atomically bump `prizeCurrentEntries` by `count`. The
   * checkout transaction calls this after pool-cap validation; the reveal
   * code-path uses it as a defence-in-depth check (already incremented at
   * order create, so this is a no-op unless we shift accounting later).
   */
  incrementPrizeEntriesInBatch(
    batch: WriteBatch,
    productId: string,
    count: number,
  ): void {
    batch.update(this.db.collection(this.collection).doc(productId), {
      prizeCurrentEntries: increment(count),
      updatedAt: serverTimestamp(),
    });
  }

  productRef(productId: string): DocumentReference {
    return this.db.collection(this.collection).doc(productId) as DocumentReference;
  }

  /** Cloud Functions: returns refs for draft products older than `cutoff` (for 30-day prune). */
  async getStaleDraftRefs(cutoff: Date): Promise<DocumentReference[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.STATUS, "==", "draft")
      .where(PRODUCT_FIELDS.UPDATED_AT, "<", cutoff)
      .limit(200)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }
}

export const productRepository = new ProductRepository();
