"use client";
import { normalizeError } from "../../../errors/normalize";
import React, { useState, useEffect, useCallback } from "react";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_RELATED_LINK = "group flex items-center gap-[var(--appkit-space-3)] rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] p-[var(--appkit-space-4)] hover:border-primary hover:shadow-sm transition-all";
const CLS_RELATED_LABEL = "text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-faint)] mb-0.5";
const CLS_RELATED_TITLE = "text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text)] dark:text-white truncate group-hover:text-primary transition-colors";
const CLS_RATING_PILL = "inline-flex items-center gap-[var(--appkit-space-1)] rounded-full bg-warning-surface px-[var(--appkit-space-3)] py-[var(--appkit-space-1)] text-warning dark:bg-warning-surface dark:text-warning";
const CLS_HELPFUL_ACTIVE = "border-success bg-success-surface text-success dark:border-success cursor-default";
const CLS_ICON_ORANGE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-warning-surface dark:bg-warning-surface text-[length:var(--appkit-text-xl)]";
const CLS_ICON_BLUE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-info-surface dark:bg-info-surface text-[length:var(--appkit-text-xl)]";
const CLS_ICON_PURPLE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-[length:var(--appkit-text-xl)]";
const CLS_ICON_PURPLE_BARE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30";
import Link from "next/link";
import { Button, Div, Grid, Heading, IconButton, RichText, Row, Section, Span, StarRating, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { maskName } from "../../../security";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { ROUTES } from "../../../next";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { apiClient } from "../../../http";
import { REVIEW_ENDPOINTS } from "../../../constants/api-endpoints";
import type { Review } from "../types";

interface ReviewDetailShellProps {
  review: Review;
  storeHref?: string | null;
}

export function ReviewDetailShell({ review, storeHref }: ReviewDetailShellProps) {
  const displayName = maskName(review.userName);
  const initials = displayName.charAt(0).toUpperCase();
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // ── Lightbox ────────────────────────────────────────────────────────────────
  const images = review.images ?? [];
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImage = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const nextImage = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, closeLightbox, prevImage, nextImage]);

  // ── Helpful vote ────────────────────────────────────────────────────────────
  const storageKey = `review_voted_${review.id}`;
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount ?? 0);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setVoted(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const handleVote = async () => {
    if (voted || voting) return;
    setVoting(true);
    try {
      // The server is authoritative: it de-duplicates by uid, so a vote already
      // cast returns counted:false with the unchanged total. Trusting the
      // response instead of incrementing locally keeps the two in step when the
      // localStorage flag is missing (new device, cleared storage).
      const res = await apiClient.post<{ counted: boolean; helpfulCount: number }>(
        `${REVIEW_ENDPOINTS.LIST}/${review.id}/vote`,
        {},
      );
      if (typeof res?.helpfulCount === "number") {
        setHelpfulCount(res.helpfulCount);
      }
      setVoted(true);
      localStorage.setItem(storageKey, "1");
    } catch (_err) {
      void normalizeError(_err);
      // silently fail
    } finally {
      setVoting(false);
    }
  };

  // ── Links ───────────────────────────────────────────────────────────────────
  const productHref = review.productId
    ? pluginFor(review.listingType ?? "standard").detailRoute(review.productId)
    : null;
  const sellerHref = storeHref ?? null;
  const reviewerProfileId = review.userSlug ?? review.userId;
  const reviewerHref = !review.isAnonymous && reviewerProfileId
    ? String(ROUTES.PUBLIC.PROFILE(reviewerProfileId))
    : null;

  const currentImage = lightboxIdx !== null ? images[lightboxIdx] : null;

  return (
    <>
      {/* ── Hero: rating + title ──────────────────────────────────────────── */}
      <Div surface="default" className="border-b border-neutral-200 pt-[2.5rem]" padding="b-xl">
        <Div className="mx-auto max-w-3xl" padding="x-md">
          {/* Star rating — large */}
          <Row gap="sm" className="mb-4">
            <StarRating value={review.rating} size="lg" readOnly />
            <Span color="inverse" weight="bold" className="text-[var(--appkit-color-text)] dark:" size="2xl">
              {review.rating}.0
            </Span>
            {review.verified && (
              <Span layout="inline-flex" gap="xs" color="success" surface="success-surface" size="xs" weight="semibold" rounded="full" padding="pill-md">
                ✓ Verified Purchase
              </Span>
            )}
            {review.featured && (
              <Span size="xs" weight="semibold" className={CLS_RATING_PILL}>
                ★ Featured
              </Span>
            )}
          </Row>

          {review.title && (
            <Heading color="inverse" level={1} className="text-[var(--appkit-color-text)] dark: mb-4 leading-snug" size="2xl" weight="bold">
              {review.title}
            </Heading>
          )}

          {/* Reviewer row */}
          <Row gap="sm">
            {review.userAvatar ? (
              <Div className="relative h-11 w-11 flex-shrink-0 ring-2 ring-white ring-[var(--appkit-color-border-subtle)]" rounded="full" overflow="hidden">
                <MediaImage src={review.userAvatar} alt={displayName} size="avatar" />
              </Div>
            ) : (
              <Row textWeight="bold" textSize="base" centered className="h-11 w-11 flex-shrink-0 bg-primary/10 text-primary ring-2 ring-white ring-[var(--appkit-color-border-subtle)]" rounded="full">
                {initials}
              </Row>
            )}
            <Div className="min-w-0">
              {reviewerHref ? (
                <Link
                  href={reviewerHref}
                  className="text-[length:var(--appkit-text-sm)] font-semibold text-[var(--appkit-color-text)] dark:text-white hover:text-primary transition-colors"
                >
                  {displayName}
                </Link>
              ) : (
                <Span color="inverse" size="sm" weight="semibold" className="text-[var(--appkit-color-text)] dark:">
                  {review.isAnonymous ? "Anonymous" : displayName}
                </Span>
              )}
              {date && (
                <Text size="xs" color="muted" className="mt-0.5">{date}</Text>
              )}
            </Div>
          </Row>
        </Div>
      </Div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <Stack gap="xl" className="mx-auto max-w-3xl" paddingY="y-xl" paddingX="x-md">

        {/* Rich text comment */}
        {review.comment && (
          <Section>
            <RichText
              html={normalizeRichTextHtml(review.comment)}
              proseClass="prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-img:rounded-lg prose-a:text-primary"
              className="text-[var(--appkit-color-text-muted)]"
            />
          </Section>
        )}

        {/* Image grid with lightbox trigger */}
        {images.length > 0 && (
          <Section>
            <Heading level={2} className="tracking-wide mb-3" color="faint" size="sm" weight="semibold" transform="uppercase">
              Photos ({images.length})
            </Heading>
            <Grid gap="xs" className="grid-cols-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  aria-label={`View photo ${i + 1}`}
                  rounded="xl"
                  paddingX="none"
                  paddingY="none"
                  className="group relative aspect-square overflow-hidden border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-elevated)] focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MediaImage
                    src={img}
                    alt={`Review image ${i + 1}`}
                    size="card"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                  <Row centered className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(0,0,0,0.3)]">
                    <Span color="inverse" size="xl">🔍</Span>
                  </Row>
                </Button>
              ))}
            </Grid>
          </Section>
        )}

        {/* Video player */}
        {review.video && (
          <Section>
            <Heading level={2} className="tracking-wide mb-3" color="faint" size="sm" weight="semibold" transform="uppercase">
              Video
            </Heading>
            <Div className={`${__O.hidden} border border-[var(--appkit-color-border)] bg-[rgb(0,0,0)] aspect-video`} rounded="xl">
              <video
                src={review.video.url}
                poster={review.video.thumbnailUrl}
                controls
                className="h-full w-full"
                preload="metadata"
              />
            </Div>
          </Section>
        )}

        {/* Helpful votes */}
        <Section className="flex items-[center] gap-[1rem] border-t border-neutral-100" padding="y-md">
          <Div textSize="sm" className="text-[var(--appkit-color-text-muted)]">
            {helpfulCount > 0 && (
              <Span>
                <Span color="inverse" weight="bold" className="text-[var(--appkit-color-text)] dark:">{helpfulCount}</Span>{" "}
                {helpfulCount === 1 ? "person" : "people"} found this helpful
              </Span>
            )}
          </Div>
          <Button
            variant="outline"
            type="button"
            onClick={handleVote}
            disabled={voted || voting}
            gap="sm"
            rounded="lg"
            paddingX="md"
            paddingY="sm"
            textSize="sm"
            weight="medium"
            className={`ml-auto transition-colors ${
 voted
 ? CLS_HELPFUL_ACTIVE
 : "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary disabled:opacity-50"
 }`}
          >
            <Span aria-hidden="true">{voted ? "✓" : "👍"}</Span>
            {voted ? "Marked helpful" : voting ? "Saving…" : "Helpful?"}
          </Button>
        </Section>

        {/* Links: Product / Seller / Reviewer */}
        <Section className="grid gap-[0.75rem] sm:grid-cols-3">
          {productHref && (
            <Link
              href={productHref}
              className={CLS_RELATED_LINK}
            >
              <Span className={CLS_ICON_ORANGE}>
                📦
              </Span>
              <Div className="min-w-0">
                <Text className={CLS_RELATED_LABEL}>Product</Text>
                <Text className={CLS_RELATED_TITLE}>
                  {review.productTitle ?? "View Product"}
                </Text>
              </Div>
            </Link>
          )}

          {sellerHref && (
            <Link
              href={sellerHref}
              className={CLS_RELATED_LINK}
            >
              <Span className={CLS_ICON_BLUE}>
                🏪
              </Span>
              <Div className="min-w-0">
                <Text className={CLS_RELATED_LABEL}>Seller</Text>
                <Text className={CLS_RELATED_TITLE}>
                  View Seller
                </Text>
              </Div>
            </Link>
          )}

          {reviewerHref ? (
            <Link
              href={reviewerHref}
              className={CLS_RELATED_LINK}
            >
              <Span className={CLS_ICON_PURPLE}>
                👤
              </Span>
              <Div className="min-w-0">
                <Text className={CLS_RELATED_LABEL}>Reviewer</Text>
                <Text className={CLS_RELATED_TITLE}>
                  {displayName}
                </Text>
              </Div>
            </Link>
          ) : (
            <Row surface="default" gap="sm" className={`border border-neutral-200 dark:border-[var(--appkit-color-border)] ${__P.p4}`} rounded="xl">
              <Span size="xl" className={CLS_ICON_PURPLE_BARE}>
                👤
              </Span>
              <Div className="min-w-0">
                <Span size="xs" className="block mb-0.5" color="faint">Reviewer</Span>
                <Span color="inverse" size="sm" weight="medium" className="block text-[var(--appkit-color-text)] dark: truncate">
                  Anonymous
                </Span>
              </Div>
            </Row>
          )}
        </Section>
      </Stack>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightboxIdx !== null && currentImage && (
        <Row
          centered
          className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.95)]"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close */}
          <IconButton
            type="button"
            onClick={closeLightbox}
            aria-label="Close lightbox"
            variant="scrim"
            rounded="full"
            className="absolute top-4 right-4 z-10 h-10 w-10"
          >
            <Span size="xl">×</Span>
          </IconButton>

          {/* Counter */}
          <Div textSize="sm" className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70">
            {lightboxIdx + 1} / {images.length}
          </Div>

          {/* Prev */}
          {images.length > 1 && (
            <IconButton
              type="button"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              aria-label="Previous image"
              variant="scrim"
              rounded="full"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12"
            >
              <Span size="2xl">‹</Span>
            </IconButton>
          )}

          {/* Image */}
          <Row
            centered
            className="relative h-[85vh] w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <MediaImage
              src={currentImage}
              alt={`Review photo ${lightboxIdx + 1}`}
              size="hero"
              objectFit="contain"
              rounded="lg"
              shadow="2xl"
            />
          </Row>

          {/* Next */}
          {images.length > 1 && (
            <IconButton
              type="button"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              aria-label="Next image"
              variant="scrim"
              rounded="full"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12"
            >
              <Span size="2xl">›</Span>
            </IconButton>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <Row justify="center" gap="xs" className="absolute bottom-4 left-0 right-0" padding="x-md">
              {images.map((img, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  aria-label={`Go to image ${i + 1}`}
                  rounded="md"
                  paddingX="none"
                  paddingY="none"
                  className={`h-12 w-12 flex-shrink-0 overflow-hidden border-2 transition-all ${
 i === lightboxIdx
 ? "border-white scale-110"
 : "border-transparent opacity-60 hover:opacity-100"
 }`}
                >
                  <MediaImage src={img} alt={`Thumbnail ${i + 1}`} size="thumbnail" />
                </Button>
              ))}
            </Row>
          )}
        </Row>
      )}
    </>
  );
}
