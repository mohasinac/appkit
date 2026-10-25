import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import type { BlogPost, BlogPostCategory } from "../types";
import { Article } from "../../../ui/components/Semantic";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { OverflowRow } from "../../../ui/components/OverflowRow";
import type { OverflowRowItem } from "../../../ui/components/OverflowRow";
import { Pagination } from "../../../ui/components/Pagination";
import { MediaImage } from "../../media/MediaImage";
import { blogCategoryBadge } from "../constants/category-badge";

import { getDefaultLocale } from "../../../core/baseline-resolver";
import { getMediaUrl } from "../../media/types/index";
import { safeDisplayName } from "../../../security";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_FEATURED_BADGE = "rounded-full bg-warning-surface px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-warning dark:bg-warning-surface dark:text-warning";

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
          ? (e) => (e.key === "Enter" || e.key === "") && onClick(post)
          : undefined
      }
      onClick={onClick && !href ? () => onClick(post) : undefined}
      className={`group flex flex-col h-full overflow-hidden rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] shadow-sm transition hover:shadow-md ${isInteractive ? "cursor-pointer" : ""} ${className}`}
    >
      <Div className={`relative aspect-video w-full ${__O.hidden} bg-[var(--appkit-color-surface)] dark:bg-[var(--appkit-color-surface-elevated)] flex-shrink-0`}>
        {coverImageUrl ? (
          <MediaImage
            src={coverImageUrl}
            alt={post.title}
            size="card"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Row surface="muted" className="h-full w-full" align="center" justify="center">
            <Span className="opacity-30" size="4xl" aria-hidden="true">✍️</Span>
          </Row>
        )}
      </Div>
      <Stack className={`flex-1 ${__P.p5}`}>
        <Row className="mb-2" gap="sm" wrap>
          {/* Was `bg-primary/10 text-primary` for ALL five categories. The
              real palette lived in BlogFeaturedCard, which only the homepage
              rail mounts — so the index, the one page where telling a guide
              from a release note matters, had no category colour at all. */}
          <Span size="xs" weight="medium" className={blogCategoryBadge(post.category)} rounded="full" padding="pill-xs" transform="capitalize">
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
            <Div className="relative h-7 w-7 flex-shrink-0" rounded="full" overflow="hidden">
              <MediaImage
                src={post.authorAvatar}
                alt={post.authorName ?? "author"}
                size="avatar"
              />
            </Div>
          ) : post.authorName ? (
            <Row textWeight="bold" textSize="xs" className="h-7 w-7 flex-shrink-0 bg-primary/10 text-primary" align="center" justify="center" rounded="full">
              {post.authorName.charAt(0).toUpperCase()}
            </Row>
          ) : null}
          <Text className="text-[var(--appkit-color-text-muted)] min-w-0" size="xs">
            {post.authorName && (
              <Span weight="medium" className="text-neutral-700">
                {safeDisplayName(post.authorName, "Author")}
              </Span>
            )}
            {date && <Span className="ml-1 text-neutral-400">· {date}</Span>}
          </Text>
        </Row>

        {/*
          * 🛑 THE CARD HAD NO CALL TO ACTION AT ALL. The whole card is a
          * <Link>, so it was always clickable — but nothing on it said so,
          * which is why the grid read as a wall of static tiles. The arrow
          * is `aria-hidden` and the text carries the meaning.
          *
          * `group-hover` on the parent <Article>, so the whole card is the
          * hover target rather than this small strip.
          */}
        <Row align="center" gap="xs" className="mt-3 text-primary" textSize="sm" textWeight="medium">
          <Span>Read</Span>
          <Span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</Span>
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
  /*
   * `ALL_ID` is a sentinel, not a category. It cannot be `""` because that is
   * also `OverflowRow`'s "nothing selected" state, which would leave the
   * collapsed trigger showing the placeholder instead of "All".
   */
  const ALL_ID = "__all__";
  const items: OverflowRowItem[] = [
    { id: ALL_ID, label: labels.all ?? "All", onSelect: () => onSelect(null) },
    ...categories.map((cat) => ({
      id: cat,
      label: labels[cat] ?? cat,
      onSelect: () => onSelect(cat),
    })),
  ];

  return (
    <OverflowRow
      items={items}
      ariaLabel="Blog categories"
      activeId={active ?? ALL_ID}
      searchPlaceholder="Search categories…"
      noResultsText="No matching category"
    />
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
      <Grid cols="cards" gap="lg">
        {Array.from({ length: 6 }).map((_, i) => (
          <Div
            key={i}
            className="animate-pulse overflow-hidden border border-neutral-200 bg-[var(--appkit-color-surface)]" rounded="xl"
          >
            <Div className="aspect-video bg-neutral-200" />
            <Stack className={`${__P.p5}`} gap="sm">
              <Div className="h-4 w-16 bg-neutral-200" rounded="default" />
              <Div className="h-5 w-full bg-neutral-200" rounded="default" />
              <Div className="h-4 w-3/4 bg-neutral-200" rounded="default" />
            </Stack>
          </Div>
        ))}
      </Grid>
    );
  }

  if (posts.length === 0) {
    if (slots?.renderEmptyState) {
      return <>{slots.renderEmptyState() as React.ReactNode}</>;
    }
    return (
      <Text paddingY="3xl" color="muted" size="sm" align="start">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack gap="xl">
      {slots?.renderHeader
        ? (slots.renderHeader({ total }) as React.ReactNode)
        : null}
      <Grid cols="cards" gap="lg">
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
      </Grid>
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
