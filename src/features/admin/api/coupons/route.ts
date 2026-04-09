/**
 * feat-admin — GET /api/admin/coupons
 *
 * Admin-scoped coupon list using Sieve query params.
 * Returns { items, total, page, pageSize, totalPages, hasMore }.
 *
 * Consumer stub:
 * ```ts
 * export { adminCouponsGET as GET } from "@mohasinac/feat-admin";
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
  roles: ["admin", "moderator"],
  handler: async ({ request }): Promise<NextResponse> => {
    const url = new URL(request.url);
    const page = Math.max(1, numParam(url, "page", 1));
    const pageSize = Math.min(200, Math.max(1, numParam(url, "pageSize", 50)));
    const filters = url.searchParams.get("filters") ?? undefined;
    const sort =
      url.searchParams.get("sorts") ??
      url.searchParams.get("sort") ??
      "-createdAt";

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("coupons");
    const result = await repo.findAll({
      filters,
      sort,
      page,
      perPage: pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return NextResponse.json({
      success: true,
      data: {
        items: result.data,
        total: result.total,
        page: result.page,
        pageSize,
        totalPages,
        hasMore: result.page < totalPages,
      },
    });
  },
});
