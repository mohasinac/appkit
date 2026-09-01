"use client";
import React from "react";

import { SectionCarousel } from "./SectionCarousel";
import { useBlogArticles } from "../hooks/useBlogArticles";
import { BlogFeaturedCard } from "../../blog/components/BlogFeaturedCard";
import { ROUTES } from "../../../next";
import type { BlogPost } from "../../blog/types";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";
import { SECTION_TITLE, VIEW_MORE_LABEL } from "../constants/section-copy";

export interface BlogArticlesSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  initialItems?: BlogPost[];
  /** Cap the rendered posts. */
  limit?: number;
  /** Per-card display toggles, forwarded to `BlogFeaturedCard`. */
  showReadTime?: boolean;
  showAuthor?: boolean;
  showThumbnails?: boolean;
}

export function BlogArticlesSection({
  title = SECTION_TITLE.blogArticles,
  description,
  viewMoreHref,
  viewMoreLabel = VIEW_MORE_LABEL.blogArticles,
  className = "",
  initialItems,
  limit,
  showReadTime = true,
  showAuthor = true,
  showThumbnails = true,
}: BlogArticlesSectionProps) {
  const { data, isLoading } = useBlogArticles({ initialPosts: initialItems });
  const fetched = data?.posts ?? [];
  const items = limit && limit > 0 ? fetched.slice(0, limit) : fetched;

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel={SECTION_TITLE.blogArticles}
      headingVariant="editorial"
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      perView={CAROUSEL_PER_VIEW.standard}
      gap={16}
      keyExtractor={(post: BlogPost) => post.id}
      renderItem={(post: BlogPost) => (
        <BlogFeaturedCard
          post={post}
          href={ROUTES.BLOG.ARTICLE(post.slug)}
          showReadTime={showReadTime}
          showAuthor={showAuthor}
          showThumbnail={showThumbnails}
        />
      )}
      className={className}
    />
  );
}
