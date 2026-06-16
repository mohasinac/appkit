"use client";
import React from "react";

import { SectionCarousel } from "./SectionCarousel";
import { useBlogArticles } from "../hooks/useBlogArticles";
import { BlogFeaturedCard } from "../../blog/components/BlogFeaturedCard";
import { ROUTES } from "../../../next";
import type { BlogPost } from "../../blog/types";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";

export interface BlogArticlesSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  initialItems?: BlogPost[];
}

export function BlogArticlesSection({
  title = "From Our Blog",
  description,
  viewMoreHref,
  viewMoreLabel = "View all posts →",
  className = "",
  initialItems,
}: BlogArticlesSectionProps) {
  const { data, isLoading } = useBlogArticles({ initialPosts: initialItems });
  const items = data?.posts ?? [];

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel="From Our Blog"
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
        />
      )}
      className={className}
    />
  );
}
