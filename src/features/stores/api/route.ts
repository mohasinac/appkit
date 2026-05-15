/**
 * feat-stores — Next.js App Router API handlers (GET /api/stores)
 *
 * Consuming projects can create a 2-line stub:
 *
 * ```ts
 * // app/api/stores/route.ts
 * export { GET } from "@mohasinac/feat-stores";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import { parseListingParams } from "../../../utils/listing-params";
import type { StoreListItem, StoreListResponse } from "../types/index";

type StoreListEntity = StoreListItem & {
  stats?: {
    totalProducts?: number;
    itemsSold?: number;
    totalReviews?: number;
    averageRating?: number;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

const SAFE_STORE_FILTER_FIELDS = new Set([
  "storeName",
  "storeCategory",
  "status",
  "isPublic",
  "isFeatured",
  "averageRating",
  "stats.totalProducts",
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

// --- GET /api/stores --------------------------------------------------------
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const std = parseListingParams(url);
    const page = std.page ?? DEFAULT_PAGE;
    const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
    // Translate user-friendly sort names to Firestore nested field paths.
    const rawSort = std.sorts ?? DEFAULT_SORT;
    const sort = rawSort
      .replace(/^-itemsSold$/, "-stats.itemsSold")
      .replace(/^itemsSold$/, "stats.itemsSold")
      .replace(/^-averageRating$/, "-stats.averageRating")
      .replace(/^averageRating$/, "stats.averageRating");

    const parts: string[] = ["status==active,isPublic==true"];
    if (std.q) parts.push(`storeName@=*${std.q}`);
    const category = param(url, "category");
    if (category) parts.push(`storeCategory==${category}`);
    if (std.filters) {
      const safe = validateSieveFilters(std.filters, SAFE_STORE_FILTER_FIELDS);
      if (safe) parts.push(safe);
    }
    const filters = parts.join(",");

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<StoreListEntity>("stores");
    const result = await repo.findAll({
      filters,
      sort,
      page,
      perPage: pageSize,
    });

    // Map to public-safe shape (strip sensitive fields)
    const items: StoreListItem[] = result.data.map((s) => ({
      id: s.id,
      storeSlug: s.storeSlug,
      ownerId: s.ownerId,
      storeName: s.storeName,
      storeDescription: s.storeDescription,
      storeCategory: s.storeCategory,
      storeLogoURL: s.storeLogoURL,
      storeBannerURL: s.storeBannerURL,
      status: s.status,
      isPublic: s.isPublic,
      totalProducts: s.stats?.totalProducts ?? s.totalProducts ?? undefined,
      itemsSold: s.stats?.itemsSold ?? s.itemsSold ?? undefined,
      totalReviews: s.stats?.totalReviews ?? s.totalReviews ?? undefined,
      averageRating: s.stats?.averageRating ?? s.averageRating,
      createdAt: s.createdAt,
    }));

    const body: StoreListResponse = {
      items,
      total: result.total,
      page: result.page,
      pageSize: result.perPage,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    };

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error("[feat-stores] GET /api/stores failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stores" },
      { status: 500 },
    );
  }
}
