"use client";

import React from "react";
import { Article, BaseListingCard, Div, Heading, Row, Span, Stack, Text, TextLink } from "../../../ui";

import type { BlogPost, BlogPostCategory } from "../types";
import { getMediaUrl } from "../../media/types/index";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { safeDisplayName } from "../../../security";
import { useLongPress } from "../../../react/hooks/useLongPress";

const __P = {
  p4: "p-4",
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
        <Div className={`aspect-video ${__O.hidden} flex-shrink-0`}>
          {coverImageUrl ? (
            <Div
              role="img"
              aria-label={safeTitle}
              className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              // audit-inline-style-ok: dynamic image URL
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            />
          ) : (
            <Div
              role="img"
              aria-label={safeTitle}
              surface="muted"
              className="h-full w-full"
            />
          )}
        </Div>

        {/* Content */}
        <Stack className={`flex-1 ${__P.p4}`}>
          {/* Category + featured badges */}
          <Row gap="xs" className=".5 mb-2" wrap>
            <Span
              size="xs" weight="medium"
              className={`inline-block capitalize ${CATEGORY_BADGE[post.category] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`} rounded="full" padding="pill-xs"
            >
              {post.category}
            </Span>
            {post.isFeatured && (
              <Span size="xs" weight="medium" className={CLS_FEATURED_BADGE}>
                {labels.featuredBadge ?? "Featured"}
              </Span>
            )}
          </Row>

          {/* Title — clamped to 2 lines */}
          <Heading
            level={3}
            className={`leading-snug mb-1`} color="primary" truncate={2} size="base" weight="semibold"
          >
            {safeTitle}
          </Heading>

          {/* Excerpt */}
          {post.excerpt && (
            <Text
              className={`mb-3`} color="muted" truncate={2} size="sm"
            >
              {post.excerpt}
            </Text>
          )}

          {/* Footer — pushed to bottom */}
          <Row color="muted" textSize="xs" className="mt-auto" gap="3" wrap>
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
        </Stack>
      </TextLink>
    </Article>
  );
}
