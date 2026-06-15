"use client"
import Image from "next/image";
import { useState } from "react";
import { Div, Span } from "../../ui";
import { resolveMediaUrl } from "../../utils/media-url";

// --- Size presets -------------------------------------------------------------

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
  // Use a constrained fallback instead of unconditional 100vw to avoid
  // the Next.js runtime warning when `fill` is used inside non-viewport
  // width containers (cards, sliders). This still provides a helpful
  // responsive hint while avoiding false-positive perf warnings.
  hero: "(max-width: 768px) 100vw, 1200px",
  banner: "(max-width: 768px) 100vw, 1200px",
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

// --- MediaImageProps ----------------------------------------------------------

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
  /** Override browser loading strategy when needed (`eager` for LCP images). */
  loading?: "lazy" | "eager";
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
  /**
   * Art-directed responsive sources (renders a `<picture>` instead of a bare
   * `<img>`). Each entry becomes a `<source>` element. The primary `src`
   * remains the fallback. Use this for cases where the image content itself
   * varies by viewport (mobile crop vs desktop crop), not just resolution.
   *
   * Internal slugs in `srcSet` flow through the media proxy just like `src`.
   */
  sources?: Array<{
    /** Comma-separated `srcset` value (slugs or absolute URLs). */
    srcSet: string;
    /** MIME type hint, e.g. `"image/webp"`. */
    type?: string;
    /** `media` query hint, e.g. `"(max-width: 640px)"`. */
    media?: string;
  }>;
}

/** Resolve every URL in a comma-separated srcset string through the media proxy. */
function resolveSrcSet(input: string): string {
  return input
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return "";
      // Each entry is `<url> <descriptor>?` — split on whitespace.
      const [url, ...descriptors] = trimmed.split(/\s+/);
      const resolved = resolveMediaUrl(url) ?? url;
      return descriptors.length ? `${resolved} ${descriptors.join(" ")}` : resolved;
    })
    .filter(Boolean)
    .join(", ");
}

export function MediaImage({
  src,
  alt,
  size = "card",
  priority = false,
  loading,
  objectFit = "cover",
  fallback,
  className,
  sources,
}: MediaImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const icon = fallback ?? FALLBACK_ICONS[size];
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";
  const resolvedSrc = resolveMediaUrl(src);

  if (!resolvedSrc || hasError) {
    return (
      <Div
        className={`relative w-full h-full overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-slate-800 text-zinc-400 text-4xl${className ? ` ${className}` : ""}`}
        role="img"
        aria-label={alt}
      >
        <Span aria-hidden="true">{icon}</Span>
      </Div>
    );
  }

  const isSvg =
    resolvedSrc.toLowerCase().endsWith(".svg") ||
    resolvedSrc.includes("image/svg") ||
    /[./]svg(\?|$)/i.test(resolvedSrc);

  // Art-directed `<picture>` path — bypasses Next.js `<Image>` because the
  // browser must pick the matching `<source>` itself. Loading + decoding hints
  // come from the consumer's preset.
  if (sources && sources.length > 0) {
    return (
      <Div
        className={`relative w-full h-full overflow-hidden${className ? ` ${className}` : ""}`}
      >
        {!isLoaded && (
          <Div
            className="absolute inset-0 animate-pulse" surface="subtle"
            aria-hidden="true"
          />
        )}
        <picture>
          {sources.map((source, index) => (
            <source
              key={`${source.media ?? ""}-${source.type ?? ""}-${index}`}
              srcSet={resolveSrcSet(source.srcSet)}
              type={source.type}
              media={source.media}
            />
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedSrc}
            alt={alt}
            loading={loading ?? (priority ? "eager" : "lazy")}
            decoding="async"
            // audit-variant-ok: art-directed <picture> branch — MediaImage is the
            // catalogued primitive for media (variant catalogue allows the inner
            // <img> here). Object-fit + className come from typed props.
            className={`absolute inset-0 w-full h-full ${fitClass}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        </picture>
      </Div>
    );
  }

  return (
    <Div
      className={`relative w-full h-full overflow-hidden${className ? ` ${className}` : ""}`}
    >
      {!isLoaded && (
        <Div
          className="absolute inset-0 animate-pulse" surface="subtle"
          aria-hidden="true"
        />
      )}
      <Image
        src={resolvedSrc}
        alt={alt}
        fill
        priority={priority}
        loading={loading ?? (priority ? "eager" : "lazy")}
        className={fitClass}
        sizes={SIZE_HINTS[size]}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        unoptimized={isSvg}
      />
    </Div>
  );
}

export default MediaImage;
