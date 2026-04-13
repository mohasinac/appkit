/**
 * feat-seller — GET /api/seller/offers
 *
 * Returns all incoming offers for the authenticated seller.
 * Queries the `offers` collection filtered by `sellerId == uid`.
 *
 * Response: `{ success: true, data: { offers: OfferDocument[], total: number } }`
 *
 * Consumer stub:
 * ```ts
 * // src/app/api/seller/offers/route.ts
 * export { sellerOffersGET as GET } from "@mohasinac/feat-seller";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next";

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
    const pageSize = Math.min(100, Math.max(1, numParam(url, "pageSize", 50)));
    const sort =
      url.searchParams.get("sorts") ??
      url.searchParams.get("sort") ??
      "-createdAt";

    // Optional status filter passed by client
    const parts: string[] = [`sellerId==${user!.uid}`];
    const status = url.searchParams.get("status");
    if (status && status !== "all") parts.push(`status==${status}`);
    const extraFilters = url.searchParams.get("filters");
    if (extraFilters) parts.push(extraFilters);

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("offers");
    const result = await repo.findAll({
      filters: parts.join(","),
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
