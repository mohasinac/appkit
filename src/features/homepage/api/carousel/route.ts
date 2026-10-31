/**
 * feat-homepage — Next.js App Router API handler (GET /api/carousel)
 *
 * Pure stub:
 * ```ts
 * // app/api/carousel/route.ts
 * export { carouselGET as GET } from "@mohasinac/feat-homepage";
 * ```
 *
 * 🛑 No more POST here, and no more `carouselSlides` collection to read from.
 * The hero carousel has no standalone slide document any more — every slide
 * is one event with `showOnCarousel: true`, computed live by
 * `getHeroCarouselSlides()`. This is the SAME function the SSR render in
 * `MarketplaceHomepageView` calls; the two must never diverge into two
 * implementations of "what shows on the homepage" again (that is exactly how
 * the client-side refetch used to read an entirely different, ungated
 * `db.getRepository("carouselSlides")` path than the SSR render did).
 */

import { NextResponse } from "next/server.js";
import { getHeroCarouselSlides } from "../../../../_internal/server/features/events/data";
import { normalizeError } from "../../../../errors/normalize";

// --- GET /api/carousel --------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const slides = await getHeroCarouselSlides();
    const response = NextResponse.json({ success: true, data: slides });
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=600, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-homepage] GET /api/carousel failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch carousel slides" },
      { status: 500 },
    );
  }
}

export { GET as carouselGET };
