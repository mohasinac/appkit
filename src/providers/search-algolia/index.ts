/**
 * @mohasinac/search-algolia — Algolia provider utilities
 *
 * Generic server/browser Algolia helpers for indexing and searching.
 * No dependency on app-specific schema modules.
 */

import { algoliasearch } from "algoliasearch";
import { ALGOLIA_PAGES_INDEX_NAME, type AlgoliaNavRecord } from "./nav";

// ── Env var resolution ───────────────────────────────────────────────────────

const ALGOLIA_APP_ID =
  process.env.ALGOLIA_APP_ID ?? process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY ?? "";
export const ALGOLIA_INDEX_NAME =
  process.env.ALGOLIA_INDEX_NAME ??
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ??
  "products";

export function isAlgoliaConfigured(): boolean {
  return Boolean(ALGOLIA_APP_ID && ALGOLIA_ADMIN_KEY);
}

let _adminClient: ReturnType<typeof algoliasearch> | null = null;

export function getAlgoliaAdminClient(): ReturnType<typeof algoliasearch> {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
    throw new Error("Algolia admin credentials are not configured");
  }
  if (!_adminClient) {
    _adminClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  }
  return _adminClient;
}

// ── Shared input shapes ──────────────────────────────────────────────────────

export interface ProductLike {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  mainImage: string;
  sellerId: string;
  sellerName: string;
  status: string;
  createdAt: unknown;
  updatedAt: unknown;
  slug?: string;
  subcategory?: string;
  brand?: string;
  images?: string[];
  tags?: string[];
  storeId?: string;
  condition?: string;
  stockQuantity?: number;
  availableQuantity?: number;
  isAuction?: boolean;
  currentBid?: number;
  startingBid?: number;
  bidCount?: number;
  buyNowPrice?: number;
  auctionEndDate?: unknown;
  isPreOrder?: boolean;
  preOrderDeliveryDate?: unknown;
  preOrderCurrentCount?: number;
  preOrderMaxQuantity?: number;
  preOrderProductionStatus?: string;
  allowOffers?: boolean;
  minOfferPercent?: number;
  featured: boolean;
  isPromoted?: boolean;
  promotionEndDate?: unknown;
  avgRating?: number;
  reviewCount?: number;
  viewCount?: number;
}

export interface CategoryLike {
  id: string;
  name: string;
  slug: string;
  tier: number;
  path: string;
  parentIds: string[];
  rootId: string;
  isLeaf: boolean;
  isFeatured: boolean;
  createdAt: unknown;
  updatedAt: unknown;
  description?: string;
  isBrand?: boolean;
  featuredPriority?: number;
  display?: { icon?: string; coverImage?: string };
  metrics?: {
    productCount?: number;
    totalProductCount?: number;
    auctionCount?: number;
    totalItemCount?: number;
    avgRating?: number;
  };
}

export interface StoreLike {
  id: string;
  storeSlug: string;
  storeName: string;
  ownerId: string;
  status: string;
  isPublic: boolean;
  createdAt: unknown;
  updatedAt: unknown;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;
  isVacationMode?: boolean;
  location?: string;
  stats?: {
    totalProducts?: number;
    itemsSold?: number;
    totalReviews?: number;
    averageRating?: number;
  };
}

// ── Record type ───────────────────────────────────────────────────────────────

export interface AlgoliaProductRecord {
  objectID: string;
  title: string;
  description: string;
  slug?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  currency: string;
  mainImage: string;
  images: string[];
  tags: string[];
  sellerId: string;
  storeId?: string;
  sellerName: string;
  status: string;
  condition?: string;
  stockQuantity: number;
  availableQuantity: number;
  isAuction: boolean;
  currentBid?: number;
  startingBid?: number;
  bidCount?: number;
  buyNowPrice?: number;
  auctionEndDate?: number;
  isPreOrder: boolean;
  preOrderDeliveryDate?: number;
  preOrderCurrentCount?: number;
  preOrderMaxQuantity?: number;
  preOrderProductionStatus?: string;
  allowOffers: boolean;
  minOfferPercent?: number;
  featured: boolean;
  isPromoted: boolean;
  promotionEndDate?: number;
  avgRating: number;
  reviewCount: number;
  viewCount: number;
  createdAt: number;
  updatedAt: number;
}

