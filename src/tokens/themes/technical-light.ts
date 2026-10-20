import type { ThemeRecord } from "./types";
import { DEFAULT_LIGHT_THEME } from "./default-light";

/**
 * Theme template — Technical Light.
 *
 * A true counterpart to `technical-dark`, not an afterthought: same geometry,
 * same mono-forward type stack, same syntax-derived accent *roles* — but every
 * accent is re-darkened for a paper-white ground rather than reused from the
 * dark preset. Reusing them would have been the easy mistake: #7c8cff on
 * #fbfbfa measures 2.88:1, which fails AA outright, so primary drops to
 * #4b5bd6 (5.38:1) and each status hue is darkened to match.
 *
 * Not a built-in (`builtIn: false`). Only overrides the tokens the matching CSS
 * block overrides; everything else falls back to `DEFAULT_LIGHT_THEME`.
 *
 * Contrast against `appkit-color-bg` (#fbfbfa), measured not estimated:
 * text 17.15:1, muted 5.84:1, faint 4.67:1, primary 5.38:1, white-on-primary
 * 5.58:1, and every status colour ≥ 4.5:1 (lowest: success 4.80:1).
 *
 * Mirrors the `[data-theme="technical-light"]` block in
 * `appkit/src/tokens/tokens.css`; the two must stay byte-identical.
 */
export const TECHNICAL_LIGHT_THEME: ThemeRecord = {
  id: "technical-light",
  name: "Technical Light",
  mode: "light",
  builtIn: false,
  tokens: {
    // Same violet ROLE as the dark preset, re-darkened for white.
    "appkit-color-primary": "#4b5bd6",
    "appkit-color-primary-50": "#eef0ff",
    "appkit-color-primary-100": "#e0e4ff",
    "appkit-color-primary-200": "#c7cdff",
    "appkit-color-primary-300": "#a5aeff",
    "appkit-color-primary-400": "#7c8cff",
    "appkit-color-primary-500": "#5a68e8",
    "appkit-color-primary-600": "#4b5bd6",
    "appkit-color-primary-700": "#3b45ad",
    "appkit-color-primary-800": "#2f3789",
    "appkit-color-primary-900": "#262c6d",
    "appkit-color-primary-950": "#151840",

    "appkit-color-secondary": "#0f8f5f",
    "appkit-color-secondary-50": "#ecfdf5",
    "appkit-color-secondary-100": "#d1fae5",
    "appkit-color-secondary-200": "#a7f3d0",
    "appkit-color-secondary-300": "#6ee7b7",
    "appkit-color-secondary-400": "#34b87d",
    "appkit-color-secondary-500": "#0f8f5f",
    "appkit-color-secondary-600": "#0c744d",
    "appkit-color-secondary-700": "#0a5c3d",
    "appkit-color-secondary-800": "#084830",
    "appkit-color-secondary-900": "#063a27",
    "appkit-color-secondary-950": "#032016",

    // Paper white, not pure #fff — pure white against a mono type stack
    // glares at the sizes this UI uses.
    "appkit-color-bg": "#fbfbfa",
    "appkit-color-surface": "#ffffff",
    "appkit-color-surface-elevated": "rgba(255, 255, 255, 0.96)",
    "appkit-color-surface-input": "rgba(244, 244, 242, 0.8)",
    "appkit-color-surface-hover": "rgba(22, 24, 29, 0.05)",
    "appkit-color-surface-raised": "rgba(244, 244, 242, 0.9)",
    "appkit-color-primary-surface": "rgba(75, 91, 214, 0.1)",
    "appkit-color-border": "#e2e2df",
    "appkit-color-border-subtle": "rgba(226, 226, 223, 0.7)",

    "appkit-color-text": "#16181d",
    "appkit-color-text-muted": "#5c6370",
    // #767d89 measured 4.00:1 here — AA for large text only. Darkened so even
    // faint metadata clears AA at body size.
    "appkit-color-text-faint": "#6b7280",
    "appkit-color-text-on-primary": "#ffffff",

    "appkit-color-success": "#13804f",
    "appkit-color-success-surface": "rgba(19, 128, 79, 0.1)",
    "appkit-color-warning": "#9a6400",
    "appkit-color-warning-surface": "rgba(154, 100, 0, 0.1)",
    "appkit-color-error": "#c62828",
    "appkit-color-error-surface": "rgba(198, 40, 40, 0.1)",
    "appkit-color-info": "#0a69b5",
    "appkit-color-info-surface": "rgba(10, 105, 181, 0.1)",

    // Darkened amber. The dark preset's #ffb86b measures 1.65:1 here —
    // effectively an invisible focus ring, which is a keyboard trap.
    "appkit-color-focus-ring": "#b45a00",

    "appkit-shadow-glow":
      "0 0 0 1px rgba(75,91,214,0.14), 0 4px 16px -6px rgba(75,91,214,0.18)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(15,143,95,0.14), 0 4px 18px -6px rgba(15,143,95,0.2)",

    "appkit-font-display":
      "var(--font-mono), \"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Consolas, monospace",
    "appkit-font-sans":
      "var(--font-mono), \"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Consolas, monospace",
    "appkit-font-editorial":
      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
    "appkit-font-mono":
      "var(--font-mono), \"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Consolas, monospace",
  },
  gradients: { ...DEFAULT_LIGHT_THEME.gradients },
};
