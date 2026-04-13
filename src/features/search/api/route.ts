/**
 * feat-search — Next.js App Router API handler (GET /api/search)
 *
 * 2-line stub:
 * ```ts
 * // app/api/search/route.ts
 * export { GET } from "@mohasinac/feat-search";
 * ```
 *
 * Performs Sieve-based product search via SearchRepository.
 * Supports: q, category, subcategory, minPrice, maxPrice, condition,
 *   isAuction, isPreOrder, inStock, minRating, sort, page, pageSize.
 *
 * Note: external search providers are not built into this route. To enable one,
 * register an ISearchProvider via registerProviders() and handle it at
 * the application layer (middleware / wrapper route) before delegating here.
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collection: "products"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import { SearchRepository } from "../repository/search.repository";
import type { SearchProductItem } from "../types/index";

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// ─── GET /api/search ──────────────────────────────────────────────────────────
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const isAuctionRaw = param(url, "isAuction");
    const isAuction =
      isAuctionRaw === "true"
        ? true
        : isAuctionRaw === "false"
          ? false
          : undefined;

    const isPreOrderRaw = param(url, "isPreOrder");
    const isPreOrder = isPreOrderRaw === "true" ? true : undefined;

    const inStockRaw = param(url, "inStock");
    const inStock = inStockRaw === "true" ? true : undefined;

    const minPriceRaw = numParam(url, "minPrice", 0);
    const maxPriceRaw = numParam(url, "maxPrice", 0);
    const page = numParam(url, "page", 1);
    const pageSize = Math.min(numParam(url, "pageSize", 20), 100);

    const repo = new SearchRepository(
      db.getRepository<SearchProductItem>("products"),
    );

    const result = await repo.search({
      q: param(url, "q") ?? undefined,
      category: param(url, "category") ?? undefined,
      subcategory: param(url, "subcategory") ?? undefined,
      minPrice: minPriceRaw > 0 ? minPriceRaw : undefined,
      maxPrice: maxPriceRaw > 0 ? maxPriceRaw : undefined,
      condition: param(url, "condition") ?? undefined,
      isAuction,
      isPreOrder,
      inStock,
      minRating: numParam(url, "minRating", 0) || undefined,
      sort: param(url, "sort") ?? "-createdAt",
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: { ...result, backend: "firestore" as const },
    });
  } catch (error) {
    console.error("[feat-search] GET /api/search failed", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 },
    );
  }
}
