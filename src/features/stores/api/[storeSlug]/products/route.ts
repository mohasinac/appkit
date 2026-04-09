/**
 * feat-stores — store products (GET /api/stores/[storeSlug]/products)
 *
 * 2-line stub:
 * ```ts
 * // app/api/stores/[storeSlug]/products/route.ts
 * export { storeProductsGET as GET } from "@mohasinac/feat-stores";
 * ```
 *
 * Returns published non-auction products for a store, paginated.
 * Query params: sorts, page, pageSize, filters (extra Sieve filter string).
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collections: "stores", "products"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";
import type {
  StoreProductItem,
  StoreProductsResponse,
} from "../../../types/index.js";

interface StoreEntity {
  ownerId: string;
}

type RouteContext = { params: Promise<{ storeSlug: string }> };

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

const SAFE_STORE_PRODUCT_FILTER_FIELDS = new Set([
  "category",
  "price",
  "brand",
  "condition",
]);

function validateSieveFilters(
  raw: string,
  allowedFields: ReadonlySet<string>,
): string {
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => {
      const m = c.match(/^([^<>=!@]+)\s*(?:==|!=|<=|>=|<|>|@=\*?)/);
      return m ? allowedFields.has(m[1].trim()) : false;
    })
    .join(",");
}

// ─── GET /api/stores/[storeSlug]/products ─────────────────────────────────────
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
      perPage: 1,
    });
    const store = storeResult.data[0];
    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 },
      );
    }

    const sort = param(url, "sorts") ?? "-createdAt";
    const page = numParam(url, "page", 1);
    const pageSize = numParam(url, "pageSize", 24);

    const filterParts = [
      `sellerId==${store.ownerId}`,
      "status==published",
      "isAuction==false",
    ];
    const extra = param(url, "filters");
    if (extra) {
      const safe = validateSieveFilters(
        extra,
        SAFE_STORE_PRODUCT_FILTER_FIELDS,
      );
      if (safe) filterParts.push(safe);
    }

    const productsRepo = db.getRepository<StoreProductItem>("products");
    const result = await productsRepo.findAll({
      filters: filterParts.join(","),
      sort,
      order: sort.startsWith("-") ? "desc" : "asc",
      page,
      perPage: pageSize,
    });

    const body: StoreProductsResponse = {
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.perPage,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    };

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error(
      "[feat-stores] GET /api/stores/[storeSlug]/products failed",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch store products" },
      { status: 500 },
    );
  }
}
