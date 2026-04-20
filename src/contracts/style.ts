// --- Style Adapter Interface --------------------------------------------------

/**
 * CSS framework adapter contract.
 * UI components call cn()/token() through this adapter, making them
 * CSS-framework-agnostic.
 *
 * Implemented by:
 *   @mohasinac/css-tailwind  — twMerge + clsx
 *   @mohasinac/css-vanilla   — plain string join
 *   @mohasinac/css-emotion   — Emotion cx()
 *   @mohasinac/css-modules   — CSS Modules
 */
export interface IStyleAdapter {
  /**
   * Merges and deduplicates class names.
   * Equivalent to twMerge(clsx(...)) in Tailwind projects.
   */
  cn(...classes: Array<string | undefined | null | false>): string;
  /**
   * Resolves a design token name to a CSS custom property reference.
   * e.g. token("color-primary") → "var(--appkit-color-primary)"
   */
  token(name: string): string;
}
