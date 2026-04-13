/**
 * feat-pre-orders — GET /api/admin/pre-orders
 *
 * Admin pre-order list with Sieve filtering.
 *
 * Consumer stub:
 * ```ts
 * export { adminPreOrdersGET as GET } from "@mohasinac/feat-pre-orders";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
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

    const repo = db.getRepository<Record<string, unknown>>("pre_orders");
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
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
