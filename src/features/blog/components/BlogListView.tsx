import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import type { BlogPost, BlogPostCategory } from "../types";
import { Article, Button, Div, Heading, Pagination, Row, Span, Stack, Text } from "../../../ui";

import { getDefaultLocale } from "../../../core/baseline-resolver";
import { getMediaUrl } from "../../media/types/index";
import { safeDisplayName } from "../../../security";

const __P = {
  p5: "p-5",
} as const;

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

const CLS_FEATURED_BADGE = "rounded-full bg-warning-surface px-2 py-0.5 text-warning dark:bg-warning-surface dark:text-warning";

interface BlogCardProps {
  post: BlogPost;
  href?: string;
  onClick?: (post: BlogPost) => void;
  className?: string;
}

export function BlogCard({ post, href, onClick, className = "" }: BlogCardProps) {
  const coverImageUrl = getMediaUrl(post.coverImage);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const isInteractive = !!(href || onClick);

  const card = (
    <Article
      role={onClick && !href ? "button" : undefined}
      tabIndex={onClick && !href ? 0 : undefined}
      onKeyDown={
        onClick && !href
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(post)
          : undefined
      }
      onClick={onClick && !href ? () => onClick(post) : undefined}
      className={`group flex flex-col h-full overflow-hidden rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition hover:shadow-md ${isInteractive ? "cursor-pointer" : ""} ${className}`}
    >
      <Div className={`aspect-video w-full ${__O.hidden} bg-neutral-100 dark:bg-slate-800 flex-shrink-0`}>
        {coverImageUrl ? (
          <Div
            role="img"
            aria-label={post.title}
            className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
            // audit-inline-style-ok: dynamic image URL
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        ) : (
          <Row surface="muted" className="h-full w-full" align="center" justify="center">
            <Span className="opacity-30" size="4xl" aria-hidden="true">✍️</Span>
          </Row>
        )}
      </Div>
      <Stack className={`flex-1 ${__P.p5}`}>
        <Row className="mb-2" gap="sm" wrap>
          <Span size="xs" weight="medium" className="bg-primary/10 text-primary" rounded="full" padding="pill-xs" transform="capitalize">
            {post.category}
          </Span>
          {post.isFeatured && (
            <Span size="xs" weight="medium" className={CLS_FEATURED_BADGE}>
              Featured
            </Span>
          )}
          {post.readTimeMinutes && (
            <Span size="xs" color="muted">
              {post.readTimeMinutes} min read
            </Span>
          )}
        </Row>
        <Heading
          level={3}
          className={`group-hover:text-primary`} color="primary" truncate={2} size="base" weight="semibold"
        >
          {post.title}
        </Heading>
        {post.excerpt && (
          <Text className={`mt-2 flex-1`} color="muted" truncate={3} size="sm">
            {post.excerpt}
          </Text>
        )}
        <Row className="mt-auto" padding="t-sm" gap="3">
          {post.authorAvatar ? (
            <Div
              role="img"
              aria-label={post.authorName ?? "author"}
              className="h-7 w-7 flex-shrink-0 bg-center bg-cover" rounded="full"
              // audit-inline-style-ok: dynamic image URL
              style={{ backgroundImage: `url(${post.authorAvatar})` }}
            />
          ) : post.authorName ? (
            <Row textWeight="bold" textSize="xs" className="h-7 w-7 flex-shrink-0 bg-primary/10 text-primary" align="center" justify="center" rounded="full">
              {post.authorName.charAt(0).toUpperCase()}
            </Row>
          ) : null}
          <Text className="text-neutral-500 min-w-0" size="xs">
            {post.authorName && (
              <Span weight="medium" className="text-neutral-700">
                {safeDisplayName(post.authorName, "Author")}
              </Span>
            )}
            {date && <Span className="ml-1 text-neutral-400">· {date}</Span>}
          </Text>
        </Row>
      </Stack>
    </Article>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {card}
      </Link>
    );
  }
  return card;
}

interface BlogCategoryTabsProps {
  categories: BlogPostCategory[];
  active?: BlogPostCategory | null;
  onSelect: (cat: BlogPostCategory | null) => void;
  labels?: Record<string, string>;
}

export function BlogCategoryTabs({
  categories,
  active,
  onSelect,
  labels = {},
}: BlogCategoryTabsProps) {
  return (
    <Div className={`scrollbar-none flex gap-2 ${__O.xAuto}`} padding="b-2xs">
      <Button
        onClick={() => onSelect(null)}
        variant={!active ? "primary" : "ghost"}
        size="sm"
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${!active ? "bg-neutral-900 text-white" : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-zinc-300 hover:bg-neutral-200 dark:hover:bg-slate-700"}`}
      >
        {labels.all ?? "All"}
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat}
          onClick={() => onSelect(cat)}
          variant={active === cat ? "primary" : "ghost"}
          size="sm"
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${active === cat ? "bg-neutral-900 text-white" : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-zinc-300 hover:bg-neutral-200 dark:hover:bg-slate-700"}`}
        >
          {labels[cat] ?? cat}
        </Button>
      ))}
    </Div>
  );
}

interface BlogListViewProps<T extends BlogPost = BlogPost> {
  posts: T[];
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPostClick?: (post: T) => void;
  emptyLabel?: string;
  /** Render-prop slot overrides — pass via `FeatureExtension.slots`. */
  slots?: LayoutSlots<T>;
}

export function BlogListView<T extends BlogPost = BlogPost>({
  posts,
  isLoading,
  totalPages = 1,
  currentPage = 1,
  total = 0,
  onPageChange,
  onPostClick,
  emptyLabel = "No posts found",
  slots,
}: BlogListViewProps<T>) {
  if (isLoading) {
    return (
      <Div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Div
            key={i}
            className="animate-pulse overflow-hidden border border-neutral-200 bg-neutral-100" rounded="xl"
          >
            <Div className="aspect-video bg-neutral-200" />
            <Stack className={`${__P.p5}`} gap="sm">
              <Div className="h-4 w-16 bg-neutral-200" rounded="default" />
              <Div className="h-5 w-full bg-neutral-200" rounded="default" />
              <Div className="h-4 w-3/4 bg-neutral-200" rounded="default" />
            </Stack>
          </Div>
        ))}
      </Div>
    );
  }

  if (posts.length === 0) {
    if (slots?.renderEmptyState) {
      return <>{slots.renderEmptyState() as React.ReactNode}</>;
    }
    return (
      <Text className="py-12" color="muted" size="sm" align="center">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack gap="xl">
      {slots?.renderHeader
        ? (slots.renderHeader({ total }) as React.ReactNode)
        : null}
      <Div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) =>
          slots?.renderCard ? (
            <React.Fragment key={post.id}>
              {slots.renderCard(post, i) as React.ReactNode}
            </React.Fragment>
          ) : (
            <BlogCard
              key={post.id}
              post={post}
              onClick={onPostClick as ((post: BlogPost) => void) | undefined}
            />
          ),
        )}
      </Div>
      {slots?.renderFooter ? (
        (slots.renderFooter({
          page: currentPage,
          totalPages,
        }) as React.ReactNode)
      ) : totalPages > 1 && onPageChange ? (
        <Row justify="center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </Row>
      ) : null}
    </Stack>
  );
}
