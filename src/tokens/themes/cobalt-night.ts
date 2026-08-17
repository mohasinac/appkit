import type { ThemeRecord } from "./types";
import { DEFAULT_DARK_THEME } from "./default-dark";

/**
 * Theme template — Cobalt Night. Keeps a cobalt-blue primary but pairs it
 * with a deep-blue dark surface — a distinct alternate dark palette from the
 * built-in `default-dark` (crimson + cyan since 2026-08-17). Mirrors the
 * `[data-theme="cobalt-night"]` block in `appkit/src/tokens/tokens.css`.
 *
 * Not a built-in (`builtIn: false`) — seeded into `siteSettings.theme.themes`
 * as a selectable starting point admins can assign as the default dark theme
 * or clone from `ThemeManagerView`. Only overrides the tokens the CSS block
 * itself overrides; every other token (spacing, fonts, unredefined gradients)
 * falls back to `DEFAULT_DARK_THEME`'s values, same pattern the CSS block uses
 * against `:root`.
 *
 * Drift between this file and `tokens.css` is detected by
 * `scripts/audit-theme-drift.mjs`.
 */
export const COBALT_NIGHT_THEME: ThemeRecord = {
  id: "cobalt-night",
  name: "Cobalt Night",
  mode: "dark",
  builtIn: false,
  tokens: {
    "appkit-color-primary": "#5992ff",
    "appkit-color-primary-500": "#5992ff",
    "appkit-color-primary-600": "#3570fc",
    "appkit-color-secondary": "#84e122",
    "appkit-color-secondary-500": "#84e122",

    "appkit-color-bg": "#111e58",
    "appkit-color-surface": "#1536b4",
    "appkit-color-surface-elevated": "rgba(21, 54, 180, 0.9)",
    "appkit-color-surface-input": "rgba(24, 49, 142, 0.6)",

    "appkit-color-border": "#1343de",
    "appkit-color-border-subtle": "rgba(24, 49, 142, 0.6)",

    "appkit-color-text": "#eef5ff",
    "appkit-color-text-muted": "#bcd4ff",
    "appkit-color-text-faint": "#8eb9ff",

    "appkit-color-success": "#4ade80",
    "appkit-color-success-surface": "rgba(20, 83, 45, 0.3)",
    "appkit-color-warning": "#fbbf24",
    "appkit-color-warning-surface": "rgba(120, 53, 15, 0.3)",
    "appkit-color-error": "#f87171",
    "appkit-color-error-surface": "rgba(127, 29, 29, 0.3)",
    "appkit-color-info": "#38bdf8",
    "appkit-color-info-surface": "rgba(12, 74, 110, 0.3)",

    "appkit-color-focus-ring": "#8eb9ff",
    "appkit-shadow-glow":
      "0 0 0 1px rgba(89,146,255,0.18), 0 4px 16px -4px rgba(89,146,255,0.30)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(89,146,255,0.18), 0 4px 20px -4px rgba(89,146,255,0.30)",
  },
  gradients: { ...DEFAULT_DARK_THEME.gradients },
};
