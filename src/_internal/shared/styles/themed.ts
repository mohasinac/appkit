/**
 * Themed className tokens — appkit-internal mirror of the consumer-side
 * `src/constants/styles/themed.ts` extracted during Phase 8 of the
 * Theme/Tokens/Variants refactor. These are dark-mode-aware Tailwind class
 * pairs replacing the legacy `THEME_CONSTANTS.themed.*` lookups. A
 * subsequent sweep migrates each callsite to a primitive `surface` /
 * `color` / `border` variant.
 */
export const THEMED_BG_PRIMARY = "bg-[var(--appkit-color-bg)]";
export const THEMED_BG_SECONDARY = "bg-[var(--appkit-color-surface)]";
export const THEMED_BG_TERTIARY = "bg-[var(--appkit-color-surface-elevated)]";
export const THEMED_BORDER = "border-[var(--appkit-color-border)]";
export const THEMED_BORDER_STRONG = "border-[var(--appkit-color-border)]";
export const THEMED_TEXT_PRIMARY = "text-[var(--appkit-color-text)]";
export const THEMED_TEXT_SECONDARY = "text-[var(--appkit-color-text-muted)]";
export const THEMED_TEXT_TERTIARY = "text-[var(--appkit-color-text-faint)]";
export const THEMED_TEXT_MUTED = "text-[var(--appkit-color-text-faint)]";
export const THEMED_TEXT_SUCCESS = "text-success";
export const THEMED_TEXT_WARNING = "text-warning";
export const THEMED_TEXT_ERROR = "text-error";

export const FLEX_CENTER = "flex items-center justify-center";
export const FLEX_BETWEEN = "flex items-center justify-between";
export const FLEX_START = "flex items-center justify-start";
export const FLEX_ROW = "flex items-center";
export const FLEX_COL = "flex flex-col";
export const FLEX_COL_CENTER = "flex flex-col items-center justify-center";
