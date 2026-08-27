/**
 * feat-blog — Next.js App Router API handler (GET /api/blog)
 *
 * Consuming projects can create a 2-line stub:
 *
 * ```ts
 * // app/api/blog/route.ts
 * export { GET } from "@mohasinac/feat-blog";
 * ```
 */

import { blogRepository } from "../repository/blog.repository";
import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import type {
  BlogPost,
  BlogListResponse,
  BlogListMeta,
} from "../types/index";
import { normalizeError } from "../../../errors/normalize";

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// --- GET /api/blog ------------------------------------------------------------

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = numParam(url, "page", 1);
    const perPage = numParam(url, "perPage", 20);
    const sort = param(url, "sort") ?? "-publishedAt";

    const parts: string[] = [];
    const category = param(url, "category");
    if (category) parts.push(`category==${category}`);
    const tags = param(url, "tags");
    if (tags) parts.push(`tags@=${tags}`);
    // Token search rides OUTSIDE `filters` — array-contains is not expressible
    // in Sieve, and as `title@=*` this was a case-SENSITIVE prefix match on the
    // generic repository path (`base.ts`), so "Beyblade" matched and "beyblade"
    // did not. searchTxt is normalised, so case and accents stop mattering.
    const q = param(url, "q");
    const featured = param(url, "featured");
    if (featured === "true") parts.push("isFeatured==true");
    const status = param(url, "status") ?? "published";
    parts.push(`status==${status}`);
    const filters = parts.join(",");

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    // `blogRepository.listAll` rather than the generic `db.getRepository(...)`:
    // only the feature repository knows how to push a searchTxt clause down and
    // AND-refine the remaining terms.
    const result = await blogRepository.listAll(
      { filters, sorts: sort, page, pageSize: perPage },
      q ? { search: q } : undefined,
    );

    const meta: BlogListMeta = {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    };
    const body: BlogListResponse = {
      posts: result.items as unknown as BlogPost[],
      meta,
    };

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-blog] GET /api/blog failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog posts" },
      { status: 500 },
    );
  }
}
