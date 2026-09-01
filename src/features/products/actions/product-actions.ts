import { sieveAnd, sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import type { ListingType } from "../types";
import { listPublicProducts } from "../../../_internal/server/features/products/list-public";
import { AVAILABILITY_VALUES, PRODUCT_FIELDS } from "../../../constants/field-names";
import { productRepository } from "../repository/products.repository";
import { ProductStatusValues } from "../schemas";
import type { ProductDocument } from "../schemas";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

/**
 * Reusable Sieve clauses. Single source of truth for the listing-type
 * discriminator across every action helper in this file. SB1-G (S21 2026-05-12)
 * routes everything through sieveFilter("listingType", SIEVE_OP.EQ, "X") â€” the legacy boolean flags are
 * never emitted by code under our control any more.
 */
const PUBLISHED_CLAUSE = sieveFilter("status", SIEVE_OP.EQ, "published");
const AUCTIONS_PUBLISHED = sieveAnd(sieveFilter("listingType", SIEVE_OP.EQ, "auction"), PUBLISHED_CLAUSE);
const PREORDERS_PUBLISHED = sieveAnd(sieveFilter("listingType", SIEVE_OP.EQ, "pre-order"), PUBLISHED_CLAUSE);

export interface ProductListActionParams {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
  /** Canonical listing-kind discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
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
  if (listingType) compoundFilters.push(sieveFilter("listingType", SIEVE_OP.EQ, listingType));
  if (featured === true) compoundFilters.push("featured==true");
  if (storeId) compoundFilters.push(sieveFilter("storeId", SIEVE_OP.EQ, storeId));
  if (filters) compoundFilters.push(filters);
  const mergedFilters =
    compoundFilters.length > 0 ? compoundFilters.join(",") : undefined;

  const sieve: SieveModel = {
    filters: mergedFilters,
    sorts,
    page,
    pageSize,
  };

  /*
   * Fail-closed. This is reachable as a SERVER ACTION — invocable straight from
   * a browser — so it is a public surface whoever happens to call it today.
   * `getFeaturedProducts` and friends already route through
   * `listPublicProducts`, which filters; this generic path did not.
   */
  const result = await productRepository.list(sieve, { categoriesIn });
  return { ...result, items: hidePublicTestData(result.items) };
}

export async function getProductById(
  id: string,
): Promise<ProductDocument | null> {
  return productRepository.findById(id);
}

/**
 * `PublicProductListResult` → the `FirebaseSieveResult<ProductDocument>` shape
 * these helpers have always returned, so their ~15 call sites (including the
 * six server-action wrappers in `src/actions/product.actions.ts` and their
 * tests) are unchanged by the switch to the shared query.
 */
function toListResult(
  result: Awaited<ReturnType<typeof listPublicProducts>>,
  pageSize: number,
): ProductListResult {
  if (!result) {
    return { items: [], total: 0, page: 1, pageSize, totalPages: 0, hasMore: false };
  }
  return {
    items: result.items as unknown as ProductDocument[],
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    hasMore: result.hasMore,
  };
}

export async function getFeaturedProducts(
  pageSize = 8,
): Promise<ProductListResult> {
  return toListResult(
    await listPublicProducts({
      featured: true,
      availability: AVAILABILITY_VALUES.AVAILABLE,
      sorts: sortBy("createdAt", "DESC"),
      page: 1,
      pageSize,
    }),
    pageSize,
  );
}

/**
 * The soonest-ending LIVE auctions.
 *
 * This used to be `listingType==auction,status==published` sorted
 * `auctionEndDate ASC` with no lower bound — and ascending order front-loads
 * the OLDEST end dates, so the homepage's "Live Auctions" strip led with the
 * most-expired lots in the catalogue. Nothing about it was flagged as wrong
 * because an ended auction still renders as a perfectly normal card.
 *
 * One listing type, sorted by the same field the scope filters on, means
 * `listPublicProducts` pushes `auctionEndDate >= now` into Firestore rather
 * than filtering a bounded window in memory.
 */
export async function getFeaturedAuctions(
  pageSize = 6,
): Promise<ProductListResult> {
  return toListResult(
    await listPublicProducts({
      listingTypes: [PRODUCT_FIELDS.LISTING_TYPE_VALUES.AUCTION],
      availability: AVAILABILITY_VALUES.AVAILABLE,
      sorts: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC"),
      page: 1,
      pageSize,
    }),
    pageSize,
  );
}

export async function getLatestProducts(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: PUBLISHED_CLAUSE,
    sorts: sortBy("createdAt", "DESC"),
    page: 1,
    pageSize,
  });
}

export async function getLatestAuctions(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: AUCTIONS_PUBLISHED,
    sorts: sortBy("createdAt", "DESC"),
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

/** Pre-orders still accepting orders, soonest delivery first. */
export async function getFeaturedPreOrders(
  pageSize = 6,
): Promise<ProductListResult> {
  return toListResult(
    await listPublicProducts({
      listingTypes: [PRODUCT_FIELDS.LISTING_TYPE_VALUES.PRE_ORDER],
      availability: AVAILABILITY_VALUES.AVAILABLE,
      sorts: sortBy(PRODUCT_FIELDS.PRE_ORDER_DELIVERY_DATE, "ASC"),
      page: 1,
      pageSize,
    }),
    pageSize,
  );
}

export async function getLatestPreOrders(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: PREORDERS_PUBLISHED,
    sorts: sortBy("createdAt", "DESC"),
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
  // `categoryId` here is really a category slug — products store their
  // category FK in categorySlugs[] (array-contains), not a scalar
  // "categoryId" field, which never existed on ProductDocument.
  const docs = await productRepository.findByCategory(categoryId);
  const items = docs
    .filter((p) => p.id !== excludeId && p.status === ProductStatusValues.PUBLISHED)
    .sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
  return { items, total: items.length, page: 1, pageSize: limit, totalPages: 1, hasMore: false };
}

export async function getStoreStorefrontProducts(
  storeId: string,
): Promise<ProductDocument[]> {
  const products = await productRepository.findByStore(storeId);
  return products.filter((p) => p.status === ProductStatusValues.PUBLISHED);
}
