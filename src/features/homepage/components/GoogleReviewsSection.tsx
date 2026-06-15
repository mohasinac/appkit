import React from "react";
import { Div, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { fetchGoogleReviews } from "../lib/google-reviews-fetcher";
import type { GoogleReview } from "../lib/google-reviews-fetcher";
import type { GoogleReviewsSectionConfig } from "../schemas";

const __P = {
  p4: "p-4",
} as const;

const CLS_STAR_ON = "text-yellow-400";
const CLS_STAR_OFF = "text-zinc-300 dark:text-zinc-600";
const CLS_GMAPS_LINK = "shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline";

// --- Star Rating -------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <Row className="gap-0.5" align="center" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? CLS_STAR_ON : CLS_STAR_OFF}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </Row>
  );
}

// --- Google Logo Badge -------------------------------------------------------

function GoogleBadge() {
  return (
    <Span size="xs" className="inline-flex items-center gap-1" color="muted">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Posted on Google
    </Span>
  );
}

// --- Review Card -------------------------------------------------------------

function ReviewCard({
  review,
  showRating,
  showDate,
}: {
  review: GoogleReview;
  showRating: boolean;
  showDate: boolean;
}) {
  const dateStr = showDate
    ? new Date(review.time * 1000).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Div className={`flex flex-col gap-3 ${__P.p4} bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)]`} rounded="xl" shadow="sm">
      <Row align="center" gap="3">
        {review.authorPhotoUrl ? (
          <img
            src={review.authorPhotoUrl}
            alt={review.authorName}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Row className="w-9 h-9 bg-[var(--appkit-color-primary)] flex-shrink-0" align="center" justify="center" rounded="full">
            <Span size="sm" weight="bold" className="text-white">
              {review.authorName.charAt(0).toUpperCase()}
            </Span>
          </Row>
        )}
        <Div className="min-w-0">
          <Text className="truncate" size="sm" weight="semibold">{review.authorName}</Text>
          {dateStr && (
            <Text size="xs" color="muted">{dateStr}</Text>
          )}
        </Div>
      </Row>

      {showRating && <StarRating rating={review.rating} />}

      {review.text && (
        <Text className="leading-relaxed line-clamp-4" color="muted" size="sm">
          {review.text}
        </Text>
      )}

      <GoogleBadge />
    </Div>
  );
}

// --- Empty / Not Configured States -------------------------------------------

function NotConfiguredState() {
  return (
    <Stack className="justify-center text-zinc-400 text-sm" padding="y-4xl" align="center">
      <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
      Google Reviews not configured. Add your Google Maps API key in Site Settings.
    </Stack>
  );
}

function EmptyState() {
  return (
    <Stack className="justify-center text-zinc-400 text-sm" padding="y-4xl" align="center">
      <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      No reviews yet.
    </Stack>
  );
}

// --- Main Component ----------------------------------------------------------

export type GoogleReviewsSectionProps = GoogleReviewsSectionConfig;

export async function GoogleReviewsSection(config: GoogleReviewsSectionProps) {
  const {
    placeId: configPlaceId,
    maxReviews = 6,
    minRating = 0,
    layout = "grid",
    showRating = true,
    showDate = true,
    linkToGoogleMaps = true,
    googleMapsUrl,
  } = config;

  const { themed } = THEME_CONSTANTS;

  // Get credentials from site settings
  const credentials = await siteSettingsRepository
    .getDecryptedCredentials()
    .catch(() => ({} as Record<string, string>));

  const apiKey = credentials.googleMapsApiKey ?? "";

  if (!apiKey) {
    return (
      <Section className={`${themed.bgPrimary}`} padding="y-3xl">
        <Div className="w-full max-w-7xl mx-auto px-4">
          <NotConfiguredState />
        </Div>
      </Section>
    );
  }

  const placeId = configPlaceId || credentials.googlePlaceId || "";
  if (!placeId) {
    return null;
  }

  let reviews: GoogleReview[] = [];
  let aggregateRating = 0;
  let totalRatings = 0;

  try {
    const result = await fetchGoogleReviews(placeId, apiKey, maxReviews, minRating);
    reviews = result.reviews;
    aggregateRating = result.aggregateRating;
    totalRatings = result.totalRatings;
  } catch {
    // Fail silently — empty state shown
  }

  const gridClass =
    layout === "carousel"
      ? "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  const cardClass = layout === "carousel" ? "flex-shrink-0 w-[85%] sm:w-72 snap-start" : "";

  const mapsHref =
    googleMapsUrl || (placeId ? `https://search.google.com/local/reviews?placeid=${placeId}` : "");

  return (
    <Section className={`${themed.bgPrimary}`} padding="y-3xl">
      <Div className="w-full max-w-7xl mx-auto px-4">
        <Row className="mb-8" align="end" justify="between" gap="md">
          <>
            <Heading level={2}>What Our Customers Say</Heading>
            {aggregateRating > 0 && (
              <Row className="mt-1" align="center" gap="sm">
                <StarRating rating={Math.round(aggregateRating)} />
                <Text size="sm" variant="muted">
                  {aggregateRating.toFixed(1)} · {totalRatings.toLocaleString()} reviews
                </Text>
              </Row>
            )}
          </>
          {linkToGoogleMaps && mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={CLS_GMAPS_LINK}
            >
              View on Google →
            </a>
          )}
        </Row>

        {reviews.length === 0 ? (
          <EmptyState />
        ) : (
          <Div className={gridClass}>
            {reviews.map((review, i) => (
              <Div key={`${review.authorName}-${i}`} className={cardClass}>
                <ReviewCard review={review} showRating={showRating} showDate={showDate} />
              </Div>
            ))}
          </Div>
        )}
      </Div>
    </Section>
  );
}
