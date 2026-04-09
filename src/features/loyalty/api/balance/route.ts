/**
 * feat-loyalty — GET /api/loyalty/balance
 *
 * User loyalty points balance.
 *
 * Consumer stub:
 * ```ts
 * export { loyaltyBalanceGET as GET } from "@mohasinac/feat-loyalty";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

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

    const repo = db.getRepository<Record<string, unknown>>("loyalty_balance");
    const result = await repo.findAll({
      filters: `userId==${userId}`,
      perPage: 1,
    });

    return NextResponse.json({
      success: true,
      data: result.data[0] ?? { userId, balance: 0 },
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
