/**
 * feat-promotions — Next.js App Router API handler (GET /api/promotions)
 *
 * 2-line stub:
 * ```ts
 * // app/api/promotions/route.ts
 * export { GET } from "@mohasinac/feat-promotions";
 * ```
 *
 * Returns a paginated list of coupons/promotions filtered by active status
 * and/or public visibility. Suitable for a generic coupon listing page.
 *
 * Note: letitrip.in's /api/promotions endpoint returns a richer combined
 * response (promoted products + featured products + active coupons). Projects
 * needing that aggregation should keep a local route handler.
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collection: "coupons"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import type { CouponItem, PromotionsListResponse } from "../types/index";

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// --- GET /api/promotions ------------------------------------------------------
// Query params:
//   isActive  — "true" | "false" (default: "true")
//   isPublic  — "true" filters to public coupons only
//   scope     — "admin" | "seller"
//   sellerId  — filter seller-scoped coupons
//   sort      — Sieve sort field (default: "-createdAt")
//   page / pageSize — pagination
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const sort = param(url, "sort") ?? "-createdAt";
    const page = numParam(url, "page", 1);
    const pageSize = numParam(url, "pageSize", 20);

    const parts: string[] = [];

    const isActive = param(url, "isActive") ?? "true";
    parts.push(`isActive==${isActive}`);

    const isPublic = param(url, "isPublic");
    if (isPublic !== null) parts.push(`isPublic==${isPublic}`);

    const scope = param(url, "scope");
    if (scope) parts.push(`scope==${scope}`);

    const sellerId = param(url, "sellerId");
    if (sellerId) parts.push(`sellerId==${sellerId}`);

    const filters = parts.join(",");

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<CouponItem>("coupons");
    const result = await repo.findAll({
      filters,
      sort,
      page,
      perPage: pageSize,
    });

    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    const body: PromotionsListResponse = {
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize,
      totalPages,
      hasMore: result.page < totalPages,
    };

    const response = NextResponse.json({ success: true, data: body });
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=60",
    );
    return response;
  } catch (error) {
    console.error("[feat-promotions] GET /api/promotions failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch promotions" },
      { status: 500 },
    );
  }
}
