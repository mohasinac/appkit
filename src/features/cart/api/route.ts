/**
 * feat-cart — GET/POST /api/cart
 *
 * User cart list with Sieve filtering and cart creation.
 *
 * Consumer stub:
 * ```ts
 * export { cartListGET as GET, cartListPOST as POST } from "@mohasinac/feat-cart";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";

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

    const repo = db.getRepository<Record<string, unknown>>("carts");
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("carts");
    const created = await repo.create({
      ...body,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 },
    );
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
