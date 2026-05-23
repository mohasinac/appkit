import type { ReactElement, ReactNode } from "react";

/**
 * `renderOgLayout` — W1-1 — single shared OG card renderer that the 18 per-feature
 * `og.tsx` files can delegate to. Layout: dark hero with optional background image
 * (15% opacity wash), large feature image on the left, title + subtitle + badges +
 * site brand stacked on the right. Each feature builds its own thin adapter that
 * pulls the right fields off its document and passes them as slots here.
 *
 * The signature is intentionally narrow — domain-specific decorations (price
 * pill, countdown, score chip) flow in via the `badges` array or the optional
 * `accentSlot` (e.g. price label, urgency message). Anything more bespoke
 * should compose this layout from outside, not extend it.
 */

export interface OgLayoutSlots {
  /** Headline rendered at the largest type size. */
  title: string;
  /** Optional subtitle below the title. */
  subtitle?: string;
  /** Optional feature image rendered on the left (square contain-fit). */
  imageUrl?: string | null;
  /** Site brand label rendered as the eyebrow. */
  siteName: string;
  /** Optional badge chips rendered above the title. */
  badges?: ReactNode[];
  /** Optional accent line rendered below the title (price, countdown, etc.). */
  accentSlot?: ReactNode;
  /** Optional theme overrides — hex strings only (Satori doesn't accept CSS vars). */
  theme?: Partial<OgLayoutTheme>;
}

export interface OgLayoutTheme {
  /** Background base color. */
  background: string;
  /** Headline color. */
  titleColor: string;
  /** Subtitle / body text color. */
  bodyColor: string;
  /** Brand accent color used for the eyebrow + price. */
  accentColor: string;
  /** Gradient overlay (CSS gradient string). */
  overlayGradient: string;
}

const DEFAULT_THEME: OgLayoutTheme = {
  background: "#0f172a",
  titleColor: "#f1f5f9",
  bodyColor: "#cbd5e1",
  accentColor: "#84e122",
  overlayGradient:
    "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)",
};

export function renderOgLayout(slots: OgLayoutSlots): ReactElement {
  const theme: OgLayoutTheme = { ...DEFAULT_THEME, ...(slots.theme ?? {}) };
  const { title, subtitle, imageUrl, siteName, badges, accentSlot } = slots;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: theme.background,
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.15,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: theme.overlayGradient,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "60px",
          gap: "48px",
          alignItems: "center",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: 420,
              height: 420,
              objectFit: "contain",
              borderRadius: 16,
              flexShrink: 0,
            }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
          <div
            style={{
              fontSize: 20,
              color: theme.accentColor,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {siteName}
          </div>

          {badges && badges.length > 0 ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {badges.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    padding: "8px 16px",
                    borderRadius: 9999,
                    background: "rgba(255,255,255,0.1)",
                    color: theme.bodyColor,
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
          ) : null}

          <div
            style={{
              fontSize: imageUrl ? 44 : 56,
              fontWeight: 700,
              color: theme.titleColor,
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>

          {accentSlot ? (
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: theme.accentColor }}>
              {accentSlot}
            </div>
          ) : null}

          {subtitle ? (
            <div style={{ display: "flex", fontSize: 24, color: theme.bodyColor }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
