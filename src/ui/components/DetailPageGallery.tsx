"use client";
import React, { useState, type ReactNode } from "react";
import { Div } from "./Div";

const __O = {
  xAuto: "overflow-x-auto",
} as const;

export interface DetailPageGalleryImage {
  /** Public URL (resolved to `/media/<slug>` already). */
  url: string;
  /** Alt text — falls back to the gallery title if omitted. */
  alt?: string;
  /** Optional caption rendered beneath the image. */
  caption?: ReactNode;
}

export interface DetailPageGalleryProps {
  /** Image list. Empty array renders the fallback. */
  images: DetailPageGalleryImage[];
  /** Default title used as alt-text fallback. */
  title?: string;
  /** Aspect ratio for the main image — defaults to `square`. */
  aspect?: "square" | "video" | "portrait" | "wide";
  /** Optional fallback slot rendered when `images` is empty. */
  fallback?: ReactNode;
  /** Initial selected index. */
  initialIndex?: number;
  /** Additional classes appended to the outer wrapper. */
  className?: string;
}

const ASPECT_CLASS: Record<NonNullable<DetailPageGalleryProps["aspect"]>, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/9]",
};

/**
 * `DetailPageGallery` — main image + thumbnail strip used by Product, Auction
 * and PreOrder detail pages. Lightweight presentational component — domain
 * logic (zoom, hover-preview, image-cycling-on-tap) is opt-in by the consumer
 * via overlays.
 *
 * W1-14 — extracted 2026-05-23.
 */
export function DetailPageGallery({
  images,
  title,
  aspect = "square",
  fallback,
  initialIndex = 0,
  className,
}: DetailPageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
  );

  if (!images.length) {
    return (
      <Div
        className={[
          "appkit-detail-gallery",
          "w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800",
          ASPECT_CLASS[aspect],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {fallback}
      </Div>
    );
  }

  const active = images[activeIndex] ?? images[0];

  return (
    <Div
      className={[
        "appkit-detail-gallery",
        "w-full space-y-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Div
        className={[
          "w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800",
          ASPECT_CLASS[aspect],
        ].join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt={active.alt ?? title ?? ""}
          className="h-full w-full object-cover"
        />
      </Div>

      {images.length > 1 ? (
        <Div className={`flex gap-2 ${__O.xAuto} pb-1`}>
          {images.map((img, idx) => (
            <button
              key={img.url + idx}
              type="button"
              aria-label={`View image ${idx + 1}`}
              onClick={() => setActiveIndex(idx)}
              className={[
                "flex-shrink-0 h-16 w-16 overflow-hidden rounded-md border-2 transition-colors",
                idx === activeIndex
                  ? "border-[var(--appkit-color-primary)]"
                  : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? `${title ?? ""} ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </Div>
      ) : null}

      {active.caption ? (
        <Div className="text-xs text-zinc-500 dark:text-zinc-400">{active.caption}</Div>
      ) : null}
    </Div>
  );
}
