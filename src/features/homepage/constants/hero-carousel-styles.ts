/**
 * HeroCarousel-specific class strings (arrow + active/inactive dots).
 *
 * Extracted from `THEME_CONSTANTS.carousel.{arrow,dotActive,dotInactive}`
 * so the consumer sweep can drop the THEME_CONSTANTS dependency.
 */
export const HERO_CAROUSEL_ARROW =
  "w-10 h-10 rounded-2xl bg-white/85 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg border border-zinc-300/70 dark:border-slate-600 text-zinc-800 dark:text-zinc-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:border-zinc-400 dark:hover:border-slate-500 active:scale-95 transition-all duration-200 flex items-center justify-center";

export const HERO_CAROUSEL_DOT_ACTIVE =
  "w-8 h-2 !min-h-0 rounded-full bg-white shadow-sm transition-all duration-500";

export const HERO_CAROUSEL_DOT_INACTIVE =
  "w-2 h-2 !min-h-0 rounded-full bg-white/55 shadow-sm transition-all duration-500";
