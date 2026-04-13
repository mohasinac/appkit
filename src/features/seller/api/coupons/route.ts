/**
 * feat-seller — GET /api/seller/coupons
 *
 * Returns all coupons owned by the authenticated seller.
 * Queries the `coupons` collection filtered by `sellerId == uid`.
 *
 * Response: `{ success: true, data: { coupons: CouponDocument[], total: number } }`
 *
 * Consumer stub:
 * ```ts
 * // src/app/api/seller/coupons/route.ts
 * export { sellerCouponsGET as GET } from "@mohasinac/feat-seller";
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
    const pageSize = Math.min(200, Math.max(1, numParam(url, "pageSize", 100)));
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
      filters: `sellerId==${user!.uid}`,
      sort,
      page,
      perPage: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: { coupons: result.data, total: result.total },
    });
  },
});
