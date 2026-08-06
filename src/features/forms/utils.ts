/** Simple class-name concatenation utility. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// --- Shared style constants ---------------------------------------------------

export const INPUT_BASE =
  "rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] px-3.5 py-2.5 text-sm text-[var(--appkit-color-text)] focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none transition-colors duration-150 placeholder:text-[var(--appkit-color-text-faint)]";

export const INPUT_ERROR =
  "border-error focus:ring-error/20 focus:border-error bg-error-surface/30";

export const INPUT_SUCCESS =
  "border-success focus:ring-success/20 focus:border-success";

export const INPUT_DISABLED =
  "bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text-faint)] cursor-not-allowed opacity-60";

export const INPUT_WITH_ICON = "pl-10";

export const LABEL_BASE =
  "block text-sm font-medium text-[var(--appkit-color-text-muted)] mb-1.5";
export const HELPER_BASE = "text-xs text-[var(--appkit-color-text-muted)] mt-1";
export const ERROR_BASE = "text-xs text-error mt-1";
