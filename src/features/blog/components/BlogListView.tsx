import React from "react";
import type { LayoutSlots } from "@mohasinac/contracts";
import type { BlogPost, BlogPostCategory } from "../types";
import { Article, Button, Div, Heading, Pagination, Span, Text } from "@mohasinac/ui";
import { getMediaUrl } from "../../media/types/index.js";

interface BlogCardProps {
  post: BlogPost;
  onClick?: (post: BlogPost) => void;
  className?: string;
}

export function BlogCard({ post, onClick, className = "" }: BlogCardProps) {
  const coverImageUrl = getMediaUrl(post.coverImage);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <Article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(post)
          : undefined
      }
      onClick={onClick ? () => onClick(post) : undefined}
      className={`group flex flex-col h-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {coverImageUrl && (
        <Div className="aspect-video w-full overflow-hidden bg-neutral-100">
          <Div
            role="img"
            aria-label={post.title}
            className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        </Div>
      )}
      <Div className="flex flex-1 flex-col p-5">
        <Div className="mb-2 flex items-center gap-2">
          <Span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
            {post.category}
          </Span>
          {post.readTimeMinutes && (
            <Span className="text-xs text-neutral-400">
              {post.readTimeMinutes} min read
            </Span>
          )}
        </Div>
        <Heading
          level={3}
          className="line-clamp-2 text-base font-semibold text-neutral-900 group-hover:text-primary"
        >
          {post.title}
        </Heading>
        {post.excerpt && (
          <Text className="mt-2 line-clamp-3 flex-1 text-sm text-neutral-500">
            {post.excerpt}
          </Text>
        )}
        <Div className="mt-4 flex items-center gap-3">
          {post.authorAvatar && (
            <Div
              role="img"
              aria-label={post.authorName ?? "author"}
              className="h-7 w-7 rounded-full bg-center bg-cover"
              style={{ backgroundImage: `url(${post.authorAvatar})` }}
            />
          )}
          <Text className="text-xs text-neutral-500">
            {post.authorName && (
              <Span className="font-medium text-neutral-700">
                {post.authorName}
              </Span>
            )}
            {date && <Span className="ml-1">· {date}</Span>}
          </Text>
        </Div>
      </Div>
    </Article>
  );
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
    <Div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      <Button
        onClick={() => onSelect(null)}
        variant={!active ? "primary" : "ghost"}
        size="sm"
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${!active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
      >
        {labels.all ?? "All"}
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat}
          onClick={() => onSelect(cat)}
          variant={active === cat ? "primary" : "ghost"}
          size="sm"
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${active === cat ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
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
            className="animate-pulse overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
          >
            <Div className="aspect-video bg-neutral-200" />
            <Div className="space-y-2 p-5">
              <Div className="h-4 w-16 rounded bg-neutral-200" />
              <Div className="h-5 w-full rounded bg-neutral-200" />
              <Div className="h-4 w-3/4 rounded bg-neutral-200" />
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
      <Text className="py-12 text-center text-sm text-neutral-500">
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
