import { normalizeError } from "../../../../../errors/normalize";
/**
 * feat-stores — store collector drops (GET /api/stores/[storeSlug]/collector-drops)
 *
 * 2-line stub:
 * ```ts
 * // app/api/stores/[storeSlug]/collector-drops/route.ts
 * export { storeCollectorDropsGET as GET } from "@mohasinac/feat-stores";
 * ```
 *
 * Returns published collector drop listings for a store, paginated.
 * Query params: sorts, page, pageSize, filters (extra Sieve filter string).
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collections: "stores", "products"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../../contracts";
import type {
  StoreCollectorDropItem,
  StoreProductsResponse,
} from "../../../types/index";

interface StoreEntity {
  id: string;
  ownerId: string;
}

const SAFE_STORE_COLLECTOR_DROP_FILTER_FIELDS = new Set(["price", "category"]);

import { parseListingParams } from "../../../../../utils/listing-params";
import { SIEVE_OP, sieveFilter } from "../../../../../utils/sieve-builder";
import { PRODUCT_FIELDS } from "../../../../../constants/field-names";
import { validateSieveFilters } from "../../../../../utils/sieve-builder";

type RouteContext = { params: Promise<{ storeSlug: string }> };

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

// --- GET /api/stores/[storeSlug]/collector-drops -------------------------------------
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { storeSlug } = await context.params;
    const url = new URL(request.url);

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    // Resolve store by slug
    const storesRepo = db.getRepository<StoreEntity>("stores");
    const storeResult = await storesRepo.findAll({
      filters: `storeSlug==${storeSlug},status==active,isPublic==true`,
      pageSize: 1,
    });
    const store = storeResult.data[0];
    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 },
      );
    }

    const std = parseListingParams(url);
    const sort = std.sorts ?? DEFAULT_SORT;
    const page = std.page ?? DEFAULT_PAGE;
    const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;

    const filterParts = [
      `storeId==${store.id}`,
      "status==published",
      sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, "collector-drop"),
    ];
    if (std.filters) {
      const safe = validateSieveFilters(
        std.filters,
        SAFE_STORE_COLLECTOR_DROP_FILTER_FIELDS,
      );
      if (safe) filterParts.push(safe);
    }

    const productsRepo = db.getRepository<StoreCollectorDropItem>("products");
    const result = await productsRepo.findAll({
      filters: filterParts.join(","),
      sort,
      order: sort.startsWith("-") ? "desc" : "asc",
      page,
      pageSize: pageSize,
    });

    const body: StoreProductsResponse = {
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    };

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    void normalizeError(error);
    console.error(
      "[feat-stores] GET /api/stores/[storeSlug]/collector-drops failed",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch store collector drops" },
      { status: 500 },
    );
  }
}
