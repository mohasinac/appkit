/**
 * feat-account — GET/PATCH /api/account/[userId]
 *
 * User account retrieval and updates using Sieve query params.
 * GET returns single user by ID.
 * PATCH updates user fields.
 *
 * Consumer stub:
 * ```ts
 * export { userAccountGET as GET, userAccountPATCH as PATCH } from "@mohasinac/feat-account";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await params;
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

    const repo = db.getRepository<Record<string, unknown>>("users");
    const user = await repo.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
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

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("users");
    const updated = await repo.update(userId, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
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
