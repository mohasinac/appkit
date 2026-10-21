/**
 * defineTailwindConfig — appkit-aware Tailwind CSS config factory.
 *
 * appkit ships pre-compiled dist/tailwind-utilities.css covering every class
 * appkit components emit. The consumer's Tailwind config does NOT need to scan
 * node_modules/@mohasinac/appkit/**.
 *
 * Consumer must provide `content` globs for their own source files.
 *
 * Loaded via a Tailwind v4 `@config "./tailwind.config.js";` directive in the
 * consumer's CSS entry point — v4's config-compat bridge still honors
 * `content`/`theme`/`plugins`/`darkMode` from a JS config exactly like v3 did.
 *
 * NOTE (Tailwind v4 migration, 2026-08-16): `safelist` is NOT supported by the
 * v4 `@config` compat bridge. Any safelist classes must live in the consumer's
 * CSS entry point via `@source inline("...")` instead — see src/app/globals.css.
 * Do not add a `safelist` key back to this factory's override shape; it would
 * silently no-op under v4.
 *
 * @example
 * ```js
 * // tailwind.config.js
 * const { defineTailwindConfig } = require("@mohasinac/appkit/configs");
 * module.exports = defineTailwindConfig({
 * content: ["./src/**\/*.{ts,tsx}"],
 * });
 * ```
 */

export interface TailwindConfigOverride {
  content?: string[];
  theme?: Record<string, unknown>;
  plugins?: unknown[];
  [key: string]: unknown;
}

export function defineTailwindConfig(override: TailwindConfigOverride = {}) {
  const {
    content: consumerContent = [],
    theme: consumerTheme = {},
    plugins: consumerPlugins = [],
    ...rest
  } = override;

  return {
    darkMode: "class" as const,
    content: [...consumerContent],
    theme: {
      extend: {
        colors: {
          // Brand
          primary: "var(--appkit-color-primary)",
          secondary: "var(--appkit-color-secondary)",
          accent: "var(--appkit-color-accent)",
          /*
           * Surface
           *
           * 🛑 THIRTEEN ENTRIES WERE DELETED FROM HERE, and every one of them
           * generated an invalid declaration.
           *
           * They mapped to camelCase custom properties — `--appkit-color-surfaceMuted`,
           * `--appkit-color-textPrimary`, `--appkit-color-borderStrong`,
           * `--appkit-color-linkHover` and nine more — and **not one of those
           * names is declared anywhere**. The real tokens are kebab-case. So
           * `bg-surface-muted` compiled to
           * `background-color: var(--appkit-color-surfaceMuted)`, which is
           * undefined with no fallback, which drops the declaration at
           * computed-value time: the utility existed, was documented by its
           * presence here, and did nothing.
           *
           * Deleted rather than renamed because all ten named utilities have
           * ZERO uses across both repos (measured), and once corrected most
           * would have been redundant aliases of utilities that already work
           * — `text-text-primary` for `text-[var(--appkit-color-text)]`. A
           * config entry that advertises a utility which silently no-ops is a
           * trap for whoever writes the natural-looking class next; an absent
           * entry is a compile-time nothing they will notice immediately.
           *
           * `surface-elevated` is kept because it names a real, distinct token
           * that no other utility reaches — with its var spelled correctly.
           */
          surface: "var(--appkit-color-surface)",
          "surface-elevated": "var(--appkit-color-surface-elevated)",
          border: "var(--appkit-color-border)",
          // State — semantic colors with surface sub-keys
          success: {
            DEFAULT: "var(--appkit-color-success)",
            surface: "var(--appkit-color-success-surface)",
          },
          warning: {
            DEFAULT: "var(--appkit-color-warning)",
            surface: "var(--appkit-color-warning-surface)",
          },
          error: {
            DEFAULT: "var(--appkit-color-error)",
            surface: "var(--appkit-color-error-surface)",
          },
          danger: "var(--appkit-color-error)",
          info: {
            DEFAULT: "var(--appkit-color-info)",
            surface: "var(--appkit-color-info-surface)",
          },
        },
        ...((consumerTheme.extend as Record<string, unknown>) ?? {}),
      },
      ...Object.fromEntries(
        Object.entries(consumerTheme).filter(([k]) => k !== "extend"),
      ),
    },
    plugins: [...consumerPlugins],
    ...rest,
  };
}
