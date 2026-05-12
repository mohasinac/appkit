import { productRepository } from "../repository/products.repository";
import { ProductStatusValues } from "../schemas";
import type { ProductDocument } from "../schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

/**
 * Reusable Sieve clauses. Single source of truth for the listing-type
 * discriminator across every action helper in this file. SB1-G (S21 2026-05-12)
 * routes everything through `listingType==X` — the legacy boolean flags are
 * never emitted by code under our control any more.
 */
const PUBLISHED_CLAUSE = "status==published";
const AUCTIONS_PUBLISHED = `listingType==auction,${PUBLISHED_CLAUSE}`;
const PREORDERS_PUBLISHED = `listingType==pre-order,${PUBLISHED_CLAUSE}`;

export interface ProductListActionParams {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
  /** Canonical listing-kind discriminator (SB1-G Phase 4). */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "bundle";
  featured?: boolean;
  storeId?: string;
  categoriesIn?: string[];
}

export type ProductListResult = FirebaseSieveResult<ProductDocument>;

export async function listProducts(
  params: ProductListActionParams = {},
): Promise<ProductListResult> {
  const {
    filters,
    sorts = "-createdAt",
    page = 1,
    pageSize = 20,
    listingType,
    featured,
    storeId,
    categoriesIn,
  } = params;

  const compoundFilters: string[] = [];
  if (listingType) compoundFilters.push(`listingType==${listingType}`);
  if (featured === true) compoundFilters.push("featured==true");
  if (storeId) compoundFilters.push(`storeId==${storeId}`);
  if (filters) compoundFilters.push(filters);
  const mergedFilters =
    compoundFilters.length > 0 ? compoundFilters.join(",") : undefined;

  const sieve: SieveModel = {
    filters: mergedFilters,
    sorts,
    page,
    pageSize,
  };

  return productRepository.list(sieve, { categoriesIn });
}

export async function getProductById(
  id: string,
): Promise<ProductDocument | null> {
  return productRepository.findById(id);
}

export async function getFeaturedProducts(
  pageSize = 8,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: `featured==true,${PUBLISHED_CLAUSE}`,
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function getFeaturedAuctions(
  pageSize = 6,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: AUCTIONS_PUBLISHED,
    sorts: "auctionEndDate",
    page: 1,
    pageSize,
  });
}

export async function getLatestProducts(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: PUBLISHED_CLAUSE,
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function getLatestAuctions(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: AUCTIONS_PUBLISHED,
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function listAuctions(
  params: ProductListActionParams = {},
): Promise<ProductListResult> {
  const { filters, sorts = "auctionEndDate", page = 1, pageSize = 20 } = params;
  return productRepository.list({
    filters: filters ? `${AUCTIONS_PUBLISHED},${filters}` : AUCTIONS_PUBLISHED,
    sorts,
    page,
    pageSize,
  });
}

export async function getFeaturedPreOrders(
  pageSize = 6,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: PREORDERS_PUBLISHED,
    sorts: "preOrderDeliveryDate",
    page: 1,
    pageSize,
  });
}

export async function getLatestPreOrders(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: PREORDERS_PUBLISHED,
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function listPreOrders(
  params: ProductListActionParams = {},
): Promise<ProductListResult> {
  const {
    filters,
    sorts = "preOrderDeliveryDate",
    page = 1,
    pageSize = 20,
  } = params;
  return productRepository.list({
    filters: filters ? `${PREORDERS_PUBLISHED},${filters}` : PREORDERS_PUBLISHED,
    sorts,
    page,
    pageSize,
  });
}

export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit = 6,
): Promise<ProductListResult> {
  const result = await productRepository.list({
    filters: `categoryId==${categoryId},${PUBLISHED_CLAUSE}`,
    sorts: "-createdAt",
    page: 1,
    pageSize: limit + 1,
  });
  return {
    ...result,
    items: result.items.filter((p) => p.id !== excludeId).slice(0, limit),
  };
}

export async function getStoreStorefrontProducts(
  storeId: string,
): Promise<ProductDocument[]> {
  const products = await productRepository.findByStore(storeId);
  return products.filter((p) => p.status === ProductStatusValues.PUBLISHED);
}
