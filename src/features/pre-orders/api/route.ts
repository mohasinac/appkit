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
import { getProviders } from "@mohasinac/contracts";

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, numParam(url, "page", 1));
    const pageSize = Math.min(100, Math.max(1, numParam(url, "pageSize", 20)));
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ─── POST /api/pre-orders ──────────────────────────────────────────────────
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
