/**
 * feat-blog — single-post route handler (GET /api/blog/[slug])
 *
 * Consuming projects create a 2-line stub:
 *
 * ```ts
 * // app/api/blog/[slug]/route.ts
 * export { GET } from "@mohasinac/feat-blog";   // re-exported as blogSlugGET
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";
import { BlogRepository } from "../../repository/blog.repository.js";
import type { BlogPost } from "../../types/index.js";

type RouteContext = { params: Promise<{ slug: string }> };

export interface BlogPostDetailResponse {
  post: BlogPost;
  related: BlogPost[];
}

// ─── GET /api/blog/[slug] ─────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const blogRepo = new BlogRepository(
      db.getRepository<BlogPost>("blogPosts"),
    );

    const post = await blogRepo.findBySlug(slug);
    if (!post) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    // Increment view count fire-and-forget — must not block response
    db.getRepository<BlogPost>("blogPosts")
      .update(post.id, { views: (post.views ?? 0) + 1 } as Partial<BlogPost>)
      .catch(() => {});

    // Related posts: same category, latest 3, excluding current
    const relatedResult = await blogRepo.findByCategory(post.category, 1, 4);
    const related = relatedResult.data
      .filter((p) => p.id !== post.id)
      .slice(0, 3);

    const body: BlogPostDetailResponse = { post, related };
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error("[feat-blog] GET /api/blog/[slug] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog post" },
      { status: 500 },
    );
  }
}
