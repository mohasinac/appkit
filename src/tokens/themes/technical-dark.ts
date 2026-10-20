import type { ThemeRecord } from "./types";
import { DEFAULT_DARK_THEME } from "./default-dark";

/**
 * Theme template — Technical Dark.
 *
 * A developer-tool identity rather than a marketing one: a near-black graphite
 * base, ONE elevation step, hairline borders, and accents drawn from a syntax
 * palette (keyword violet, string green, number amber, error red) reused
 * semantically for difficulty badges, submission verdicts and status chips.
 *
 * Deliberately different from `default-dark` (crimson + cyan on navy): there is
 * no brand gradient wash, surfaces sit close together in luminance, and the
 * type stack is mono-forward — `display`/`sans` are monospace for headings,
 * labels, IDs and tables, while `editorial` carries a real reading face so
 * 2,000-word lessons stay comfortable. That three-slot split is why no separate
 * "prose font" token was needed.
 *
 * Not a built-in (`builtIn: false`) — seeded as a selectable template that an
 * admin can assign as the default dark theme or clone from `ThemeManagerView`.
 * Only overrides the tokens the matching CSS block overrides; everything else
 * (spacing, font sizes, unredefined gradients) falls back to
 * `DEFAULT_DARK_THEME`, the same way the CSS block cascades from `:root`.
 *
 * Contrast against `appkit-color-bg` (#0b0d10), measured not estimated:
 * text 15.82:1, muted 7.72:1, faint 4.68:1, primary 6.53:1, and every status
 * colour ≥ 4.5:1 (lowest: error 7.01:1). Nothing here is AA-large-only.
 *
 * Mirrors the `[data-theme="technical-dark"]` block in
 * `appkit/src/tokens/tokens.css`; the two must stay byte-identical.
 */
export const TECHNICAL_DARK_THEME: ThemeRecord = {
  id: "technical-dark",
  name: "Technical Dark",
  mode: "dark",
  builtIn: false,
  tokens: {
    // Brand — keyword violet. Chosen because it reads as "syntax", not
    // "product", and sits far from every status hue below.
    "appkit-color-primary": "#7c8cff",
    "appkit-color-primary-50": "#eef0ff",
    "appkit-color-primary-100": "#e0e4ff",
    "appkit-color-primary-200": "#c7cdff",
    "appkit-color-primary-300": "#a5aeff",
    "appkit-color-primary-400": "#8e99ff",
    "appkit-color-primary-500": "#7c8cff",
    "appkit-color-primary-600": "#5a68e8",
    "appkit-color-primary-700": "#4650c4",
    "appkit-color-primary-800": "#373f9c",
    "appkit-color-primary-900": "#2b317a",
    "appkit-color-primary-950": "#171a45",

    // Secondary — string green.
    "appkit-color-secondary": "#56d39a",
    "appkit-color-secondary-50": "#ecfdf5",
    "appkit-color-secondary-100": "#d1fae5",
    "appkit-color-secondary-200": "#a7f3d0",
    "appkit-color-secondary-300": "#7ee7b8",
    "appkit-color-secondary-400": "#56d39a",
    "appkit-color-secondary-500": "#34b87d",
    "appkit-color-secondary-600": "#1f9664",
    "appkit-color-secondary-700": "#187752",
    "appkit-color-secondary-800": "#155e42",
    "appkit-color-secondary-900": "#124b36",
    "appkit-color-secondary-950": "#062a1d",

    // Surfaces — one elevation step, hairline borders. Editor chrome.
    "appkit-color-bg": "#0b0d10",
    "appkit-color-surface": "#13161b",
    "appkit-color-surface-elevated": "rgba(19, 22, 27, 0.92)",
    "appkit-color-surface-input": "rgba(27, 31, 38, 0.7)",
    "appkit-color-surface-hover": "rgba(148, 163, 184, 0.1)",
    "appkit-color-surface-raised": "rgba(27, 31, 38, 0.8)",
    "appkit-color-primary-surface": "rgba(124, 140, 255, 0.16)",
    "appkit-color-border": "#242a33",
    "appkit-color-border-subtle": "rgba(36, 42, 51, 0.6)",

    "appkit-color-text": "#e4e8ee",
    "appkit-color-text-muted": "#9aa4b2",
    // 4.68:1 — clears AA at body size, so faint metadata is still readable
    // rather than merely decorative.
    "appkit-color-text-faint": "#747d8c",
    // Dark ink on the violet fill: 6.53:1, where white measures only 2.98:1
    // and would fail. This is why primary is not simply paired with white.
    "appkit-color-text-on-primary": "#0b0d10",

    "appkit-color-success": "#4ade80",
    "appkit-color-success-surface": "rgba(22, 101, 68, 0.22)",
    "appkit-color-warning": "#f2b544",
    "appkit-color-warning-surface": "rgba(120, 78, 10, 0.22)",
    "appkit-color-error": "#ff6b6b",
    "appkit-color-error-surface": "rgba(140, 30, 30, 0.22)",
    "appkit-color-info": "#58b4ff",
    "appkit-color-info-surface": "rgba(12, 74, 110, 0.22)",

    // Amber, deliberately NOT any status or brand hue: a focus ring that
    // doubles as an error colour is unreadable on an invalid field.
    "appkit-color-focus-ring": "#ffb86b",

    // Flatter than the default theme's glow — editor chrome, not neon.
    "appkit-shadow-glow":
      "0 0 0 1px rgba(124,140,255,0.14), 0 4px 16px -6px rgba(124,140,255,0.2)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(86,211,154,0.14), 0 4px 18px -6px rgba(86,211,154,0.22)",

    /*
     * Mono-forward: headings, labels, IDs, nav and tables are monospace;
     * `editorial` is the reading face for lessons and blog prose.
     *
     * The optional consumer-supplied face is `--font-code` (e.g. a next/font
     * loader variable). Two traps are deliberately avoided here:
     *   - it is NOT named `--font-mono`, because consumers commonly map that
     *     Tailwind theme key to `--appkit-font-mono` — which would be a
     *     circular reference, and a cycle invalidates the declaration;
     *   - every var() carries an in-place fallback, because a bare
     *     `var(--undefined)` does NOT fall through to the next family in the
     *     comma list — it invalidates the whole declaration, silently
     *     dropping the UI back to the browser default.
     * Both of those were live bugs on the deployed site before this comment.
     */
    "appkit-font-display":
      "var(--font-code, \"JetBrains Mono\"), \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Consolas, monospace",
    "appkit-font-sans":
      "var(--font-code, \"JetBrains Mono\"), \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Consolas, monospace",
    "appkit-font-editorial":
      "var(--font-body, ui-sans-serif), system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
    "appkit-font-mono":
      "var(--font-code, \"JetBrains Mono\"), \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Consolas, monospace",
  },
  gradients: { ...DEFAULT_DARK_THEME.gradients },
};
