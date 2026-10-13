import type { ThemeRecord } from "./types";
import { DEFAULT_LIGHT_THEME } from "./default-light";

/**
 * Theme template — Sunset. Warm amber primary + rose secondary on a
 * deep-rose-tinted light body — a daytime warm palette alternative to the
 * default cobalt+lime. Mirrors the `[data-theme="sunset"]` block in
 * `appkit/src/tokens/tokens.css`.
 *
 * Not a built-in (`builtIn: false`) — seeded into `siteSettings.theme.themes`
 * as a selectable starting point admins can assign as the default light
 * theme or clone from `ThemeManagerView`. Only overrides the tokens the CSS
 * block itself overrides; every other token (spacing, fonts, unredefined
 * gradients) falls back to `DEFAULT_LIGHT_THEME`'s values, same pattern the
 * CSS block uses against `:root`.
 *
 * Drift between this file and `tokens.css` is detected by
 * `scripts/audit-theme-drift.mjs`.
 */
export const SUNSET_THEME: ThemeRecord = {
  id: "sunset",
  name: "Sunset",
  mode: "light",
  builtIn: false,
  tokens: {
    "appkit-color-primary": "#f59e0b",
    "appkit-color-primary-500": "#f59e0b",
    "appkit-color-primary-600": "#d97706",
    /*
     * 🛑 D7 — DARK ink on this primary, declared rather than inherited.
     *
     * The light base's `text-on-primary` is `#ffffff`, and white on amber
     * `#f59e0b` measures **2.15:1** — under the 3:1 AA threshold for
     * large/UI text, so every primary button, badge and pill in this theme was
     * unreadable. It survived because the pair was INHERITED: `audit-a11y`
     * treated a token this theme does not declare as "nothing to check", which
     * is exactly the pairing a brand theme is most likely to break (a new
     * brand colour under somebody else's ink).
     *
     * `#431407` is this theme's own `text` token, so the fix introduces no new
     * colour: **7.29:1** on `primary` and **4.91:1** on `primary-600`, which is
     * the darker shade a hover state uses — both clear AA for normal text, not
     * just the 3:1 this pair is held to.
     */
    "appkit-color-text-on-primary": "#431407",
    "appkit-color-secondary": "#f43f5e",
    "appkit-color-secondary-500": "#f43f5e",

    "appkit-color-bg": "#fff7ed",
    "appkit-color-surface": "#ffffff",
    "appkit-color-surface-elevated": "#ffffff",
    "appkit-color-surface-input": "#fffbeb",

    "appkit-color-border": "#fed7aa",
    "appkit-color-border-subtle": "#ffedd5",

    "appkit-color-text": "#431407",
    "appkit-color-text-muted": "#9a3412",
    "appkit-color-text-faint": "#c2410c",

    "appkit-color-success": "#15803d",
    "appkit-color-success-surface": "#f0fdf4",
    "appkit-color-warning": "#b45309",
    "appkit-color-warning-surface": "#fef3c7",
    "appkit-color-error": "#b91c1c",
    "appkit-color-error-surface": "#fef2f2",
    "appkit-color-info": "#0369a1",
    "appkit-color-info-surface": "#f0f9ff",

    "appkit-color-focus-ring": "#f59e0b",
    "appkit-shadow-glow":
      "0 0 0 1px rgba(245,158,11,0.18), 0 4px 16px -4px rgba(245,158,11,0.30)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(244,63,94,0.18), 0 4px 20px -4px rgba(244,63,94,0.30)",
  },
  gradients: { ...DEFAULT_LIGHT_THEME.gradients },
};
