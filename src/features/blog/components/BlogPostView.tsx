"use client";
import React from "react";
import Link from "next/link";
import { Div, Heading, RichText, Row, Span, Text } from "../../../ui";
import { useBlogPost } from "../hooks/useBlog";
import { BlogCard } from "./BlogListView";
import type { BlogPost, BlogPostCategory } from "../types";
import type { BlogPostDetailResponse } from "../api/[slug]/route";
import { getMediaUrl } from "../../media/types/index";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { ROUTES } from "../../../next/routing/route-map";

const __P = {
  p8: "p-8",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CATEGORY_BADGE: Record<BlogPostCategory, string> = {
  news: "bg-info-surface text-info dark:bg-info-surface dark:text-info",
  tips: "bg-success-surface text-success dark:bg-success-surface dark:text-success",
  guides: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  updates: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  community: "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning",
};

const CLS_FEATURED_BADGE = "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning px-2 py-0.5 rounded-full";

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
  /** TS12/VD10 — Render an author bio block (above the article content) */
  renderAuthorBio?: (post: BlogPost) => React.ReactNode;
  className?: string;
}

type BlogPostViewLabels = BlogPostViewProps["labels"] & object;

function renderBlogPostHeader(post: BlogPost, date: string, labels: BlogPostViewLabels) {
  return (
    <Div className="mb-8">
      <Row className="mb-4" gap="sm">
        <Span size="xs" weight="medium" className={`inline-block px-2 py-0.5 rounded-full capitalize ${CATEGORY_BADGE[post.category] ?? ""}`}>{post.category}</Span>
        {post.isFeatured && <Span size="xs" weight="medium" className={CLS_FEATURED_BADGE}>{labels?.featured ?? "Featured"}</Span>}
      </Row>
      <Heading level={1} className="mb-4" size="3xl" weight="bold">{post.title}</Heading>
      {post.excerpt && <Text className="mb-6" color="muted" size="lg">{post.excerpt}</Text>}
      <Row wrap gap="md" className="text-sm text-zinc-400 dark:text-zinc-400">
        {post.authorName && <Span>{labels?.author ?? "By"} <Span weight="medium" color="muted">{post.authorName}</Span></Span>}
        {post.readTimeMinutes != null && <Span>{post.readTimeMinutes} {labels?.readTime ?? "min read"}</Span>}
        {date && <Span>{labels?.publishedOn ?? "Published"} {date}</Span>}
        {post.views != null && <Span>{post.views} {labels?.viewsLabel ?? "views"}</Span>}
      </Row>
    </Div>
  );
}

function renderBlogPostRelated(related: BlogPost[], labels: BlogPostViewLabels, renderRelatedCard?: (post: BlogPost, index: number) => React.ReactNode) {
  if (related.length === 0) return null;
  return (
    <Div>
      <Heading level={2} className="mb-6" size="xl" weight="semibold">{labels?.relatedTitle ?? "Related Posts"}</Heading>
      <Div className="grid sm:grid-cols-3 gap-6">
        {related.map((rel, i) =>
          renderRelatedCard ? (
            <React.Fragment key={rel.id}>{renderRelatedCard(rel, i)}</React.Fragment>
          ) : (
            <BlogCard key={rel.id} post={rel} href={String(ROUTES.BLOG.ARTICLE(rel.slug))} />
          ),
        )}
      </Div>
    </Div>
  );
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
  renderAuthorBio,
  className = "",
}: BlogPostViewProps) {
  const { post, related, isLoading, error } = useBlogPost(slug, {
    initialData,
  });

  if (isLoading) {
    if (renderLoading) return <>{renderLoading()}</>;
    return (
      <Row className="min-h-screen" align="center" justify="center">
        <Div className="animate-pulse text-neutral-400">Loading…</Div>
      </Row>
    );
  }

  if (error || !post) {
    if (renderError) return <>{renderError(error ?? null)}</>;
    return (
      <Div className={`flex flex-col items-center justify-center min-h-screen gap-4 ${__P.p8}`}>
        <Heading level={1} size="xl" weight="semibold">
          {labels.notFound ?? "Post not found"}
        </Heading>
        <Text color="muted">
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
        <Div className={`relative h-72 md:h-96 ${__O.hidden}`}>
          {renderImage ? (
            renderImage(post)
          ) : (
            <Div
              role="img"
              aria-label={post.title}
              className="h-full w-full bg-cover bg-center"
              // audit-inline-style-ok: dynamic image URL
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            />
          )}
          <Div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </Div>
      )}

      <Div className="max-w-3xl mx-auto px-4" padding="y-3xl">
        {renderBlogPostHeader(post, date, labels)}

        {/* Tags — each tag links to /blog?tags=<tag> for filtered listing */}
        {post.tags && post.tags.length > 0 && (
          <Row wrap gap="sm" className="mb-8">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`${String(ROUTES.PUBLIC.BLOG)}?tags=${encodeURIComponent(tag)}`}
                className="inline-block px-3 py-1 rounded-full bg-neutral-100 dark:bg-zinc-800 hover:bg-primary/10 text-zinc-600 dark:text-zinc-400 hover:text-primary text-xs font-medium transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </Row>
        )}

        {/* TS12/VD10 — Author bio block (optional) */}
        {renderAuthorBio && <Div className="mb-6">{renderAuthorBio(post)}</Div>}

        {/* Content */}
        <Div surface="card" padding="xl" className="mb-12">
          {renderContent ? renderContent(post) : (
            <RichText html={normalizeRichTextHtml(post.content ?? "")} proseClass="prose max-w-none dark:prose-invert" />
          )}
        </Div>

        {renderBlogPostRelated(related, labels, renderRelatedCard)}

        {/* Back button */}
        {renderBackButton && <Div className="mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-700">{renderBackButton()}</Div>}
      </Div>
    </Div>
  );
}
