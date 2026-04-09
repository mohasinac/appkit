/**
 * feat-seller — GET /api/seller/products
 *
 * Returns the authenticated seller's own products.
 * Enforces `sellerId=={uid}` server-side to prevent spoofing.
 *
 * Response shape matches letitrip's local route exactly so the
 * `useSellerProducts` hook needs no transform.
 *
 * Consumer stub:
 * ```ts
 * export { sellerProductsGET as GET } from "@mohasinac/feat-seller";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";
import { createRouteHandler } from "@mohasinac/next";

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const GET = createRouteHandler({
  roles: ["seller", "admin", "moderator"],
  handler: async ({ request, user }): Promise<NextResponse> => {
    const url = new URL(request.url);
    const page = Math.max(1, numParam(url, "page", 1));
    const pageSize = Math.min(100, Math.max(1, numParam(url, "pageSize", 25)));
    const clientFilters = url.searchParams.get("filters") ?? "";
    const sort =
      url.searchParams.get("sorts") ??
      url.searchParams.get("sort") ??
      "-createdAt";

    // Server-side security: force sellerId filter so sellers can't see others' products
    const sellerFilter = `sellerId==${user!.uid}`;
    const combinedFilters = clientFilters
      ? `${sellerFilter},${clientFilters}`
      : sellerFilter;

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("products");
    const result = await repo.findAll({
      filters: combinedFilters,
      sort,
      page,
      perPage: pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    // Keep same response shape as local route so useSellerProducts hook needs no changes
    return NextResponse.json({
      success: true,
      data: {
        products: result.data,
        meta: {
          page: result.page,
          limit: pageSize,
          total: result.total,
          totalPages,
          hasMore: result.page < totalPages,
        },
      },
    });
  },
});
