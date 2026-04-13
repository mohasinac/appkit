/**
 * feat-loyalty — POST /api/loyalty/redeem
 *
 * Redeem loyalty points for rewards.
 *
 * Consumer stub:
 * ```ts
 * export { loyaltyRedeemPOST as POST } from "@mohasinac/feat-loyalty";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>(
      "loyalty_transactions",
    );
    const created = await repo.create({
      ...body,
      type: "redeem",
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
