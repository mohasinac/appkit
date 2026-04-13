/**
 * feat-stores — store auctions (GET /api/stores/[storeSlug]/auctions)
 *
 * 2-line stub:
 * ```ts
 * // app/api/stores/[storeSlug]/auctions/route.ts
 * export { storeAuctionsGET as GET } from "@mohasinac/feat-stores";
 * ```
 *
 * Returns published auction listings for a store, paginated.
 * Query params: sorts, page, pageSize, filters (extra Sieve filter string).
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collections: "stores", "products"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../../contracts";
import type {
  StoreAuctionItem,
  StoreProductsResponse,
} from "../../../types/index";

interface StoreEntity {
  ownerId: string;
}

const SAFE_STORE_AUCTION_FILTER_FIELDS = new Set(["price", "category"]);

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

type RouteContext = { params: Promise<{ storeSlug: string }> };

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// ─── GET /api/stores/[storeSlug]/auctions ─────────────────────────────────────
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
      "isAuction==true",
    ];
    const extra = param(url, "filters");
    if (extra) {
      const safe = validateSieveFilters(
        extra,
        SAFE_STORE_AUCTION_FILTER_FIELDS,
      );
      if (safe) filterParts.push(safe);
    }

    const productsRepo = db.getRepository<StoreAuctionItem>("products");
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
      "[feat-stores] GET /api/stores/[storeSlug]/auctions failed",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch store auctions" },
      { status: 500 },
    );
  }
}
