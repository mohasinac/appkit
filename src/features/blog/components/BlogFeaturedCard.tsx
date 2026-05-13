import React from "react";
import { Article, BaseListingCard, Div, Heading, Row, Span, Text, TextLink } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import type { BlogPost, BlogPostCategory } from "../types";
import { getMediaUrl } from "../../media/types/index";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { safeDisplayName } from "../../../security";
import { useLongPress } from "../../../react/hooks/useLongPress";

const CATEGORY_BADGE: Record<BlogPostCategory, string> = {
  news: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  tips: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  guides: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  updates: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  community: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

export interface BlogFeaturedCardProps {
  post: BlogPost;
  href: string;
  labels?: {
    featuredBadge?: string;
    readTime?: string;
  };
  className?: string;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function BlogFeaturedCard({
  post,
  href,
  labels = {},
  className = "",
  selectable = false,
  isSelected = false,
  onSelect,
}: BlogFeaturedCardProps) {
  const longPress = useLongPress(() => onSelect?.(post.id, !isSelected));
  const safeTitle = post.title?.trim() || "Untitled post";
  const coverImageUrl = getMediaUrl(post.coverImage);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <Article
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 ${isSelected ? "ring-2 ring-primary outline outline-2 outline-primary" : ""} ${className}`}
      onMouseDown={onSelect && !isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={onSelect && !isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={onSelect && !isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={onSelect && !isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={onSelect && !isSelected ? longPress.onTouchEnd : undefined}
    >
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={(e) => { e.preventDefault(); onSelect(post.id, !isSelected); }}
          label={isSelected ? "Deselect post" : "Select post"}
          position="top-2 left-2"
          className={selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
        />
      )}
      <TextLink href={href} className="flex h-full flex-col">
        {/* Cover image — aspect-video like EventCard */}
        <Div className="aspect-video overflow-hidden flex-shrink-0">
          {coverImageUrl ? (
            <Div
              role="img"
              aria-label={safeTitle}
              className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            />
          ) : (
            <Div
              role="img"
              aria-label={safeTitle}
              className="h-full w-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900"
            />
          )}
        </Div>

        {/* Content */}
        <Div className="flex flex-1 flex-col p-4">
          {/* Category + featured badges */}
          <Row className="gap-1.5 mb-2 flex-wrap">
            <Span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_BADGE[post.category] ?? "bg-zinc-100 text-zinc-700"}`}
            >
              {post.category}
            </Span>
            {post.isFeatured && (
              <Span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">
                {labels.featuredBadge ?? "Featured"}
              </Span>
            )}
          </Row>

          {/* Title — clamped to 2 lines */}
          <Heading
            level={3}
            className={`font-semibold text-neutral-900 dark:text-zinc-100 text-base leading-snug mb-1 ${THEME_CONSTANTS.utilities.textClamp2}`}
          >
            {safeTitle}
          </Heading>

          {/* Excerpt */}
          {post.excerpt && (
            <Text
              className={`text-neutral-500 dark:text-zinc-400 text-sm ${THEME_CONSTANTS.utilities.textClamp2} mb-3`}
            >
              {post.excerpt}
            </Text>
          )}

          {/* Footer — pushed to bottom */}
          <Row className="mt-auto gap-3 text-xs text-neutral-400 dark:text-zinc-500 flex-wrap">
            {post.authorName && (
              <Span>{safeDisplayName(post.authorName, "Author")}</Span>
            )}
            {post.readTimeMinutes != null && (
              <Span>
                {post.readTimeMinutes} {labels.readTime ?? "min read"}
              </Span>
            )}
            {date && <Span>{date}</Span>}
          </Row>
        </Div>
      </TextLink>
    </Article>
  );
}
