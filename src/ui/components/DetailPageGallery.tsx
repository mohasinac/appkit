"use client";
import React, { useEffect, useState, type ReactNode } from "react";
import { Div } from "./Div";
import { MediaImage } from "./MediaImage";

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
  /**
   * `"video"` renders a muted, controls-less `<video>` frame instead of an
   * `<img>` — its first frame IS the cover, and playback belongs in whatever
   * lightbox the consumer opens from `onOpen`.
   *
   * 🛑 Added because a contest entry may be a video, and the alternative was a
   * third gallery component. Defaults to `"image"`, so every existing caller is
   * unchanged.
   */
  kind?: "image" | "video";
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
  /**
   * Thumbnail size. `"lg"` is the larger variant — owner, 2026-11-10: *"they
   * should be like we do on the product details screens / listing details just
   * larger"*. Defaults to `"md"`, the size product pages already use.
   */
  size?: "md" | "lg";
  /**
   * How a `url` becomes pixels.
   *
   *  - `"optimized"` (default) → `MediaImage`, i.e. `next/image` through the
   *    media proxy. Right for catalogue imagery with a configured loader.
   *  - `"raw"` → a plain `<img>` / `<video>` with the URL exactly as given.
   *
   * 🛑 `"raw"` is not a shortcut, it is a requirement on the subdomains. Entry
   * media is stored host-agnostically as `/media/<shortId>` and resolved by
   * each deployment's own `/media/:path*` rewrite; the media host is NOT a
   * configured `next/image` loader domain there, so the optimized path refuses
   * it at RUNTIME while compiling perfectly. `EntryMediaThumb` carries the
   * same note for the same reason.
   */
  resolve?: "optimized" | "raw";
  /**
   * Render prev/next arrows over the main item when there is more than one.
   *
   * ⚠ Defaults to `false` so adding the slider here cannot restyle a surface
   * that only ever asked for a thumbnail strip. Consumers that want the
   * one-at-a-time-with-navigation shape opt in.
   */
  showArrows?: boolean;
  /** Show a `3 / 7` counter over the main item. Implied by `showArrows`. */
  showCounter?: boolean;
  /**
   * Called when the active item changes (arrow, thumbnail or keyboard).
   *
   * ⚠ A function prop. Legal here and only here: this is a `"use client"`
   * component and every consumer is also a client component. A SERVER page may
   * not pass one — React writes an error row at that prop position and the
   * browser dies deserialising it at hydration (#441, a week of downtime).
   */
  onSelect?: (index: number) => void;
  /**
   * Called when the main item is activated (click or Enter). Supplying it is
   * what turns the main frame into a real `<button>` — so it is reachable and
   * operable from a keyboard rather than a div with an onClick. Omitted, the
   * frame is inert, which is the existing behaviour.
   */
  onOpen?: (index: number) => void;
  /** Additional classes appended to the outer wrapper. */
  className?: string;
}

const ASPECT_CLASS: Record<NonNullable<DetailPageGalleryProps["aspect"]>, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/9]",
};

/** Thumbnail box per `size`. The main frame is sized by `aspect` + the parent. */
const THUMB_CLASS: Record<NonNullable<DetailPageGalleryProps["size"]>, string> = {
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

const NAV_BTN_CLASS =
  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-[var(--appkit-color-border)] " +
  "bg-[var(--appkit-color-surface)]/90 px-3 py-2 text-[length:var(--appkit-text-lg)] " +
  "font-semibold leading-none shadow-sm disabled:opacity-40";

/** One item, rendered by whichever path `resolve` selected. */
function GalleryMedia({
  item,
  alt,
  resolve,
  optimizedSize,
}: {
  item: DetailPageGalleryImage;
  alt: string;
  resolve: NonNullable<DetailPageGalleryProps["resolve"]>;
  optimizedSize: "hero" | "thumbnail";
}) {
  if (item.kind === "video") {
    /*
     * Always raw. There is no `next/image` path for a video, and `preload
     *="metadata"` with no `controls` is what makes the first frame a cover
     * rather than autoplaying every item in a strip.
     */
    return (
      <video
        src={item.url}
        preload="metadata"
        muted
        playsInline
        aria-label={alt}
        className="h-full w-full object-cover"
      />
    );
  }
  if (resolve === "raw") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }
  return <MediaImage src={item.url} alt={alt} size={optimizedSize} />;
}

