/**
 * feat-loyalty — GET /api/loyalty/history
 *
 * User loyalty transaction history.
 *
 * Consumer stub:
 * ```ts
 * export { loyaltyHistoryGET as GET } from "@mohasinac/feat-loyalty";
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
    const userId = url.searchParams.get("userId");
    const page = Math.max(1, numParam(url, "page", 1));
    const pageSize = Math.min(100, Math.max(1, numParam(url, "pageSize", 20)));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>(
      "loyalty_transactions",
    );
    const result = await repo.findAll({
      filters: `userId==${userId}`,
      sort: "-createdAt",
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
