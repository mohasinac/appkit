import React from "react";
import { Button, Heading, Span, Text } from "@mohasinac/ui";
import type { Review } from "../types";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ value, max = 5, size = "md" }: StarRatingProps) {
  const sizeClass =
    size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  return (
    <div
      className={`flex items-center gap-0.5 ${sizeClass}`}
      aria-label={`${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={
            i < Math.round(value) ? "text-yellow-400" : "text-neutral-200"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
  className?: string;
}

export function ReviewCard({ review, className = "" }: ReviewCardProps) {
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        {review.userAvatar ? (
          <div
            role="img"
            aria-label={review.userName}
            className="h-9 w-9 rounded-full bg-center bg-cover"
            style={{ backgroundImage: `url(${review.userAvatar})` }}
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600">
            {review.userName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Span className="font-medium text-neutral-900">
              {review.userName}
            </Span>
            {review.verified && (
              <Span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Verified
              </Span>
            )}
            {date && <Span className="text-xs text-neutral-400">{date}</Span>}
          </div>
          <div className="mt-1">
            <StarRating value={review.rating} size="sm" />
          </div>
        </div>
      </div>
      {review.title && (
        <Heading
          level={3}
          className="mt-3 font-semibold text-neutral-900 text-base"
        >
          {review.title}
        </Heading>
      )}
      {review.comment && (
        <Text className="mt-2 text-sm text-neutral-600">{review.comment}</Text>
      )}
      {review.images && review.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.images.map((img, i) => (
            <div
              key={i}
              role="img"
              aria-label={`Review image ${i + 1}`}
              className="h-16 w-16 rounded-lg bg-center bg-cover"
              style={{ backgroundImage: `url(${img.thumbnailUrl ?? img.url})` }}
            />
          ))}
        </div>
      )}
      {review.helpfulCount !== undefined && review.helpfulCount > 0 && (
        <Text className="mt-3 text-xs text-neutral-400">
          {review.helpfulCount} found this helpful
        </Text>
      )}
    </div>
  );
}

interface ReviewsListProps {
  reviews: Review[];
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  emptyLabel?: string;
}

export function ReviewsList({
  reviews,
  isLoading,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  emptyLabel = "No reviews yet",
}: ReviewsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-neutral-200 p-5"
          >
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-full bg-neutral-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-neutral-200" />
                <div className="h-3 w-16 rounded bg-neutral-200" />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="h-3 w-full rounded bg-neutral-200" />
              <div className="h-3 w-3/4 rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Text className="py-12 text-center text-sm text-neutral-500">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              type="button"
              variant={p === currentPage ? "primary" : "outline"}
              size="sm"
              onClick={() => onPageChange(p)}
              className={`h-9 w-9 rounded-lg text-sm font-medium transition ${p === currentPage ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"}`}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