/**
 * `DetailPageGallery` — ONE item at a time, with a thumbnail strip and optional
 * arrows. The pattern product, collector-drop and pre-order detail pages use.
 *
 * Owner, 2026-11-10: *"where is my slider? i do not want the images to be shown
 * all together, they should be like we do on the product details screens /
 * listing details just larger"* — so the contest entry detail view composes
 * THIS rather than a third gallery. The additions that made it reusable there
 * (`kind`, `resolve`, `size`, `showArrows`, `onOpen`) are all opt-in and every
 * default is the previous behaviour.
 *
 * W1-14 — extracted 2026-05-23. Slider + video + raw-resolve added 2026-11-10.
 */
export function DetailPageGallery({
  images,
  title,
  aspect = "square",
  fallback,
  initialIndex = 0,
  size = "md",
  resolve = "optimized",
  showArrows = false,
  showCounter,
  onSelect,
  onOpen,
  className,
}: DetailPageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
  );

  /*
   * 🛑 Clamp when the LIST shrinks. An entry edit that removes the last photo
   * leaves `activeIndex` past the end, and `images[activeIndex]` is then
   * `undefined` — which the `?? images[0]` below survives, but the thumbnail
   * highlight and the counter would both report a position that does not
   * exist. Cheaper and more honest than resetting to 0 on every prop change,
   * which would throw away the viewer's place on an unrelated re-render.
   */
  useEffect(() => {
    setActiveIndex((current) =>
      current > images.length - 1 ? Math.max(images.length - 1, 0) : current,
    );
  }, [images.length]);

  if (!images.length) {
    return (
      <Div
        className={[
          "w-full overflow-hidden rounded-2xl bg-[var(--appkit-color-surface)]",
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
  const activeAlt = active.alt ?? title ?? "";
  const multiple = images.length > 1;
  const withCounter = showCounter ?? showArrows;

  const select = (index: number) => {
    const next = Math.min(Math.max(index, 0), images.length - 1);
    setActiveIndex(next);
    onSelect?.(next);
  };

  const frameInner = (
    <GalleryMedia
      item={active}
      alt={activeAlt}
      resolve={resolve}
      optimizedSize="hero"
    />
  );

  return (
    <Div
      className={["w-full space-y-2", className].filter(Boolean).join(" ")}
    >
      <Div
        className={[
          "relative w-full overflow-hidden rounded-2xl bg-[var(--appkit-color-surface)]",
          ASPECT_CLASS[aspect],
        ].join(" ")}
      >
        {onOpen ? (
          /*
           * A real `<button>`, not a div with an onClick — this opens a modal
           * lightbox, so it has to be reachable and operable from a keyboard.
           * The arrows below are separate buttons and sit ABOVE it in z-order,
           * so clicking one navigates rather than opening the lightbox.
           */
          <button
            type="button"
            onClick={() => onOpen(activeIndex)}
            aria-label={`Open ${activeAlt || "item"} full size`}
            className="absolute inset-0 h-full w-full cursor-zoom-in p-0"
          >
            {frameInner}
          </button>
        ) : (
          frameInner
        )}

        {showArrows && multiple ? (
          <>
            <button
              type="button"
              onClick={() => select(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous item"
              className={`${NAV_BTN_CLASS} left-2`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => select(activeIndex + 1)}
              disabled={activeIndex === images.length - 1}
              aria-label="Next item"
              className={`${NAV_BTN_CLASS} right-2`}
            >
              ›
            </button>
          </>
        ) : null}

        {withCounter && multiple ? (
          <Div
            className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-[var(--appkit-color-surface)]/90 px-2 py-0.5 text-[length:var(--appkit-text-xs)]"
            aria-live="polite"
          >
            {activeIndex + 1} / {images.length}
          </Div>
        ) : null}
      </Div>

      {multiple ? (
        <Div className={`flex gap-2 ${__O.xAuto} pb-1`}>
          {images.map((img, idx) => (
            <button
              key={img.url + idx}
              type="button"
              aria-label={`View item ${idx + 1}`}
              aria-current={idx === activeIndex}
              onClick={() => select(idx)}
              className={[
                "flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                THUMB_CLASS[size],
                idx === activeIndex
                  ? "border-[var(--appkit-color-primary)]"
                  : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600",
              ].join(" ")}
            >
              <GalleryMedia
                item={img}
                alt={img.alt ?? `${title ?? ""} ${idx + 1}`}
                resolve={resolve}
                optimizedSize="thumbnail"
              />
            </button>
          ))}
        </Div>
      ) : null}

      {active.caption ? (
        <Div className="text-xs text-[var(--appkit-color-text-muted)]">{active.caption}</Div>
      ) : null}
    </Div>
  );
}
