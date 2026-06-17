/**
 * Themed className tokens — appkit-internal mirror of the consumer-side
 * `src/constants/styles/themed.ts` extracted during Phase 8 of the
 * Theme/Tokens/Variants refactor. These are dark-mode-aware Tailwind class
 * pairs replacing the legacy `THEME_CONSTANTS.themed.*` lookups. A
 * subsequent sweep migrates each callsite to a primitive `surface` /
 * `color` / `border` variant.
 */
export const THEMED_BG_PRIMARY = "bg-zinc-50 dark:bg-slate-950";
export const THEMED_BG_SECONDARY = "bg-zinc-100 dark:bg-slate-900";
export const THEMED_BG_TERTIARY = "bg-zinc-200 dark:bg-slate-800";
export const THEMED_BORDER = "border-zinc-200 dark:border-slate-700";
export const THEMED_BORDER_STRONG = "border-zinc-300 dark:border-slate-600";
export const THEMED_TEXT_PRIMARY = "text-zinc-900 dark:text-zinc-50";
export const THEMED_TEXT_SECONDARY = "text-zinc-500 dark:text-zinc-400";
export const THEMED_TEXT_TERTIARY = "text-zinc-400 dark:text-zinc-500";
// audit-semantic-color-ok: these constants ARE the semantic token definitions
export const THEMED_TEXT_SUCCESS = "text-emerald-600 dark:text-emerald-400";
// audit-semantic-color-ok: these constants ARE the semantic token definitions
export const THEMED_TEXT_WARNING = "text-amber-600 dark:text-amber-400";
// audit-semantic-color-ok: these constants ARE the semantic token definitions
export const THEMED_TEXT_ERROR = "text-red-600 dark:text-red-400";

export const FLEX_CENTER = "flex items-center justify-center";
export const FLEX_BETWEEN = "flex items-center justify-between";
export const FLEX_START = "flex items-center justify-start";
export const FLEX_ROW = "flex items-center";
export const FLEX_COL = "flex flex-col";
export const FLEX_COL_CENTER = "flex flex-col items-center justify-center";
