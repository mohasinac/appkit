// appkit/configs/tailwind.cjs — hand-written CJS sidecar for defineTailwindConfig.
//
// SOURCE-MODE COUNTERPART: appkit/src/configs/tailwind.ts is the ESM/TS twin
// that builds into dist/configs/tailwind.js for package-mode consumers. This
// .cjs file is what consumer tailwind.config.js loads directly in source-mode.
// KEEP THE TWO IN SYNC.

"use strict";

function defineTailwindConfig(override = {}) {
  const {
    content: consumerContent = [],
    theme: consumerTheme = {},
    plugins: consumerPlugins = [],
    safelist: consumerSafelist = [],
    ...rest
  } = override;

  return {
    darkMode: "class",
    content: [...consumerContent],
    safelist: [...consumerSafelist],
    theme: {
      extend: {
        colors: {
          primary: "var(--appkit-color-primary)",
          secondary: "var(--appkit-color-secondary)",
          accent: "var(--appkit-color-accent)",
          surface: "var(--appkit-color-surface)",
          "surface-muted": "var(--appkit-color-surfaceMuted)",
          "surface-elevated": "var(--appkit-color-surfaceElevated)",
          "on-surface": "var(--appkit-color-onSurface)",
          "on-surface-muted": "var(--appkit-color-onSurfaceMuted)",
          border: "var(--appkit-color-border)",
          "border-strong": "var(--appkit-color-borderStrong)",
          divider: "var(--appkit-color-divider)",
          "text-primary": "var(--appkit-color-textPrimary)",
          "text-secondary": "var(--appkit-color-textSecondary)",
          "text-tertiary": "var(--appkit-color-textTertiary)",
          "text-disabled": "var(--appkit-color-textDisabled)",
          "text-inverse": "var(--appkit-color-textInverse)",
          link: "var(--appkit-color-link)",
          "link-hover": "var(--appkit-color-linkHover)",
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
        ...((consumerTheme.extend) ?? {}),
      },
      ...Object.fromEntries(
        Object.entries(consumerTheme).filter(([k]) => k !== "extend"),
      ),
    },
    plugins: [...consumerPlugins],
    ...rest,
  };
}

module.exports = { defineTailwindConfig };
