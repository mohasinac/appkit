/**
 * feat-blog — single-post route handler (GET /api/blog/[slug])
 *
 * Consuming projects create a 2-line stub:
 *
 * ```ts
 * // app/api/blog/[slug]/route.ts
 * export { GET } from "@mohasinac/feat-blog"; // re-exported as blogSlugGET
 * ```
 */

import { NextResponse } from "next/server.js";
import { blogRepository } from "../../repository/blog.repository";
import type { BlogPostDocument } from "../../schemas";
import type { BlogPost } from "../../types/index";
import { normalizeError } from "../../../../errors/normalize";
import { safeFireAndForget } from "../../../../utils/safe-fire-forget";

type RouteContext = { params: Promise<{ slug: string }> };

export interface BlogPostDetailResponse {
  post: BlogPost;
  /** Same category — the original single "related" signal. */
  related: BlogPost[];
  /** Posts sharing at least one tag. */
  relatedByTags: BlogPost[];
  /** Other posts by the same author. */
  relatedByAuthor: BlogPost[];
}

function toBlogPost(doc: BlogPostDocument): BlogPost {
  return {
    ...doc,
    publishedAt: doc.publishedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// --- GET /api/blog/[slug] -----------------------------------------------------

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;

    const post = await blogRepository.findBySlug(slug);
    if (!post) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    // Increment view count fire-and-forget — must not block response
    safeFireAndForget(blogRepository.incrementViews(post.id), "blog: incrementViews");

    // Related posts: same category / tag overlap / same author — latest 3 each, excluding current
    const [related, relatedByTags, relatedByAuthor] = await Promise.all([
      blogRepository.findRelated(post.category, post.id, 3),
      blogRepository.findByTagsOverlap(post.tags ?? [], post.id, 3),
      blogRepository.findByAuthor(post.authorId, post.id, 3),
    ]);

    const body: BlogPostDetailResponse = {
      post: toBlogPost(post),
      related: related.map(toBlogPost),
      relatedByTags: relatedByTags.map(toBlogPost),
      relatedByAuthor: relatedByAuthor.map(toBlogPost),
    };
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-blog] GET /api/blog/[slug] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog post" },
      { status: 500 },
    );
  }
}
