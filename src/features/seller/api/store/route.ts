/**
 * feat-seller — GET /api/seller/store
 *
 * Returns the authenticated seller's own StoreDocument.
 * Queries the `stores` collection filtered by `ownerId == uid`.
 *
 * Response: `{ success: true, data: { store: StoreDocument | null } }`
 *
 * Consumer stub:
 * ```ts
 * // src/app/api/seller/store/route.ts
 * export { sellerStoreGET as GET } from "@mohasinac/feat-seller";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next";

export const GET = createRouteHandler({
  roles: ["seller", "admin", "moderator"],
  handler: async ({ user }): Promise<NextResponse> => {
    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("stores");
    const result = await repo.findAll({
      filters: `ownerId==${user!.uid}`,
      perPage: 1,
    });

    return NextResponse.json({
      success: true,
      data: { store: result.data[0] ?? null },
    });
  },
});
