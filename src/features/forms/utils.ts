/** Simple class-name concatenation utility. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Shared style constants ───────────────────────────────────────────────────

export const INPUT_BASE =
  "rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-secondary-400/20 focus:border-primary-500 dark:focus:border-secondary-400 focus:outline-none transition-colors duration-150 placeholder:text-zinc-400 dark:placeholder:text-zinc-500";

export const INPUT_ERROR =
  "border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50/30 dark:bg-red-950/10";

export const INPUT_SUCCESS =
  "border-emerald-400 dark:border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500";

export const INPUT_DISABLED =
  "bg-zinc-50 dark:bg-slate-800/30 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60";

export const INPUT_WITH_ICON = "pl-10";

export const LABEL_BASE =
  "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";
export const HELPER_BASE = "text-xs text-zinc-500 dark:text-zinc-400 mt-1";
export const ERROR_BASE = "text-xs text-red-600 dark:text-red-400 mt-1";
