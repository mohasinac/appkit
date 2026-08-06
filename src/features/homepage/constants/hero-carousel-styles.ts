/**
 * HeroCarousel-specific class strings (arrow + active/inactive dots).
 *
 * Extracted from `THEME_CONSTANTS.carousel.{arrow,dotActive,dotInactive}`
 * so the consumer sweep can drop the THEME_CONSTANTS dependency.
 */
export const HERO_CAROUSEL_ARROW =
  "w-10 h-10 rounded-2xl bg-[color-mix(in_srgb,var(--appkit-color-surface)_85%,transparent)] backdrop-blur-sm shadow-lg border border-[var(--appkit-color-border)] text-[var(--appkit-color-text)] hover:-translate-y-0.5 hover:bg-[var(--appkit-color-surface)] hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center";

export const HERO_CAROUSEL_DOT_ACTIVE =
  "w-8 h-2 !min-h-0 rounded-full bg-[var(--appkit-color-surface)] shadow-sm transition-all duration-500";

export const HERO_CAROUSEL_DOT_INACTIVE =
  "w-2 h-2 !min-h-0 rounded-full bg-white/55 shadow-sm transition-all duration-500";

/** Absolute fill helper — `position: absolute; inset: 0`. */
export const POSITION_FILL = "absolute inset-0";

/** Flex centering helper — `flex items-center justify-center`. */
export const FLEX_CENTER = "flex items-center justify-center";

/** Background for hero placeholder skeleton. */
export const HERO_PLACEHOLDER_BG = "bg-[var(--appkit-color-border-subtle)]";
