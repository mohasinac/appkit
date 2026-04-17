"use client";

import React from "react";
import { Div, Heading, Row, Span, Text } from "../../../ui";
import { useBlogPost } from "../hooks/useBlog";
import { BlogCard } from "./BlogListView";
import type { BlogPost, BlogPostCategory } from "../types";
import type { BlogPostDetailResponse } from "../api/[slug]/route";
import { getMediaUrl } from "../../media/types/index";
import { getDefaultLocale } from "../../../core/baseline-resolver";

const CATEGORY_BADGE: Record<BlogPostCategory, string> = {
  news: "bg-blue-100 text-blue-800",
  tips: "bg-emerald-100 text-emerald-800",
  guides: "bg-indigo-100 text-indigo-800",
  updates: "bg-purple-100 text-purple-800",
  community: "bg-orange-100 text-orange-800",
};

export interface BlogPostViewProps {
  slug: string;
  initialData?: BlogPostDetailResponse;
  labels?: {
    backToBlog?: string;
    notFound?: string;
    notFoundDescription?: string;
    author?: string;
    readTime?: string;
    publishedOn?: string;
    viewsLabel?: string;
    featured?: string;
    relatedTitle?: string;
  };
  /** Render the cover image */
  renderImage?: (post: BlogPost) => React.ReactNode;
  /** Render the HTML content (for custom sanitization/prosemirror) */
  renderContent?: (post: BlogPost) => React.ReactNode;
  /** Render a back button */
  renderBackButton?: () => React.ReactNode;
  /** Render loading state */
  renderLoading?: () => React.ReactNode;
  /** Render error/not-found state */
  renderError?: (error: Error | null) => React.ReactNode;
  /** Render a related post card */
  renderRelatedCard?: (post: BlogPost, index: number) => React.ReactNode;
  className?: string;
}

export function BlogPostView({
  slug,
  initialData,
  labels = {},
  renderImage,
  renderContent,
  renderBackButton,
  renderLoading,
  renderError,
  renderRelatedCard,
  className = "",
}: BlogPostViewProps) {
  const { post, related, isLoading, error } = useBlogPost(slug, {
    initialData,
  });

  if (isLoading) {
    if (renderLoading) return <>{renderLoading()}</>;
    return (
      <Div className="flex items-center justify-center min-h-screen">
        <Div className="animate-pulse text-neutral-400">Loading…</Div>
      </Div>
    );
  }

  if (error || !post) {
    if (renderError) return <>{renderError(error ?? null)}</>;
    return (
      <Div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <Heading level={1} className="text-xl font-semibold">
          {labels.notFound ?? "Post not found"}
        </Heading>
        <Text className="text-neutral-500">
          {labels.notFoundDescription ?? "This post is not available."}
        </Text>
        {renderBackButton?.()}
      </Div>
    );
  }

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const coverImageUrl = getMediaUrl(post.coverImage);

  return (
    <Div className={`min-h-screen ${className}`}>
      {/* Cover image */}
      {coverImageUrl && (
        <Div className="relative h-72 md:h-96 overflow-hidden">
          {renderImage ? (
            renderImage(post)
          ) : (
            <Div
              role="img"
              aria-label={post.title}
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            />
          )}
          <Div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </Div>
      )}

      <Div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <Div className="mb-8">
          <Div className="flex items-center gap-2 mb-4">
            <Span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_BADGE[post.category] ?? ""}`}
            >
              {post.category}
            </Span>
            {post.isFeatured && (
              <Span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {labels.featured ?? "Featured"}
              </Span>
            )}
          </Div>
          <Heading level={1} className="text-3xl font-bold mb-4">
            {post.title}
          </Heading>
          {post.excerpt && (
            <Text className="text-lg text-neutral-500 mb-6">
              {post.excerpt}
            </Text>
          )}
          <Row wrap gap="md" className="text-sm text-neutral-400">
            {post.authorName && (
              <Span>
                {labels.author ?? "By"}{" "}
                <Span className="font-medium text-neutral-700">
                  {post.authorName}
                </Span>
              </Span>
            )}
            {post.readTimeMinutes != null && (
              <Span>
                {post.readTimeMinutes} {labels.readTime ?? "min read"}
              </Span>
            )}
            {date && (
              <Span>
                {labels.publishedOn ?? "Published"} {date}
              </Span>
            )}
            {post.views != null && (
              <Span>
                {post.views} {labels.viewsLabel ?? "views"}
              </Span>
            )}
          </Row>
        </Div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <Row wrap gap="sm" className="mb-8">
            {post.tags.map((tag) => (
              <Span
                key={tag}
                className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium"
              >
                #{tag}
              </Span>
            ))}
          </Row>
        )}

        {/* Content */}
        <Div className="bg-white rounded-xl border border-neutral-200 p-8 mb-12">
          {renderContent ? (
            renderContent(post)
          ) : (
            <Div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
            />
          )}
        </Div>

        {/* Related posts */}
        {related.length > 0 && (
          <Div>
            <Heading level={2} className="text-xl font-semibold mb-6">
              {labels.relatedTitle ?? "Related Posts"}
            </Heading>
            <Div className="grid sm:grid-cols-3 gap-6">
              {related.map((rel, i) =>
                renderRelatedCard ? (
                  <React.Fragment key={rel.id}>
                    {renderRelatedCard(rel, i)}
                  </React.Fragment>
                ) : (
                  <BlogCard key={rel.id} post={rel} />
                ),
              )}
            </Div>
          </Div>
        )}

        {/* Back button */}
        {renderBackButton && (
          <Div className="mt-10 pt-8 border-t border-neutral-200">
            {renderBackButton()}
          </Div>
        )}
      </Div>
    </Div>
  );
}
