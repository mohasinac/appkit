"use client";
import React from "react";
import { SectionCarousel } from "./SectionCarousel";
import { useBlogArticles } from "../hooks/useBlogArticles";
import { BlogFeaturedCard } from "../../blog/components/BlogFeaturedCard";
import { ROUTES } from "../../../next";
import type { BlogPost } from "../../blog/types";

export interface BlogArticlesSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
}

export function BlogArticlesSection({
  title = "From Our Blog",
  description,
  viewMoreHref,
  viewMoreLabel = "View all posts →",
  className = "",
}: BlogArticlesSectionProps) {
  const { data, isLoading } = useBlogArticles();
  const items = data?.posts ?? [];

  return (
    <SectionCarousel
      title={title}
      description={description}
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      perView={{ base: 1, sm: 2, md: 3, lg: 4 }}
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
