/**
 * feat-auctions — Next.js App Router API handler (GET /api/bids)
 *
 * 2-line stub:
 * ```ts
 * // app/api/bids/route.ts
 * export { GET } from "@mohasinac/feat-auctions";
 * ```
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collection: "bids"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import type { BidRecord, BidListResponse } from "../types/index";
import { normalizeError } from "../../../errors/normalize";
import { numParam, param } from "../../../utils/search-params";

// --- GET /api/bids ------------------------------------------------------------
// Query params:
//   auctionId — filter bids for a specific auction product (recommended)
//   bidderId  — filter bids placed by a specific user
//   sort      — Sieve sort field (default: "-amount" = highest bid first)
//   page / pageSize — pagination
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const auctionId = param(url, "auctionId");
    const bidderId = param(url, "bidderId");
    const sort = param(url, "sort") ?? "-amount";
    const page = numParam(url, "page", 1);
    const pageSize = numParam(url, "pageSize", 50);

    const parts: string[] = [];
    if (auctionId) parts.push(`auctionId==${auctionId}`);
    if (bidderId) parts.push(`bidderId==${bidderId}`);
    const filters = parts.join(",");

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<BidRecord>("bids");
    const result = await repo.findAll({
      filters,
      sort,
      page,
      pageSize: pageSize,
    });

    const body: BidListResponse = {
      items: result.data,
      total: result.total,
      hasMore: result.data.length === pageSize,
    };

    const response = NextResponse.json({ success: true, data: body });
    response.headers.set(
      "Cache-Control",
      "public, max-age=10, s-maxage=15, stale-while-revalidate=30",
    );
    return response;
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-auctions] GET /api/bids failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bids" },
      { status: 500 },
    );
  }
}
