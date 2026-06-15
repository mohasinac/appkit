import React from "react";
import Link from "next/link";
import {
  Div,
  Heading,
  Pagination,
  RichText,
  Row,
  Skeleton,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { StarRating } from "../../../ui";
import type { Review } from "../types";
import { THEME_CONSTANTS } from "../../../tokens";
import { maskName } from "../../../security";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { ROUTES } from "../../../next";

// --- ReviewCard ---------------------------------------------------------------

export type ReviewCardContext = "listing" | "store" | "general";

export interface ReviewCardProps {
  review: Review;
  context?: ReviewCardContext;
  className?: string;
}

export function ReviewCard({ review, context = "general", className = "" }: ReviewCardProps) {
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const displayName = maskName(review.userName);
  const initials = displayName.charAt(0).toUpperCase();
  const reviewHref = String(ROUTES.PUBLIC.REVIEW_DETAIL(review.id));
  const productHref = review.productId
    ? String(ROUTES.PUBLIC.PRODUCT_DETAIL(review.productId))
    : null;
  const profileHref = !review.isAnonymous && review.userId
    ? String(ROUTES.PUBLIC.PROFILE(review.userId))
    : null;

  const showStoreLink = context !== "store" && !!(review.storeSlug && review.storeName);
  const showProductLink = context !== "listing" && !!productHref;
  const showProfileLink = !!profileHref;

  const hasFooter = showStoreLink || showProductLink || showProfileLink;

  return (
    <Div
      className={`group flex flex-col h-full rounded-xl border border-neutral-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 transition-shadow hover:shadow-md ${className}`}
    >
      {/* Clicking the main body navigates to the review detail */}
      <Link href={reviewHref} className="flex flex-col flex-1 min-h-0">
        <Div className="flex items-start gap-3">
          {review.userAvatar ? (
            <Div
              role="img"
              aria-label={displayName}
              className="h-9 w-9 flex-shrink-0 rounded-full bg-center bg-cover"
              // audit-inline-style-ok: dynamic image URL
              style={{ backgroundImage: `url(${review.userAvatar})` }}
            />
          ) : (
            <Div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600 dark:bg-zinc-700 dark:text-zinc-300">
              {initials}
            </Div>
          )}
          <Div className="flex-1 min-w-0">
            <Row wrap gap="sm">
              <Span weight="medium" className="text-neutral-900 dark:text-white">
                {displayName}
              </Span>
              {review.verified && (
                <Span size="xs" weight="medium" className="rounded-full bg-success-surface px-2 py-0.5 text-success">
                  Verified
                </Span>
              )}
              {date && (
                <Span size="xs" color="muted">
                  {date}
                </Span>
              )}
            </Row>
            <Div className="mt-1">
              <StarRating value={review.rating} size="sm" readOnly />
            </Div>
          </Div>
        </Div>

        {review.title && (
          <Heading
            level={4}
            className="mt-3 font-semibold text-neutral-900 dark:text-white"
          >
            {review.title}
          </Heading>
        )}

        {review.comment && (
          <RichText
            html={normalizeRichTextHtml(review.comment)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-zinc-400"
          />
        )}

        {review.images && review.images.length > 0 && (
          <Row wrap gap="sm" className="mt-3">
            {review.images.map((img, i) => (
              <Div
                key={i}
                role="img"
                aria-label={`Review image ${i + 1}`}
                className="h-16 w-16 rounded-lg bg-center bg-cover border border-neutral-100 dark:border-zinc-700"
                // audit-inline-style-ok: dynamic image URL
                style={{ backgroundImage: `url(${img.thumbnailUrl ?? img.url})` }}
              />
            ))}
          </Row>
        )}

        {(review.helpfulCount ?? 0) > 0 && (
          <Text className="mt-3 text-zinc-400 dark:text-zinc-400" size="xs">
            {review.helpfulCount} found this helpful
          </Text>
        )}
      </Link>

      {/* Footer links — rendered outside the review Link to avoid nested anchors */}
      {hasFooter && (
        <Div className="mt-3 pt-3 border-t border-neutral-100 dark:border-zinc-800 flex flex-col gap-1.5">
          {showStoreLink && (
            <Link
              href={String(ROUTES.PUBLIC.STORE_DETAIL(review.storeSlug!))}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <span aria-hidden="true">🏪</span>
              <span className={THEME_CONSTANTS.utilities.textClamp1}>{review.storeName}</span>
            </Link>
          )}
          {showProductLink && (
            <Link
              href={productHref!}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-zinc-400 hover:text-neutral-700 dark:hover:text-zinc-200"
            >
              <span aria-hidden="true">📦</span>
              <span className={THEME_CONSTANTS.utilities.textClamp1}>
                {review.productTitle ?? "View Product"}
              </span>
              <span aria-hidden="true" className="ml-auto text-primary group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          )}
          {showProfileLink && (
            <Link
              href={profileHref!}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-zinc-400 hover:text-neutral-700 dark:hover:text-zinc-200"
            >
              <span aria-hidden="true">👤</span>
              <span className={THEME_CONSTANTS.utilities.textClamp1}>{displayName}</span>
            </Link>
          )}
        </Div>
      )}
    </Div>
  );
}

// --- ReviewsList --------------------------------------------------------------

export interface ReviewsListProps {
  reviews: Review[];
  context?: ReviewCardContext;
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  emptyLabel?: string;
}

export function ReviewsList({
  reviews,
  context = "general",
  isLoading,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  emptyLabel = "No reviews yet",
}: ReviewsListProps) {
  if (isLoading) {
    return (
      <Stack gap="md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Div
            key={i}
            className="rounded-xl border border-neutral-200 dark:border-zinc-700 p-5"
          >
            <Div className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Stack gap="sm" className="flex-1">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </Stack>
            </Div>
            <Stack gap="xs" className="mt-3">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </Stack>
          </Div>
        ))}
      </Stack>
    );
  }

  if (reviews.length === 0) {
    return (
      <Text className="py-12 text-neutral-500 dark:text-zinc-500" size="sm" align="center">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap="md">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} context={context} />
        ))}
      </Stack>
      {totalPages > 1 && onPageChange && (
        <Div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </Div>
      )}
    </Stack>
  );
}
