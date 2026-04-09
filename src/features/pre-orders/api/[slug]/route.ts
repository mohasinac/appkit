/**
 * feat-preorders — GET /api/preorders/[slug]
 *
 * Pre-order retrieval by slug.
 *
 * Consumer stub:
 * ```ts
 * export { preorderDetailGET as GET } from "@mohasinac/feat-preorders";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Pre-order slug required" },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("preorders");
    const result = await repo.findAll({
      filters: `slug==${slug}`,
      perPage: 1,
    });

    if (!result.data[0]) {
      return NextResponse.json(
        { success: false, error: "Pre-order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data[0],
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
