/**
 * defineTailwindConfig — appkit-aware Tailwind CSS config factory.
 *
 * appkit ships pre-compiled dist/tailwind-utilities.css covering every class
 * appkit components emit. The consumer's Tailwind config does NOT need to scan
 * node_modules/@mohasinac/appkit/** and does NOT need a safelist.
 *
 * Consumer must provide `content` globs for their own source files.
 *
 * @example
 * ```js
 * // tailwind.config.js
 * const { defineTailwindConfig } = require("@mohasinac/appkit/configs");
 * module.exports = defineTailwindConfig({
 *   content: ["./src/**\/*.{ts,tsx}"],
 * });
 * ```
 */

export interface TailwindConfigOverride {
  content?: string[];
  theme?: Record<string, unknown>;
  plugins?: unknown[];
  safelist?: unknown[];
  [key: string]: unknown;
}

export function defineTailwindConfig(override: TailwindConfigOverride = {}) {
  const {
    content: consumerContent = [],
    theme: consumerTheme = {},
    plugins: consumerPlugins = [],
    safelist: consumerSafelist = [],
    ...rest
  } = override;

  return {
    darkMode: "class" as const,
    content: [...consumerContent],
    safelist: [...consumerSafelist],
    theme: {
      extend: {
        colors: {
          // Brand
          primary: "var(--appkit-color-primary)",
          secondary: "var(--appkit-color-secondary)",
          accent: "var(--appkit-color-accent)",
          // Surface
          surface: "var(--appkit-color-surface)",
          "surface-muted": "var(--appkit-color-surfaceMuted)",
          "surface-elevated": "var(--appkit-color-surfaceElevated)",
          "on-surface": "var(--appkit-color-onSurface)",
          "on-surface-muted": "var(--appkit-color-onSurfaceMuted)",
          border: "var(--appkit-color-border)",
          "border-strong": "var(--appkit-color-borderStrong)",
          divider: "var(--appkit-color-divider)",
          // Text
          "text-primary": "var(--appkit-color-textPrimary)",
          "text-secondary": "var(--appkit-color-textSecondary)",
          "text-tertiary": "var(--appkit-color-textTertiary)",
          "text-disabled": "var(--appkit-color-textDisabled)",
          "text-inverse": "var(--appkit-color-textInverse)",
          link: "var(--appkit-color-link)",
          "link-hover": "var(--appkit-color-linkHover)",
          // State
          success: "var(--appkit-color-success)",
          warning: "var(--appkit-color-warning)",
          danger: "var(--appkit-color-danger)",
          info: "var(--appkit-color-info)",
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
