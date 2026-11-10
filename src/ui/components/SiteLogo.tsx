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
 * ✅ The viewBox is MEASURED from the wordmark, so any length renders. It used
 * to be a hardcoded 214 units drawn around one eight-glyph name, and anything
 * longer was clipped: `"Acme Identity"` came out as `"Acme Iden"`. See the
 * note above `NARROW_GLYPHS` for why the width is estimated rather than
 * measured, and why it errs wide.
 *
 * Sizes are responsive presets — the variant catalogue forbids consumer-side
 * className overrides on primitive components.
 */
import { useId } from "react";
import { MediaImage } from "./MediaImage";

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
   * for the installs that want it. The pill is sized and placed from the
   * measured wordmark, so any wordmark/tld pair fits.
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

/*
 * ── THE VIEWBOX MEASURES THE WORDMARK; IT IS NOT A CONSTANT ────────────────
 *
 * 🛑 This was `viewBox="0 0 214 56"`, hardcoded, with the TLD badge pinned at
 * `x=169`. 214 units was drawn around ONE eight-glyph wordmark, so anything
 * longer was silently CLIPPED by the viewBox: `"Acme Identity"` rendered as
 * `"Acme Iden"`. Nothing errored and no prop could help — the component's own
 * docstring told the consumer to give up and pass `src`.
 *
 * A library primitive whose only job is to draw the consumer's name must draw
 * whatever name it is given. So the box is measured from the text instead.
 *
 * The estimate is deliberate, not a measurement: an SVG in a server render has
 * no font metrics available, and `textLength` would "fit" by squeezing the
 * glyphs — which is a different kind of wrong. Advance widths are per-glyph
 * CLASS (narrow / normal / wide) rather than a flat average, because a flat
 * average overruns on `"Illinois"` and underruns on `"Mamma"`. Erring WIDE is
 * the safe direction: spare units at the right edge are invisible (the element
 * is `w-auto` at a fixed height), a short box amputates letters.
 */
const NARROW_GLYPHS = new Set([..."iIl|jtf.,:;'!`[]()/\\-"]);
const WIDE_GLYPHS = new Set([..."MWmw@%"]);

/** Fraction of `fontSize` one glyph advances, by class. */
const ADVANCE = { space: 0.26, narrow: 0.31, normal: 0.6, wide: 0.88 } as const;

/** Safety factor — see the note above on erring wide. */
const ADVANCE_PAD = 1.06;

function estimateTextWidth(text: string, fontSize: number, tracking: number): number {
  let w = 0;
  for (const ch of text) {
    const factor =
      ch === " "
        ? ADVANCE.space
        : NARROW_GLYPHS.has(ch)
          ? ADVANCE.narrow
          : WIDE_GLYPHS.has(ch)
            ? ADVANCE.wide
            : ADVANCE.normal;
    w += fontSize * factor + tracking;
  }
  // No tracking after the final glyph.
  return Math.max(0, (w - tracking) * ADVANCE_PAD);
}

/** Geometry of the drawn wordmark + optional TLD pill, in viewBox units. */
const WORDMARK = { fontSize: 44, tracking: -1.5, baseline: 44, height: 56 } as const;
const BADGE = {
  fontSize: 15,
  tracking: 0.2,
  gap: 8,
  padX: 7,
  y: 5,
  h: 21,
  textY: 21,
} as const;

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
  /*
   * `||`, not `??` — a BLANK wordmark must fall through to the bland default
   * too. Now that the viewBox is measured from this string, `wordmark=""`
   * would otherwise produce a zero-width box: an SVG that is present, valid
   * and invisible, which is the hardest kind of missing logo to diagnose.
   */
  const text = wordmark?.trim() || title?.trim() || "Site";
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

  // See the note above `NARROW_GLYPHS`: the box is measured, never constant.
  const textWidth = estimateTextWidth(text, WORDMARK.fontSize, WORDMARK.tracking);
  const badgeLabel = tld ? `.${tld}` : "";
  const badgeWidth = tld
    ? estimateTextWidth(badgeLabel, BADGE.fontSize, BADGE.tracking) + BADGE.padX * 2
    : 0;
  const badgeX = textWidth + BADGE.gap;
  const viewWidth = Math.ceil(tld ? badgeX + badgeWidth : textWidth);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewWidth} ${WORDMARK.height}`}
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
        y={WORDMARK.baseline}
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize={WORDMARK.fontSize}
        letterSpacing={WORDMARK.tracking}
        fill={fill}
      >
        {text}
      </text>
      {/*
        TLD badge — a pill, so it reads as a designed element rather than
        punctuation.

        🛑 Positioned RELATIVE to the measured wordmark, never at a fixed `x`.
        It used to sit at `x=169` with `width=43`, numbers derived from one
        particular eight-glyph name — so a shorter name left it floating in
        space and a longer one had the wordmark run underneath it. The pill
        width now follows the tld's own length too, so a two-letter tld and a
        `.co.uk` both get a pill that fits them.
      */}
      {tld && (
        <>
          <rect
            x={badgeX}
            y={BADGE.y}
            width={badgeWidth}
            height={BADGE.h}
            rx={BADGE.h / 2}
            fill={fill}
            opacity="0.12"
          />
          <text
            x={badgeX + BADGE.padX}
            y={BADGE.textY}
            fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="700"
            fontSize={BADGE.fontSize}
            letterSpacing={BADGE.tracking}
            fill={fill}
          >
            {badgeLabel}
          </text>
        </>
      )}
    </svg>
  );
}
