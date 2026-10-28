"use client";
/**
 * Site logo — an SVG wordmark with an optional TLD badge.
 *
 * 🛑 The glyphs are the CONSUMER's. This header used to read "SVG wordmark
 * LetItRip + small .in superscript", and that was an accurate description: the
 * text was baked into the SVG where no prop could reach it, so every install of
 * appkit rendered one Indian marketplace's name in its own header. Both are
 * props now (`wordmark`, `tld`), threaded from `appkit.config.js` through
 * `AppLayoutShell` -> `TitleBarLayout`.
 *
 * Single source of truth for the site brand mark. The wordmark gradient
 * follows the active theme via `var(--appkit-gradient-logo)`, so a custom
 * admin theme automatically restyles the logo without forking the SVG.
 *
 * 🛑 The 214-unit viewBox was drawn around an eight-glyph wordmark. A much
 * longer name will overflow it — pass `src` and use a real logo image rather
 * than expecting the SVG to re-letter itself.
 *
 * Sizes are responsive presets — the variant catalogue forbids consumer-side
 * className overrides on primitive components.
 */
import { useId } from "react";
import { MediaImage } from "../../features/media/MediaImage";

export type SiteLogoSize = "sm" | "md" | "lg" | "xl" | "hero";
export type SiteLogoTone = "brand" | "mono" | "inverse" | "on-primary";

export interface SiteLogoProps {
  /**
   * Responsive height preset. Default `"md"` matches the title-bar height
   * across breakpoints used by `TitleBarLayout`.
   */
  size?: SiteLogoSize;
  /**
   * `"brand"` (default) renders the themed gradient wordmark.
   * `"mono"` renders the wordmark in `currentColor`.
   * `"inverse"` renders in `var(--appkit-color-text-on-primary)` for use on
   * primary-coloured surfaces.
   * `"on-primary"` renders the wordmark in `var(--appkit-color-text)` — for
   * dark-primary surfaces in light mode etc.
   */
  tone?: SiteLogoTone;
  /** Accessible title. Defaults to `wordmark` + `tld`, so one prop usually suffices. */
  title?: string;
  /**
   * The wordmark GLYPHS. Defaults to `title`.
   *
   * 🛑 Separate from `title` because they are different things and conflating
   * them is what hid the brand here. `title` is the accessible name; this is
   * the text actually drawn in the SVG — and until A5 that text was the literal
   * `LetItRip`, unreachable by any prop. A consumer could rename the accessible
   * title and still render someone else's brand.
   */
  wordmark?: string;
  /**
   * Optional TLD badge drawn in a pill after the wordmark, e.g. `"in"`.
   *
   * Omitted by default: a library must not assume its consumer has a TLD worth
   * showing, let alone which one. `TitleBarLayout` threads `brandTld` through
   * for the installs that want it.
   */
  tld?: string;
  /**
   * Optional admin-uploaded image URL. When present, renders an `<MediaImage>`
   * instead of the SVG wordmark (so the watermark proxy applies). Falls back
   * to the SVG when empty/undefined.
   */
  src?: string;
}

// Gradient ID prefix — made unique per instance via useId() to prevent
// cross-SVG id conflicts when multiple SiteLogo components share the page.
// An SVG <linearGradient> ID prefix, not a class — suffixed with useId()
// and referenced as fill="url(#…)".
// audit-dead-css-ok: SVG gradient id, not a class
const GRADIENT_ID_PREFIX = "appkit-logo-gradient";

const SIZE_HEIGHTS: Record<SiteLogoSize, string> = {
  sm: "h-5",
  md: "h-7 md:h-9 lg:h-10",
  lg: "h-9 md:h-11 lg:h-12",
  xl: "h-12 md:h-16 lg:h-20",
  hero: "h-24 xl:h-32 2xl:h-40",
};

function resolveFill(tone: SiteLogoTone, gradientId: string): string {
  switch (tone) {
    case "mono":
      return "currentColor";
    case "inverse":
      return "var(--appkit-color-text-on-primary)";
    case "on-primary":
      return "var(--appkit-color-text)";
    case "brand":
    default:
      return `url(#${gradientId})`;
  }
}

export function SiteLogo({
  size = "md",
  tone = "brand",
  /*
   * 🛑 No brand default. This read `title = "LetItRip.in"`, which put one
   * consumer's name in a library primitive — and the SVG below ignored it
   * anyway, drawing the literal `LetItRip` that no prop could reach.
   *
   * `"Site"` is deliberately bland: an unconfigured install should look
   * obviously unconfigured rather than silently wear someone else's brand.
   */
  title,
  wordmark,
  tld,
  src,
}: SiteLogoProps) {
  const text = wordmark ?? title ?? "Site";
  const accessibleTitle = title ?? (tld ? `${text}.${tld}` : text);
  const uid = useId();
  const gradientId = `${GRADIENT_ID_PREFIX}-${uid.replace(/:/g, "")}`;
  const heightCls = SIZE_HEIGHTS[size];

  if (src) {
    return (
      <MediaImage
        src={src}
        alt={accessibleTitle}
        size="thumbnail"
        objectFit="contain"
        // backed by the catalogued `size` enum; no consumer-provided overrides.
        className={`block w-auto ${heightCls}`}
      />
    );
  }

  const fill = resolveFill(tone, gradientId);
  const isGradient = tone === "brand";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 214 56"
      role="img"
      aria-label={accessibleTitle}
      data-testid="site-logo"
      // backed by the catalogued `size` enum; no consumer-provided overrides.
      className={`block w-auto ${heightCls}`}
    >
      <title>{accessibleTitle}</title>
      {isGradient && (
        <defs>
          {/* Per-stop CSS variables (--appkit-logo-stop-*) are defined in
              tokens.css with separate light/dark overrides so the gradient
              stays visible on both light and dark surfaces without any
              client-side JS branching. */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              style={{ stopColor: "var(--appkit-logo-stop-from)" }}
            />
            <stop
              offset="55%"
              style={{ stopColor: "var(--appkit-logo-stop-mid)" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--appkit-logo-stop-to)" }}
            />
          </linearGradient>
        </defs>
      )}
      <text
        x="0"
        y="44"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="44"
        letterSpacing="-1.5"
        fill={fill}
      >
        {text}
      </text>
      {/*
        TLD badge — a pill, so it reads as a designed element rather than
        punctuation.

        🛑 Rendered only when a `tld` is supplied. Its geometry is pinned to the
        214-unit viewBox, which was drawn around the eight glyphs of one
        particular wordmark — so a consumer with a much longer or shorter name
        should pass `src` and use a real logo image rather than expect this SVG
        to re-letter itself. Stating that is better than silently overlapping.
      */}
      {tld && (
        <>
          <rect x="169" y="5" width="43" height="21" rx="10.5" fill={fill} opacity="0.12" />
          <text
            x="174"
            y="21"
            fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="700"
            fontSize="15"
            letterSpacing="0.2"
            fill={fill}
          >
            .{tld}
          </text>
        </>
      )}
    </svg>
  );
}
