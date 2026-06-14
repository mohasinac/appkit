/**
 * feat-preorders — GET /api/preorders
 *
 * Pre-order list with Sieve filtering.
 *
 * Consumer stub:
 * ```ts
 * export { preordersListGET as GET } from "@mohasinac/feat-preorders";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import { parseListingParams } from "../../../utils/listing-params";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT = "-createdAt";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const std = parseListingParams(url);
    const page = Math.max(1, std.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, std.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const filters = std.filters ?? undefined;
    const sort = std.sorts ?? DEFAULT_SORT;

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("preorders");
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
    void normalizeError(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// --- POST /api/pre-orders --------------------------------------------------
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = (await request.json()) as Record<string, unknown>;
    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );
    const repo = db.getRepository<Record<string, unknown>>("preorders");
    const created = await repo.create({
      ...input,
      status: "pending",
    } as Omit<Record<string, unknown>, "id" | "createdAt" | "updatedAt">);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    void normalizeError(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
