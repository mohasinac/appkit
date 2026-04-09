/**
 * feat-stores — single-store route handler (GET /api/stores/[storeSlug])
 *
 * Consuming projects create a 2-line stub:
 *
 * ```ts
 * // app/api/stores/[storeSlug]/route.ts
 * export { GET } from "@mohasinac/feat-stores";   // re-exported as storeSlugGET
 * ```
 *
 * Returns StoreDetail directly (no outer `{ store }` wrapper) so
 * apiClient.get<StoreDetail>('/api/stores/x') resolves correctly.
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";
import type { StoreDetail } from "../../types/index.js";

type RouteContext = { params: Promise<{ storeSlug: string }> };

interface StoreEntity {
  id: string;
  storeSlug: string;
  ownerId: string;
  storeName: string;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;
  status: string;
  isPublic: boolean;
  stats?: {
    totalProducts?: number;
    itemsSold?: number;
    totalReviews?: number;
    averageRating?: number;
  };
  totalProducts?: number;
  itemsSold?: number;
  totalReviews?: number;
  averageRating?: number;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: StoreDetail["socialLinks"];
  returnPolicy?: string;
  shippingPolicy?: string;
  isVacationMode?: boolean;
  vacationMessage?: string;
  createdAt?: string;
}

// ─── GET /api/stores/[storeSlug] ─────────────────────────────────────────────

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
    const store: StoreDetail = {
      id: raw.id,
      storeSlug: raw.storeSlug,
      ownerId: raw.ownerId,
      storeName: raw.storeName,
      storeDescription: raw.storeDescription,
      storeCategory: raw.storeCategory,
      storeLogoURL: raw.storeLogoURL,
      storeBannerURL: raw.storeBannerURL,
      status: raw.status,
      isPublic: raw.isPublic,
      totalProducts: raw.stats?.totalProducts ?? raw.totalProducts ?? undefined,
      itemsSold: raw.stats?.itemsSold ?? raw.itemsSold ?? undefined,
      totalReviews: raw.stats?.totalReviews ?? raw.totalReviews ?? undefined,
      averageRating: raw.stats?.averageRating ?? raw.averageRating,
      bio: raw.bio,
      location: raw.location,
      website: raw.website,
      socialLinks: raw.socialLinks,
      returnPolicy: raw.returnPolicy,
      shippingPolicy: raw.shippingPolicy,
      isVacationMode: raw.isVacationMode,
      vacationMessage: raw.vacationMessage,
      createdAt: raw.createdAt,
    };

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error("[feat-stores] GET /api/stores/[storeSlug] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch store" },
      { status: 500 },
    );
  }
}
