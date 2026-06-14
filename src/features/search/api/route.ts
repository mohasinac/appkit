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
 *   listingType, inStock, minRating, sort, page, pageSize.
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
import {
import { normalizeError } from "../../../errors/normalize";
  isListingTypeEnabled,
  enabledListingTypes,
} from "../../../_internal/shared/listing-types/feature-flags";
import { getSiteSettingsGlobal } from "../../admin/utils/getSiteSettingsGlobal";

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// --- GET /api/search ----------------------------------------------------------
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

    // SB1-G Phase 4 — canonical `?listingType=auction|pre-order|standard|prize-draw`.
    // SB-UNI-D — "bundle" removed; bundles are a categoryType, not a listingType.
    const listingTypeRaw = param(url, "listingType");
    const VALID_LISTING_TYPES = new Set([
      "standard",
      "auction",
      "pre-order",
      "prize-draw",
    ] as const);
    const listingType =
      listingTypeRaw && VALID_LISTING_TYPES.has(listingTypeRaw as "standard")
        ? (listingTypeRaw as
            | "standard"
            | "auction"
            | "pre-order"
            | "prize-draw")
        : undefined;

    const inStockRaw = param(url, "inStock");
    const inStock = inStockRaw === "true" ? true : undefined;

    const minPriceRaw = numParam(url, "minPrice", 0);
    const maxPriceRaw = numParam(url, "maxPrice", 0);
    const page = numParam(url, "page", 1);
    const pageSize = Math.min(numParam(url, "pageSize", 20), 100);

    // W1-43 — listing-type feature flag gating. Reject a search scoped to a
    // disabled listing type with an empty result; for unscoped searches,
    // strip disabled types post-query so search-bar suggestions stay clean.
    let siteSettings: Awaited<ReturnType<typeof getSiteSettingsGlobal>> | null = null;
    try {
      siteSettings = await getSiteSettingsGlobal();
    } catch {
      siteSettings = null;
    }
    if (listingType && siteSettings && !isListingTypeEnabled(listingType, siteSettings)) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
          backend: "firestore" as const,
          listingTypeDisabled: true,
        },
      });
    }
    const enabledSet = new Set<string>(
      siteSettings ? enabledListingTypes(siteSettings) : [],
    );

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
      listingType,
      inStock,
      minRating: numParam(url, "minRating", 0) || undefined,
      sort: param(url, "sort") ?? "-createdAt",
      page,
      pageSize,
    });

    // W1-43 — when no specific listingType filter, strip disabled types from
    // the surface. Skipped when all types are enabled or settings failed to load.
    let filteredItems = result.items;
    let filteredTotal = result.total;
    if (!listingType && enabledSet.size > 0 && enabledSet.size < 7) {
      const before = filteredItems.length;
      filteredItems = filteredItems.filter((it) =>
        enabledSet.has(it.listingType ?? "standard"),
      );
      const removed = before - filteredItems.length;
      filteredTotal = Math.max(0, filteredTotal - removed);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        items: filteredItems,
        total: filteredTotal,
        backend: "firestore" as const,
      },
    });
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-search] GET /api/search failed", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 },
    );
  }
}
