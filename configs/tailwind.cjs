// appkit/configs/tailwind.cjs — hand-written CJS sidecar for defineTailwindConfig.
//
// SOURCE-MODE COUNTERPART: appkit/src/configs/tailwind.ts is the ESM/TS twin
// that builds into dist/configs/tailwind.js for package-mode consumers. This
// .cjs file is what consumer tailwind.config.js loads directly in source-mode.
// KEEP THE TWO IN SYNC.

"use strict";

// NOTE (Tailwind v4 migration, 2026-08-16): `safelist` is NOT supported by the
// v4 `@config` compat bridge. Safelist classes live in the consumer's CSS entry
// point via `@source inline("...")` instead — see src/app/globals.css. Do not
// re-add a `safelist` key here; it would silently no-op under v4.

function defineTailwindConfig(override = {}) {
  const {
    content: consumerContent = [],
    theme: consumerTheme = {},
    plugins: consumerPlugins = [],
    ...rest
  } = override;

  return {
    darkMode: "class",
    content: [...consumerContent],
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
          // Two pairings per status, and they are NOT interchangeable:
          //   chip    -> bg-{status}-surface + text-{status}
          //   overlay -> bg-{status}-solid   + text-{status}-on-solid
          // `surface`/DEFAULT invert with the theme; `solid`/`on-solid` do
          // not. Mixing a `surface`/DEFAULT background with a literal
          // `text-white` is invisible in exactly one theme — enforced by
          // scripts/audit-status-color-pairs.mjs.
          success: {
            DEFAULT: "var(--appkit-color-success)",
            surface: "var(--appkit-color-success-surface)",
            solid: "var(--appkit-color-success-solid)",
            "on-solid": "var(--appkit-color-success-on-solid)",
          },
          warning: {
            DEFAULT: "var(--appkit-color-warning)",
            surface: "var(--appkit-color-warning-surface)",
            solid: "var(--appkit-color-warning-solid)",
            "on-solid": "var(--appkit-color-warning-on-solid)",
          },
          error: {
            DEFAULT: "var(--appkit-color-error)",
            surface: "var(--appkit-color-error-surface)",
            solid: "var(--appkit-color-error-solid)",
            "on-solid": "var(--appkit-color-error-on-solid)",
          },
          // `danger` is a bare alias of `error` and therefore has NO
          // `-surface`/`-solid` sub-keys. It also does not survive into the
          // consumer build at all (the consumer's `extend.colors` replaces
          // this whole object), so `bg-danger-surface` / `text-danger` are
          // dead classes in the app — the audit blocks them; use `error-*`.
          danger: "var(--appkit-color-error)",
          info: {
            DEFAULT: "var(--appkit-color-info)",
            surface: "var(--appkit-color-info-surface)",
            solid: "var(--appkit-color-info-solid)",
            "on-solid": "var(--appkit-color-info-on-solid)",
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
