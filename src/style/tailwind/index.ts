import { twMerge } from "tailwind-merge";
import type { IStyleAdapter } from "../../contracts";

/**
 * Tailwind CSS adapter implementing IStyleAdapter.
 *
 * - cn()    uses twMerge to deduplicate conflicting Tailwind utility classes.
 * - token() returns a CSS custom property reference: var(--appkit-{name})
 *
 * Register this in providers.config.ts:
 *   import { tailwindAdapter } from "@mohasinac/css-tailwind";
 *   registerProviders({ ..., style: tailwindAdapter });
 *
 * Pair with @mohasinac/tokens — import tokens.css in globals.css so the
 * --appkit-* variables are defined.
 */
export const tailwindAdapter: IStyleAdapter = {
  /**
   * Merges and deduplicates Tailwind class names.
   * Later classes win when there are conflicts (e.g. "p-4" + "p-2" → "p-2").
   *
   * @example
   *   tailwindAdapter.cn("px-4 py-2", "px-6")        // "py-2 px-6"
   *   tailwindAdapter.cn("text-sm", undefined, false) // "text-sm"
   */
  cn(...classes: Array<string | undefined | null | false>): string {
    return twMerge(classes.filter(Boolean) as string[]);
  },

  /**
   * Returns a CSS custom property reference for the given token name.
   *
   * @example
   *   tailwindAdapter.token("color-primary")  // "var(--appkit-color-primary)"
   *   tailwindAdapter.token("radius-card")    // "var(--appkit-radius-card)"
   */
  token(name: string): string {
    return `var(--appkit-${name})`;
  },
};

/**
 * Convenience re-export of cn() for direct use in components.
 *
 * @example
 *   import { cn } from "@mohasinac/css-tailwind";
 *   <div className={cn("base-class", isActive && "active-class", className)} />
 */
export function cn(
  ...classes: Array<string | undefined | null | false>
): string {
  return tailwindAdapter.cn(...classes);
}

/**
 * Convenience re-export of token() for direct use in inline styles.
 *
 * @example
 *   import { token } from "@mohasinac/css-tailwind";
 *   <div style={{ color: token("color-primary") }} />
 */
export function token(name: string): string {
  return tailwindAdapter.token(name);
}

export type { IStyleAdapter };
