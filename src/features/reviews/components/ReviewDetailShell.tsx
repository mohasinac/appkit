"use client";
import React, { useState, useEffect, useCallback } from "react";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_RELATED_LINK = "group flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-primary hover:shadow-sm transition-all";
const CLS_RELATED_LABEL = "text-xs text-zinc-400 dark:text-zinc-400 mb-0.5";
const CLS_RELATED_TITLE = "text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors";
const CLS_RATING_PILL = "inline-flex items-center gap-1 rounded-full bg-warning-surface px-3 py-1 text-warning dark:bg-warning-surface dark:text-warning";
const CLS_HELPFUL_ACTIVE = "border-success bg-success-surface text-success dark:border-success cursor-default";
const CLS_ICON_ORANGE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-warning-surface dark:bg-warning-surface text-xl";
const CLS_ICON_BLUE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-info-surface dark:bg-info-surface text-xl";
const CLS_ICON_PURPLE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-xl";
const CLS_ICON_PURPLE_BARE = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30";
import Link from "next/link";
import { Div, Grid, Heading, RichText, Row, Section, Span, StarRating, Stack, Text } from "../../../ui";
import { maskName } from "../../../security";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { ROUTES } from "../../../next";
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
      await apiClient.post(`${REVIEW_ENDPOINTS.LIST}/${review.id}/vote`, {});
      setHelpfulCount((c) => c + 1);
      setVoted(true);
      localStorage.setItem(storageKey, "1");
    } catch {
      // silently fail
    } finally {
      setVoting(false);
    }
  };

  // ── Links ───────────────────────────────────────────────────────────────────
  const productHref = review.productId
    ? String(ROUTES.PUBLIC.PRODUCT_DETAIL(review.productId))
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
      <Div surface="default" className="border-b border-neutral-200 pb-8 pt-10">
        <Div className="mx-auto max-w-3xl px-4">
          {/* Star rating — large */}
          <Row gap="sm" className="mb-4">
            <StarRating value={review.rating} size="lg" readOnly />
            <Span weight="bold" className="text-neutral-900 dark:text-white" size="2xl">
              {review.rating}.0
            </Span>
            {review.verified && (
              <Span size="xs" weight="semibold" className="inline-flex items-center gap-1 rounded-full bg-success-surface px-3 py-1 text-success">
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
            <Heading level={1} className="text-neutral-900 dark:text-white mb-4 leading-snug" size="2xl" weight="bold">
              {review.title}
            </Heading>
          )}

          {/* Reviewer row */}
          <Row gap="sm">
            {review.userAvatar ? (
              <Div
                role="img"
                aria-label={displayName}
                className="h-11 w-11 flex-shrink-0 bg-center bg-cover ring-2 ring-white dark:ring-zinc-800" rounded="full"
                // audit-inline-style-ok: dynamic image URL
                style={{ backgroundImage: `url(${review.userAvatar})` }}
              />
            ) : (
              <Row centered className="h-11 w-11 flex-shrink-0 bg-primary/10 text-base font-bold text-primary ring-2 ring-white dark:ring-zinc-800" rounded="full">
                {initials}
              </Row>
            )}
            <Div className="min-w-0">
              {reviewerHref ? (
                <Link
                  href={reviewerHref}
                  className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-primary transition-colors"
                >
                  {displayName}
                </Link>
              ) : (
                <Span size="sm" weight="semibold" className="text-neutral-900 dark:text-white">
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
      <Stack gap="xl" className="mx-auto max-w-3xl px-4" padding="y-xl">

        {/* Rich text comment */}
        {review.comment && (
          <Section>
            <RichText
              html={normalizeRichTextHtml(review.comment)}
              proseClass="prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-img:rounded-lg prose-a:text-primary"
              className="text-neutral-700 dark:text-zinc-300"
            />
          </Section>
        )}

        {/* Image grid with lightbox trigger */}
        {images.length > 0 && (
          <Section>
            <Heading level={2} className="tracking-wide text-zinc-400 dark:text-zinc-400 mb-3" size="sm" weight="semibold" transform="uppercase">
              Photos ({images.length})
            </Heading>
            <Grid gap="xs" className="grid-cols-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  aria-label={`View photo ${i + 1}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Div
                    className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
                    // audit-inline-style-ok: dynamic image URL
                    style={{ backgroundImage: `url(${img.thumbnailUrl ?? img.url})` }}
                  />
                  <Row centered className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <Span size="xl" className="text-white">🔍</Span>
                  </Row>
                </button>
              ))}
            </Grid>
          </Section>
        )}

        {/* Video player */}
        {review.video && (
          <Section>
            <Heading level={2} className="tracking-wide text-zinc-400 dark:text-zinc-400 mb-3" size="sm" weight="semibold" transform="uppercase">
              Video
            </Heading>
            <Div className={`${__O.hidden} rounded-xl border border-neutral-200 dark:border-zinc-700 bg-black aspect-video`}>
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
        <Section className="flex items-center gap-4 border-t border-neutral-100" padding="y-md">
          <Div className="text-sm text-neutral-500">
            {helpfulCount > 0 && (
              <Span>
                <Span weight="bold" className="text-neutral-900 dark:text-white">{helpfulCount}</Span>{" "}
                {helpfulCount === 1 ? "person" : "people"} found this helpful
              </Span>
            )}
          </Div>
          <button
            type="button"
            onClick={handleVote}
            disabled={voted || voting}
            className={`ml-auto flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              voted
                ? CLS_HELPFUL_ACTIVE
                : "border-neutral-300 dark:border-zinc-600 text-neutral-700 dark:text-zinc-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary disabled:opacity-50"
            }`}
          >
            <span aria-hidden="true">{voted ? "✓" : "👍"}</span>
            {voted ? "Marked helpful" : voting ? "Saving…" : "Helpful?"}
          </button>
        </Section>

        {/* Links: Product / Seller / Reviewer */}
        <Section className="grid gap-3 sm:grid-cols-3">
          {productHref && (
            <Link
              href={productHref}
              className={CLS_RELATED_LINK}
            >
              <span className={CLS_ICON_ORANGE}>
                📦
              </span>
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
              <span className={CLS_ICON_BLUE}>
                🏪
              </span>
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
              <span className={CLS_ICON_PURPLE}>
                👤
              </span>
              <Div className="min-w-0">
                <Text className={CLS_RELATED_LABEL}>Reviewer</Text>
                <Text className={CLS_RELATED_TITLE}>
                  {displayName}
                </Text>
              </Div>
            </Link>
          ) : (
            <Row surface="default" gap="sm" className={`rounded-xl border border-neutral-200 dark:border-zinc-700 ${__P.p4}`}>
              <Span size="xl" className={CLS_ICON_PURPLE_BARE}>
                👤
              </Span>
              <Div className="min-w-0">
                <Span size="xs" className="block text-zinc-400 dark:text-zinc-400 mb-0.5">Reviewer</Span>
                <Span size="sm" weight="medium" className="block text-neutral-900 dark:text-white truncate">
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
          className="fixed inset-0 z-50 bg-black/95"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close lightbox"
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-xl"
          >
            ×
          </button>

          {/* Counter */}
          <Div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIdx + 1} / {images.length}
          </Div>

          {/* Prev */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors text-2xl"
            >
              ‹
            </button>
          )}

          {/* Image */}
          <Row
            centered
            className="max-h-[85vh] max-w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage.url}
              alt={`Review photo ${lightboxIdx + 1}`}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
          </Row>

          {/* Next */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors text-2xl"
            >
              ›
            </button>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <Row justify="center" gap="xs" className="absolute bottom-4 left-0 right-0 px-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  aria-label={`Go to image ${i + 1}`}
                  className={`h-12 w-12 flex-shrink-0 rounded-md bg-center bg-cover border-2 transition-all ${
                    i === lightboxIdx
                      ? "border-white scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  // audit-inline-style-ok: dynamic image URL
                  style={{ backgroundImage: `url(${img.thumbnailUrl ?? img.url})` }}
                />
              ))}
            </Row>
          )}
        </Row>
      )}
    </>
  );
}
