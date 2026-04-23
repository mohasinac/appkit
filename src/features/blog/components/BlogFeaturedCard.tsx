import React from "react";
import { Article, Div, Heading, Row, Span, Text } from "../../../ui";
import type { BlogPost, BlogPostCategory } from "../types";
import { getMediaUrl } from "../../media/types/index";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { safeDisplayName } from "../../../security";

const CATEGORY_BADGE: Record<BlogPostCategory, string> = {
  news: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  tips: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  guides: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  updates: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  community: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

export interface BlogFeaturedCardProps {
  post: BlogPost;
  /** Full URL/path to the post */
  href: string;
  labels?: {
    featuredBadge?: string;
    readTime?: string;
  };
  /** Render-prop for wrapping in a link */
  renderLink?: (href: string, children: React.ReactNode) => React.ReactNode;
  /** Render-prop for the cover image slot */
  renderImage?: (post: BlogPost) => React.ReactNode;
  className?: string;
}

export function BlogFeaturedCard({
  post,
  href,
  labels = {},
  renderLink,
  renderImage,
  className = "",
}: BlogFeaturedCardProps) {
  const safeTitle = post.title?.trim() || "Untitled post";
  const coverImageUrl = getMediaUrl(post.coverImage);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const inner = (
    <Article
      className={`overflow-hidden rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-shadow duration-200 md:flex ${className}`}
    >
      <Div className="md:w-1/2 relative h-64 md:min-h-[320px] overflow-hidden">
        {renderImage ? (
          renderImage(post)
        ) : (
          coverImageUrl ? (
            <Div
              role="img"
              aria-label={safeTitle}
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            />
          ) : (
            <Div
              role="img"
              aria-label={safeTitle}
              className="h-full w-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900"
            />
          )
        )}
      </Div>
      <Div className="p-8 md:w-1/2 flex flex-col justify-center">
        <Row className="gap-2 mb-3">
          <Span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_BADGE[post.category] ?? ""}`}
          >
            {post.category}
          </Span>
          {post.isFeatured && (
            <Span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">
              {labels.featuredBadge ?? "Featured"}
            </Span>
          )}
        </Row>
        <Heading
          level={2}
          className="text-xl font-semibold text-neutral-900 dark:text-zinc-100 mb-3 leading-snug"
        >
          {safeTitle}
        </Heading>
        {post.excerpt && (
          <Text className="text-neutral-500 dark:text-zinc-400 mb-4 line-clamp-3 text-sm">
            {post.excerpt}
          </Text>
        )}
        <Row className="gap-4 text-xs text-neutral-400 dark:text-zinc-500">
          {post.authorName && <Span>{safeDisplayName(post.authorName, "Author")}</Span>}
          {post.readTimeMinutes != null && (
            <Span>
              {post.readTimeMinutes} {labels.readTime ?? "min read"}
            </Span>
          )}
          {date && <Span>{date}</Span>}
        </Row>
      </Div>
    </Article>
  );

  return (
    <Div className="mb-10">{renderLink ? renderLink(href, inner) : inner}</Div>
  );
}