function toEpoch(date: unknown): number {
  if (date instanceof Date) return date.getTime();
  if (typeof date === "number") return date;
  if (typeof date === "string") return new Date(date).getTime();
  return 0;
}

export function productToAlgoliaRecord(
  product: ProductLike,
): AlgoliaProductRecord {
  return {
    objectID: product.id,
    title: product.title,
    description: product.description,
    slug: product.slug,
    category: product.category,
    subcategory: product.subcategory,
    brand: product.brand,
    price: product.price,
    currency: product.currency,
    mainImage: product.mainImage,
    images: product.images ?? [],
    tags: product.tags ?? [],
    sellerId: product.sellerId,
    storeId: product.storeId,
    sellerName: product.sellerName,
    status: product.status,
    condition: product.condition,
    stockQuantity: product.stockQuantity ?? 0,
    availableQuantity: product.availableQuantity ?? 0,
    isAuction: product.isAuction ?? false,
    currentBid: product.currentBid,
    startingBid: product.startingBid,
    bidCount: product.bidCount,
    buyNowPrice: product.buyNowPrice,
    auctionEndDate: product.auctionEndDate
      ? toEpoch(product.auctionEndDate)
      : undefined,
    isPreOrder: product.isPreOrder ?? false,
    preOrderDeliveryDate: product.preOrderDeliveryDate
      ? toEpoch(product.preOrderDeliveryDate)
      : undefined,
    preOrderCurrentCount: product.preOrderCurrentCount,
    preOrderMaxQuantity: product.preOrderMaxQuantity,
    preOrderProductionStatus: product.preOrderProductionStatus,
    allowOffers: product.allowOffers ?? false,
    minOfferPercent: product.minOfferPercent,
    featured: product.featured,
    isPromoted: product.isPromoted ?? false,
    promotionEndDate: product.promotionEndDate
      ? toEpoch(product.promotionEndDate)
      : undefined,
    avgRating: product.avgRating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    viewCount: product.viewCount ?? 0,
    createdAt: toEpoch(product.createdAt),
    updatedAt: toEpoch(product.updatedAt),
  };
}

export async function indexProducts(
  products: ProductLike[],
): Promise<{ indexed: number }> {
  const client = getAlgoliaAdminClient();
  const objects = products.map(productToAlgoliaRecord) as unknown as Record<
    string,
    unknown
  >[];
  await client.saveObjects({ indexName: ALGOLIA_INDEX_NAME, objects });
  return { indexed: objects.length };
}

export async function deleteProductFromIndex(productId: string): Promise<void> {
  const client = getAlgoliaAdminClient();
  await client.deleteObject({
    indexName: ALGOLIA_INDEX_NAME,
    objectID: productId,
  });
}

export async function clearAlgoliaIndex(
  indexName: string,
): Promise<{ cleared: true }> {
  const client = getAlgoliaAdminClient();
  await client.clearObjects({ indexName });
  return { cleared: true };
}

// ── Navigation / pages index ──────────────────────────────────────────────────

export { ALGOLIA_PAGES_INDEX_NAME };
export type { AlgoliaNavRecord };

export async function indexNavPages(
  records: AlgoliaNavRecord[],
): Promise<{ indexed: number }> {
  const client = getAlgoliaAdminClient();
  await client.saveObjects({
    indexName: ALGOLIA_PAGES_INDEX_NAME,
    objects: records as unknown as Record<string, unknown>[],
  });
  return { indexed: records.length };
}

// ── Categories index ──────────────────────────────────────────────────────────

export const ALGOLIA_CATEGORIES_INDEX_NAME =
  process.env.ALGOLIA_CATEGORIES_INDEX_NAME ?? "categories";

