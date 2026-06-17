/**
 * Grid className tokens — extracted from `THEME_CONSTANTS.grid` and
 * `THEME_CONSTANTS.card` during Phase 8 of the Theme/Tokens/Variants refactor.
 * Used by homepage hero / advertisement / character-hotspot sections that
 * still author raw grid className strings rather than the typed `<Grid cols=…>`
 * primitive. A subsequent sweep can migrate each to the variant.
 */
export const GRID_COLS_2_MD =
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2";
export const GRID_COLS_6_LG = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";

export const CARD_ASPECT_BANNER = "aspect-[4/3] md:aspect-auto";

/** Vertical stack spacing — `space-y-4 sm:space-y-6`. */
export const SPACING_STACK = "space-y-4 sm:space-y-6";
