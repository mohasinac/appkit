"use client";

import Image from "next/image";
import { useState } from "react";

// ─── Size presets ─────────────────────────────────────────────────────────────

export type MediaImageSize =
  | "thumbnail"
  | "card"
  | "hero"
  | "banner"
  | "gallery"
  | "avatar";

const SIZE_HINTS: Record<MediaImageSize, string> = {
  thumbnail: "(max-width: 640px) 80px, (max-width: 1024px) 96px, 112px",
  card: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  hero: "100vw",
  banner: "100vw",
  gallery: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  avatar: "(max-width: 640px) 48px, 56px",
};

const FALLBACK_ICONS: Record<MediaImageSize, string> = {
  thumbnail: "📦",
  card: "📦",
  hero: "🖼️",
  banner: "🖼️",
  gallery: "📦",
  avatar: "👤",
};

// ─── MediaImageProps ──────────────────────────────────────────────────────────

export interface MediaImageProps {
  /** Image URL. When undefined the fallback icon is rendered instead. */
  src: string | undefined;
  /** Descriptive alt text — required for accessibility and SEO. */
  alt: string;
  /**
   * Sizing preset — controls the `sizes` attribute passed to Next.js Image.
   * Defaults to `'card'`.
   */
  size?: MediaImageSize;
  /** Pass `true` for above-the-fold hero / banner images to skip lazy loading. */
  priority?: boolean;
  /** CSS object-fit applied to the underlying img element. Defaults to `'cover'`. */
  objectFit?: "cover" | "contain";
  /**
   * Emoji or text to show when `src` is undefined.
   * Falls back to the per-size default icon.
   */
  fallback?: string;
  /**
   * Extra Tailwind classes applied to the absolute-fill wrapper div.
   * Use for hover animations, e.g. `group-hover:scale-110 transition-transform duration-300`.
   */
  className?: string;
}

export function MediaImage({
  src,
  alt,
  size = "card",
  priority = false,
  objectFit = "cover",
  fallback,
  className,
}: MediaImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const icon = fallback ?? FALLBACK_ICONS[size];
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  if (!src || hasError) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-slate-800 text-zinc-400 text-4xl${className ? ` ${className}` : ""}`}
        role="img"
        aria-label={alt}
      >
        <span aria-hidden="true">{icon}</span>
      </div>
    );
  }

  const isSvg =
    src.toLowerCase().endsWith(".svg") ||
    src.includes("image/svg") ||
    /[./]svg(\?|$)/i.test(src);

  return (
    <div
      className={`absolute inset-0 overflow-hidden${className ? ` ${className}` : ""}`}
    >
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-zinc-200 dark:bg-slate-700 animate-pulse"
          aria-hidden="true"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={fitClass}
        sizes={SIZE_HINTS[size]}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        unoptimized={isSvg}
      />
    </div>
  );
}

export default MediaImage;
