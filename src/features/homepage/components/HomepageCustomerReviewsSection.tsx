"use client";
import React from "react";
import { CustomerReviewsSection } from "./CustomerReviewsSection";
import { useHomepageReviews } from "../hooks/useHomepageReviews";
import type { Review } from "../../reviews";
import { ReviewCard } from "../../reviews/components";
import { SECTION_TITLE, VIEW_MORE_LABEL } from "../constants/section-copy";

export interface HomepageCustomerReviewsSectionProps {
  title?: string;
  subtitle?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  /** Cap the rendered reviews. */
  maxReviews?: number;
  /** Cards visible per view on desktop / mobile. */
  itemsPerView?: number;
  mobileItemsPerView?: number;
  className?: string;
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

export function HomepageCustomerReviewsSection({
  title = SECTION_TITLE.reviews,
  subtitle,
  viewMoreHref,
  viewMoreLabel = VIEW_MORE_LABEL.reviews,
  maxReviews,
  itemsPerView,
  mobileItemsPerView,
  className = "",
  autoScroll = true,
  scrollInterval = 4500,
  loop = true,
}: HomepageCustomerReviewsSectionProps) {
  const { data: fetched = [], isLoading } = useHomepageReviews();
  const reviews = maxReviews && maxReviews > 0 ? fetched.slice(0, maxReviews) : fetched;

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
      // Only override the shared preset when the admin actually set one of the
      // two counts — otherwise a partial override would silently flatten the
      // preset's sm/lg/2xl steps down to two breakpoints.
      perView={
        itemsPerView || mobileItemsPerView
          ? { base: mobileItemsPerView ?? 1, md: itemsPerView ?? 3 }
          : undefined
      }
    />
  );
}
