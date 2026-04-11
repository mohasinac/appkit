import type { IStyleAdapter } from "@mohasinac/contracts";

/**
 * Vanilla CSS adapter implementing IStyleAdapter.
 *
 * Does not depend on Tailwind — suitable for projects using plain CSS custom
 * properties, CSS Modules, or any non-Tailwind styling system.
 *
 * - cn()    joins class strings, filtering falsy values (no deduplication)
 * - token() returns a CSS custom property reference: var(--appkit-{name})
 *
 * Register this in providers.config.ts:
 *   import { vanillaAdapter } from "@mohasinac/css-vanilla";
 *   registerProviders({ ..., style: vanillaAdapter });
 */
export const vanillaAdapter: IStyleAdapter = {
  /**
   * Joins class names, filtering falsy values.
   * Does NOT deduplicate conflicting classes — use @mohasinac/css-tailwind
   * for projects where Tailwind class conflicts must be resolved.
   *
   * @example
   *   vanillaAdapter.cn("px-4 py-2", undefined, "extra") // "px-4 py-2 extra"
   */
  cn(...classes: Array<string | undefined | null | false>): string {
    return classes.filter(Boolean).join(" ");
  },

  /**
   * Returns a CSS custom property reference for the given token name.
   * Identical to the tailwindAdapter implementation — allows interchangeability.
   *
   * @example
   *   vanillaAdapter.token("color-primary")  // "var(--appkit-color-primary)"
   */
  token(name: string): string {
    return `var(--appkit-${name})`;
  },
};

/**
 * Convenience re-export of cn() for direct use in components.
 */
export function cn(
  ...classes: Array<string | undefined | null | false>
): string {
  return vanillaAdapter.cn(...classes);
}

/**
 * Convenience re-export of token() for direct use in inline styles.
 */
export function token(name: string): string {
  return vanillaAdapter.token(name);
}

export type { IStyleAdapter };
