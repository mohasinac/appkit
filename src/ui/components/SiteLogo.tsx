export interface SiteLogoProps {
  /** Tailwind height class. Logo width scales from viewBox. */
  className?: string;
  /** Accessible title; defaults to "LetItRip.in". */
  title?: string;
  /**
   * Visual variant:
   *  - "gradient" (default): brand-gradient wordmark on transparent background
   *  - "solid": single-colour wordmark using currentColor (useful on coloured surfaces)
   */
  variant?: "gradient" | "solid";
  /**
   * Optional image URL — when provided, renders an <img> instead of the SVG
   * wordmark. Used to honour admin-uploaded site logos. Falls back to the
   * SVG wordmark automatically when empty/undefined.
   */
  src?: string;
}

const GRADIENT_ID = "letitrip-logo-gradient";

/**
 * LetItRip site logo — SVG wordmark "LetItRip" + small ".in" superscript.
 *
 * Single source of truth for the site brand mark. Used by the title bar
 * and the welcome / hero section. Scales cleanly at any size via Tailwind
 * height class on the parent (the SVG fills available width via viewBox).
 */
export function SiteLogo({
  className = "h-7",
  title = "LetItRip.in",
  variant = "gradient",
  src,
}: SiteLogoProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        data-testid="site-logo"
        className={`block w-auto object-contain ${className}`}
      />
    );
  }

  const fill = variant === "gradient" ? `url(#${GRADIENT_ID})` : "currentColor";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 214 56"
      role="img"
      aria-label={title}
      data-testid="site-logo"
      className={`block w-auto ${className}`}
    >
      <title>{title}</title>
      {variant === "gradient" && (
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              // audit-inline-style-ok: SVG gradient stop
              style={{ stopColor: "var(--appkit-color-primary-700, #1343de)" }}
            />
            <stop
              offset="55%"
              // audit-inline-style-ok: SVG gradient stop
              style={{ stopColor: "var(--appkit-color-cobalt, #3570fc)" }}
            />
            <stop
              offset="100%"
              // audit-inline-style-ok: SVG gradient stop
              style={{ stopColor: "var(--appkit-color-secondary-400, #84e122)" }}
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
      {/* .in TLD badge — pill background makes it read as a designed element, not a floating label */}
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