export interface AlgoliaCategoryRecord {
  objectID: string;
  name: string;
  slug: string;
  description?: string;
  tier: number;
  path: string;
  parentIds: string[];
  rootId: string;
  isLeaf: boolean;
  isBrand: boolean;
  isFeatured: boolean;
  featuredPriority?: number;
  icon?: string;
  coverImage?: string;
  productCount: number;
  totalProductCount: number;
  auctionCount: number;
  totalItemCount: number;
  avgRating?: number;
  createdAt: number;
  updatedAt: number;
}

export function categoryToAlgoliaRecord(
  category: CategoryLike,
): AlgoliaCategoryRecord {
  return {
    objectID: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    tier: category.tier,
    path: category.path,
    parentIds: category.parentIds,
    rootId: category.rootId,
    isLeaf: category.isLeaf,
    isBrand: category.isBrand ?? false,
    isFeatured: category.isFeatured,
    featuredPriority: category.featuredPriority,
    icon: category.display?.icon,
    coverImage: category.display?.coverImage,
    productCount: category.metrics?.productCount ?? 0,
    totalProductCount: category.metrics?.totalProductCount ?? 0,
    auctionCount: category.metrics?.auctionCount ?? 0,
    totalItemCount: category.metrics?.totalItemCount ?? 0,
    avgRating: category.metrics?.avgRating,
    createdAt: toEpoch(category.createdAt),
    updatedAt: toEpoch(category.updatedAt),
  };
}

export async function indexCategories(
  categories: CategoryLike[],
): Promise<{ indexed: number }> {
  const client = getAlgoliaAdminClient();
  const objects = categories.map(categoryToAlgoliaRecord) as unknown as Record<
    string,
    unknown
  >[];
  await client.saveObjects({
    indexName: ALGOLIA_CATEGORIES_INDEX_NAME,
    objects,
  });
  return { indexed: objects.length };
}

export async function deleteCategoryFromIndex(
  categoryId: string,
): Promise<void> {
  const client = getAlgoliaAdminClient();
  await client.deleteObject({
    indexName: ALGOLIA_CATEGORIES_INDEX_NAME,
    objectID: categoryId,
  });
}

// ── Stores index ──────────────────────────────────────────────────────────────

export const ALGOLIA_STORES_INDEX_NAME =
  process.env.ALGOLIA_STORES_INDEX_NAME ?? "stores";

export interface AlgoliaStoreRecord {
  objectID: string;
  storeSlug: string;
  storeName: string;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;
  ownerId: string;
  status: string;
  isPublic: boolean;
  isVacationMode: boolean;
  location?: string;
  totalProducts: number;
  itemsSold: number;
  totalReviews: number;
  averageRating: number;
  createdAt: number;
  updatedAt: number;
}

export function storeToAlgoliaRecord(store: StoreLike): AlgoliaStoreRecord {
  return {
    objectID: store.id,
    storeSlug: store.storeSlug,
    storeName: store.storeName,
    storeDescription: store.storeDescription,
    storeCategory: store.storeCategory,
    storeLogoURL: store.storeLogoURL,
    storeBannerURL: store.storeBannerURL,
    ownerId: store.ownerId,
    status: store.status,
    isPublic: store.isPublic,
    isVacationMode: store.isVacationMode ?? false,
    location: store.location,
    totalProducts: store.stats?.totalProducts ?? 0,
    itemsSold: store.stats?.itemsSold ?? 0,
    totalReviews: store.stats?.totalReviews ?? 0,
    averageRating: store.stats?.averageRating ?? 0,
    createdAt: toEpoch(store.createdAt),
    updatedAt: toEpoch(store.updatedAt),
  };
}

export async function indexStores(
  stores: StoreLike[],
): Promise<{ indexed: number }> {
  const client = getAlgoliaAdminClient();
  const objects = stores.map(storeToAlgoliaRecord) as unknown as Record<
    string,
    unknown
  >[];
  await client.saveObjects({ indexName: ALGOLIA_STORES_INDEX_NAME, objects });
  return { indexed: objects.length };
}

