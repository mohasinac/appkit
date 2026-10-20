/**
 * HeroCarousel-specific class strings.
 *
 * 🛑 `HERO_CAROUSEL_ARROW`, `HERO_CAROUSEL_DOT_ACTIVE` and
 * `HERO_CAROUSEL_DOT_INACTIVE` were DELETED 2026-10-20 along with the markup
 * that consumed them. They were one of three unrelated carousel-indicator
 * implementations on the homepage; all three are now
 * `ui/components/CarouselNav`, whose docstring records what each of them got
 * wrong. Do not reintroduce a per-surface dot or arrow style here — a second
 * appearance is how the three diverged in the first place.
 */

/** Absolute fill helper — `position: absolute; inset: 0`. */
export const POSITION_FILL = "absolute inset-0";

/** Flex centering helper — `flex items-center justify-center`. */
export const FLEX_CENTER = "flex items-center justify-center";

/** Background for hero placeholder skeleton. */
export const HERO_PLACEHOLDER_BG = "bg-[var(--appkit-color-border-subtle)]";
