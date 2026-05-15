"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RichText, Span, StarRating } from "../../../ui";
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
  const reviewerHref = !review.isAnonymous && review.userId
    ? String(ROUTES.PUBLIC.PROFILE(review.userId))
    : null;

  const currentImage = lightboxIdx !== null ? images[lightboxIdx] : null;

  return (
    <>
      {/* ── Hero: rating + title ──────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pb-8 pt-10">
        <div className="mx-auto max-w-3xl px-4">
          {/* Star rating — large */}
          <div className="mb-4 flex items-center gap-3">
            <StarRating value={review.rating} size="lg" readOnly />
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {review.rating}.0
            </span>
            {review.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                ✓ Verified Purchase
              </span>
            )}
            {review.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                ★ Featured
              </span>
            )}
          </div>

          {review.title && (
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 leading-snug">
              {review.title}
            </h1>
          )}

          {/* Reviewer row */}
          <div className="flex items-center gap-3">
            {review.userAvatar ? (
              <div
                role="img"
                aria-label={displayName}
                className="h-11 w-11 flex-shrink-0 rounded-full bg-center bg-cover ring-2 ring-white dark:ring-zinc-800"
                style={{ backgroundImage: `url(${review.userAvatar})` }}
              />
            ) : (
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary ring-2 ring-white dark:ring-zinc-800">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              {reviewerHref ? (
                <Link
                  href={reviewerHref}
                  className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-primary transition-colors"
                >
                  {displayName}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {review.isAnonymous ? "Anonymous" : displayName}
                </span>
              )}
              {date && (
                <p className="text-xs text-neutral-400 dark:text-zinc-500 mt-0.5">{date}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">

        {/* Rich text comment */}
        {review.comment && (
          <section>
            <RichText
              html={normalizeRichTextHtml(review.comment)}
              proseClass="prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-img:rounded-lg prose-a:text-primary"
              className="text-neutral-700 dark:text-zinc-300"
            />
          </section>
        )}

        {/* Image grid with lightbox trigger */}
        {images.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-zinc-500 mb-3">
              Photos ({images.length})
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  aria-label={`View photo ${i + 1}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div
                    className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${img.thumbnailUrl ?? img.url})` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <span className="text-white text-xl">🔍</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Video player */}
        {review.video && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-zinc-500 mb-3">
              Video
            </h2>
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-zinc-700 bg-black aspect-video">
              <video
                src={review.video.url}
                poster={review.video.thumbnailUrl}
                controls
                className="h-full w-full"
                preload="metadata"
              />
            </div>
          </section>
        )}

        {/* Helpful votes */}
        <section className="flex items-center gap-4 py-4 border-t border-neutral-100 dark:border-zinc-800">
          <div className="text-sm text-neutral-500 dark:text-zinc-400">
            {helpfulCount > 0 && (
              <span>
                <strong className="text-neutral-900 dark:text-white">{helpfulCount}</strong>{" "}
                {helpfulCount === 1 ? "person" : "people"} found this helpful
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleVote}
            disabled={voted || voting}
            className={`ml-auto flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              voted
                ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-default"
                : "border-neutral-300 dark:border-zinc-600 text-neutral-700 dark:text-zinc-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary disabled:opacity-50"
            }`}
          >
            <span aria-hidden="true">{voted ? "✓" : "👍"}</span>
            {voted ? "Marked helpful" : voting ? "Saving…" : "Helpful?"}
          </button>
        </section>

        {/* Links: Product / Seller / Reviewer */}
        <section className="grid gap-3 sm:grid-cols-3">
          {productHref && (
            <Link
              href={productHref}
              className="group flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-primary hover:shadow-sm transition-all"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 text-xl">
                📦
              </span>
              <div className="min-w-0">
                <p className="text-xs text-neutral-400 dark:text-zinc-500 mb-0.5">Product</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors">
                  {review.productTitle ?? "View Product"}
                </p>
              </div>
            </Link>
          )}

          {sellerHref && (
            <Link
              href={sellerHref}
              className="group flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-primary hover:shadow-sm transition-all"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-xl">
                🏪
              </span>
              <div className="min-w-0">
                <p className="text-xs text-neutral-400 dark:text-zinc-500 mb-0.5">Seller</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors">
                  View Seller
                </p>
              </div>
            </Link>
          )}

          {reviewerHref ? (
            <Link
              href={reviewerHref}
              className="group flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-primary hover:shadow-sm transition-all"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-xl">
                👤
              </span>
              <div className="min-w-0">
                <p className="text-xs text-neutral-400 dark:text-zinc-500 mb-0.5">Reviewer</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors">
                  {displayName}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-xl">
                👤
              </span>
              <div className="min-w-0">
                <Span className="block text-xs text-neutral-400 dark:text-zinc-500 mb-0.5">Reviewer</Span>
                <Span className="block text-sm font-medium text-neutral-900 dark:text-white truncate">
                  Anonymous
                </Span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightboxIdx !== null && currentImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
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
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIdx + 1} / {images.length}
          </div>

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
          <div
            className="max-h-[85vh] max-w-[85vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage.url}
              alt={`Review photo ${lightboxIdx + 1}`}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
          </div>

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
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
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
                  style={{ backgroundImage: `url(${img.thumbnailUrl ?? img.url})` }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