export async function deleteStoreFromIndex(storeId: string): Promise<void> {
  const client = getAlgoliaAdminClient();
  await client.deleteObject({
    indexName: ALGOLIA_STORES_INDEX_NAME,
    objectID: storeId,
  });
}

// ── Browser-safe search client ────────────────────────────────────────────────

const _publicAppId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const _searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? "";

export function isAlgoliaBrowserConfigured(): boolean {
  return Boolean(_publicAppId && _searchKey);
}

let _browserClient: ReturnType<typeof algoliasearch> | null = null;

function getAlgoliaBrowserClient(): ReturnType<typeof algoliasearch> | null {
  if (!isAlgoliaBrowserConfigured()) return null;
  if (!_browserClient) {
    _browserClient = algoliasearch(_publicAppId, _searchKey);
  }
  return _browserClient;
}

export async function searchNavPages(
  query: string,
  limit = 6,
): Promise<AlgoliaNavRecord[]> {
  const client = getAlgoliaBrowserClient();
  if (!client || !query.trim()) return [];
  const result = await client.searchSingleIndex<AlgoliaNavRecord>({
    indexName: ALGOLIA_PAGES_INDEX_NAME,
    searchParams: { query, hitsPerPage: limit },
  });
  return result.hits;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface AlgoliaSearchParams {
  q: string;
  category?: string | null;
  subcategory?: string | null;
  minPrice?: number;
  maxPrice?: number;
  condition?: string | null;
  isAuction?: boolean | null;
  isPreOrder?: boolean | null;
  inStock?: boolean | null;
  minRating?: number;
  sort?: string | null;
  page?: number;
  pageSize?: number;
}

export interface AlgoliaSearchResult {
  items: AlgoliaProductRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export async function algoliaSearch(
  params: AlgoliaSearchParams,
): Promise<AlgoliaSearchResult> {
  const client = getAlgoliaAdminClient();
  const {
    q,
    category,
    subcategory,
    minPrice = 0,
    maxPrice = 0,
    condition,
    isAuction,
    isPreOrder,
    inStock,
    minRating = 0,
    page = 1,
    pageSize = 20,
  } = params;

  const numericFilters: string[] = [];
  if (minPrice > 0) numericFilters.push(`price >= ${minPrice}`);
  if (maxPrice > 0 && maxPrice >= minPrice)
    numericFilters.push(`price <= ${maxPrice}`);
  if (minRating > 0) numericFilters.push(`avgRating >= ${minRating}`);
  if (inStock === true) numericFilters.push(`availableQuantity > 0`);

  const facetFilters: string[][] = [["status:published"]];
  if (category) facetFilters.push([`category:${category}`]);
  if (subcategory) facetFilters.push([`subcategory:${subcategory}`]);
  if (condition) facetFilters.push([`condition:${condition}`]);
  if (isAuction === true) facetFilters.push(["isAuction:true"]);
  if (isAuction === false) facetFilters.push(["isAuction:false"]);
  if (isPreOrder === true) facetFilters.push(["isPreOrder:true"]);
  if (isPreOrder === false) facetFilters.push(["isPreOrder:false"]);

  const response = await client.search({
    requests: [
      {
        indexName: ALGOLIA_INDEX_NAME,
        query: q,
        page: page - 1,
        hitsPerPage: pageSize,
        ...(numericFilters.length > 0 && { numericFilters }),
        ...(facetFilters.length > 0 && { facetFilters }),
      },
    ],
  });

  const result = response.results[0] as {
    hits: AlgoliaProductRecord[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
  };

  return {
    items: result.hits,
    total: result.nbHits,
    page: result.page + 1,
    pageSize: result.hitsPerPage,
    totalPages: result.nbPages,
    hasMore: result.page + 1 < result.nbPages,
  };
}
