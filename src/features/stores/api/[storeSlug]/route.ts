/**
 * feat-stores — single-store route handler (GET /api/stores/[storeSlug])
 *
 * Consuming projects create a 2-line stub:
 *
 * ```ts
 * // app/api/stores/[storeSlug]/route.ts
 * export { GET } from "@mohasinac/feat-stores"; // re-exported as storeSlugGET
 * ```
 *
 * Returns StoreDetail directly (no outer `{ store }` wrapper) so
 * apiClient.get<StoreDetail>('/api/stores/x') resolves correctly.
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";
import type { StoreDetail } from "../../types/index";
import { toStoreDetail, type StoreProjectionSource } from "../../../../_internal/server/features/stores/adapters";

import { normalizeError } from "../../../../errors/normalize";
type RouteContext = { params: Promise<{ storeSlug: string }> };

/** Loose row shape — the projection is `toStoreDetail`, not this interface. */
type StoreEntity = StoreProjectionSource & { id: string };

// --- GET /api/stores/[storeSlug] ---------------------------------------------

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { storeSlug } = await context.params;

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    // Look up store by slug — filters for active + public stores only
    const repo = db.getRepository<StoreEntity>("stores");
    const result = await repo.findAll({
      filters: `storeSlug==${storeSlug},status==active,isPublic==true`,
      perPage: 1,
    });

    const raw = result.data[0];
    if (!raw) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 },
      );
    }

    // Map to public-safe StoreDetail shape (strip internal/sensitive fields)
    const store: StoreDetail = toStoreDetail(raw);

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-stores] GET /api/stores/[storeSlug] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch store" },
      { status: 500 },
    );
  }
}
