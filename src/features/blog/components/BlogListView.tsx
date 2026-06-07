import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import type { BlogPost, BlogPostCategory } from "../types";
import {
  Article,
  Button,
  Div,
  Heading,
  Pagination,
  Row,
  Span,
  Text,
} from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
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

const CLS_FEATURED_BADGE = "rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";

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
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        ) : (
          <Div className="h-full w-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900 flex items-center justify-center">
            <Span className="text-4xl opacity-30" aria-hidden="true">✍️</Span>
          </Div>
        )}
      </Div>
      <Div className={`flex flex-1 flex-col ${__P.p5}`}>
        <Row className="mb-2 gap-2 flex-wrap">
          <Span size="xs" weight="medium" className="rounded-full bg-primary/10 px-2 py-0.5 capitalize text-primary">
            {post.category}
          </Span>
          {post.isFeatured && (
            <Span size="xs" weight="medium" className={CLS_FEATURED_BADGE}>
              Featured
            </Span>
          )}
          {post.readTimeMinutes && (
            <Span size="xs" className="text-zinc-400 dark:text-zinc-400">
              {post.readTimeMinutes} min read
            </Span>
          )}
        </Row>
        <Heading
          level={3}
          className={`${THEME_CONSTANTS.utilities.textClamp2} text-base font-semibold text-neutral-900 dark:text-zinc-100 group-hover:text-primary`}
        >
          {post.title}
        </Heading>
        {post.excerpt && (
          <Text className={`mt-2 ${THEME_CONSTANTS.utilities.textClamp3} flex-1 text-sm text-neutral-500 dark:text-zinc-400`}>
            {post.excerpt}
          </Text>
        )}
        <Row className="mt-auto pt-3 gap-3">
          {post.authorAvatar ? (
            <Div
              role="img"
              aria-label={post.authorName ?? "author"}
              className="h-7 w-7 flex-shrink-0 rounded-full bg-center bg-cover"
              style={{ backgroundImage: `url(${post.authorAvatar})` }}
            />
          ) : post.authorName ? (
            <Div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {post.authorName.charAt(0).toUpperCase()}
            </Div>
          ) : null}
          <Text className="text-xs text-neutral-500 dark:text-zinc-400 min-w-0">
            {post.authorName && (
              <Span weight="medium" className="text-neutral-700 dark:text-zinc-300">
                {safeDisplayName(post.authorName, "Author")}
              </Span>
            )}
            {date && <Span className="ml-1 text-neutral-400">· {date}</Span>}
          </Text>
        </Row>
      </Div>
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
    <Div className={`scrollbar-none flex gap-2 ${__O.xAuto} pb-1`}>
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
            className="animate-pulse overflow-hidden rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800"
          >
            <Div className="aspect-video bg-neutral-200 dark:bg-slate-700" />
            <Div className={`space-y-2 ${__P.p5}`}>
              <Div className="h-4 w-16 rounded bg-neutral-200 dark:bg-slate-700" />
              <Div className="h-5 w-full rounded bg-neutral-200 dark:bg-slate-700" />
              <Div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-slate-700" />
            </Div>
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
      <Text className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Div className="space-y-8">
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
        <Div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </Div>
      ) : null}
    </Div>
  );
}
