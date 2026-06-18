/**
 * LetItRip site logo — SVG wordmark "LetItRip" + small ".in" superscript.
 *
 * Single source of truth for the site brand mark. The wordmark gradient
 * follows the active theme via `var(--appkit-gradient-logo)`, so a custom
 * admin theme automatically restyles the logo without forking the SVG.
 *
 * Sizes are responsive presets — the variant catalogue forbids consumer-side
 * className overrides on primitive components.
 */
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
  /** Accessible title; defaults to "LetItRip.in". */
  title?: string;
  /**
   * Optional admin-uploaded image URL. When present, renders an `<MediaImage>`
   * instead of the SVG wordmark (so the watermark proxy applies). Falls back
   * to the SVG when empty/undefined.
   */
  src?: string;
}

const GRADIENT_ID = "appkit-logo-gradient";

const SIZE_HEIGHTS: Record<SiteLogoSize, string> = {
  sm: "h-5",
  md: "h-7 md:h-9 lg:h-10",
  lg: "h-9 md:h-11 lg:h-12",
  xl: "h-12 md:h-16 lg:h-20",
  hero: "h-24 xl:h-32 2xl:h-40",
};

function resolveFill(tone: SiteLogoTone): string {
  switch (tone) {
    case "mono":
      return "currentColor";
    case "inverse":
      return "var(--appkit-color-text-on-primary)";
    case "on-primary":
      return "var(--appkit-color-text)";
    case "brand":
    default:
      return `url(#${GRADIENT_ID})`;
  }
}

export function SiteLogo({
  size = "md",
  tone = "brand",
  title = "LetItRip.in",
  src,
}: SiteLogoProps) {
  const heightCls = SIZE_HEIGHTS[size];

  if (src) {
    return (
      <MediaImage
        src={src}
        alt={title}
        size="thumbnail"
        objectFit="contain"
        // backed by the catalogued `size` enum; no consumer-provided overrides.
        className={`block w-auto ${heightCls}`}
      />
    );
  }

  const fill = resolveFill(tone);
  const isGradient = tone === "brand";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 214 56"
      role="img"
      aria-label={title}
      data-testid="site-logo"
      // backed by the catalogued `size` enum; no consumer-provided overrides.
      className={`block w-auto ${heightCls}`}
    >
      <title>{title}</title>
      {isGradient && (
        <defs>
          {/* Embedded linearGradient references the active theme's
              --appkit-gradient-logo stops via a fallback CSS reference path. */}
          <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              style={{ stopColor: "var(--appkit-color-primary-700)" }}
            />
            <stop
              offset="55%"
              style={{ stopColor: "var(--appkit-color-primary-500)" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--appkit-color-secondary-400)" }}
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
        LetItRip
      </text>
      {/* .in TLD badge — pill background reads as a designed element. */}
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
        .in
      </text>
    </svg>
  );
}
