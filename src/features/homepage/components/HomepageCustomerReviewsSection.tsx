"use client";
import React from "react";
import { CustomerReviewsSection } from "./CustomerReviewsSection";
import { useHomepageReviews } from "../hooks/useHomepageReviews";
import type { Review } from "../../reviews";
import { ReviewCard } from "../../reviews/components";

export interface HomepageCustomerReviewsSectionProps {
  title?: string;
  subtitle?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

export function HomepageCustomerReviewsSection({
  title = "What Our Customers Say",
  subtitle,
  viewMoreHref,
  viewMoreLabel = "See all reviews →",
  className = "",
  autoScroll = true,
  scrollInterval = 4500,
  loop = true,
}: HomepageCustomerReviewsSectionProps) {
  const { data: reviews = [], isLoading } = useHomepageReviews();

  return (
    <CustomerReviewsSection
      title={title}
      subtitle={subtitle}
      items={reviews}
      renderItem={(review: Review) => (
        <ReviewCard
          review={review}
          className="h-full shadow-sm border-[var(--appkit-color-border)]"
        />
      )}
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      isLoading={isLoading}
      keyExtractor={(review: Review) => review.id}
      className={className}
      autoScroll={autoScroll}
      scrollInterval={scrollInterval}
      loop={loop}
    />
  );
}
