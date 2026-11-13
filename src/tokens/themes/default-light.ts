import type { ThemeRecord } from "./types";

/**
 * Built-in light theme — blue primary + gold secondary-highlight.
 * Refreshed 2026-11-06 from the previous teal+magenta identity to the new
 * owner-approved brand palette: a saturated royal blue body colour paired
 * with a warm metallic-gold accent, matching the new navy+gold dark theme
 * (gold carries through both modes as one consistent accent identity).
 * Mirrors the `:root` block in `appkit/src/tokens/tokens.css`.
 * Cannot be deleted; can be cloned by the admin into a new theme.
 *
 * Drift between this file and `tokens.css` is detected by
 * `scripts/audit-theme-drift.mjs`.
 */
export const DEFAULT_LIGHT_THEME: ThemeRecord = {
  id: "default-light",
  name: "Default Light (Blue + Gold)",
  mode: "light",
  builtIn: true,
  tokens: {
    "appkit-color-primary": "#0c44ca",
    "appkit-color-primary-50": "#f6f8fe",
    "appkit-color-primary-100": "#dfe8ff",
    "appkit-color-primary-200": "#bfd2fe",
    "appkit-color-primary-300": "#9ab6f9",
    "appkit-color-primary-400": "#7c9eed",
    "appkit-color-primary-500": "#5183f9",
    "appkit-color-primary-600": "#0c44ca",
    "appkit-color-primary-700": "#0c44ca",
    "appkit-color-primary-800": "#1547be",
    "appkit-color-primary-900": "#1b429d",
    "appkit-color-primary-950": "#011d5f",

    "appkit-color-secondary": "#d4af37",
    "appkit-color-secondary-50": "#fffdf5",
    "appkit-color-secondary-100": "#fffaea",
    "appkit-color-secondary-200": "#fef4d3",
    "appkit-color-secondary-300": "#fceab1",
    "appkit-color-secondary-400": "#f9dd83",
    "appkit-color-secondary-500": "#eeca55",
    "appkit-color-secondary-600": "#d4af37",
    "appkit-color-secondary-700": "#b79423",
    "appkit-color-secondary-800": "#95791f",
    "appkit-color-secondary-900": "#7a651f",
    "appkit-color-secondary-950": "#534105",

    "appkit-color-cobalt": "#0d9488",
    "appkit-color-accent": "#8393b2",

    "appkit-color-bg": "#fafafa",
    "appkit-color-surface": "#ffffff",
    "appkit-color-surface-elevated": "#ffffff",
    "appkit-color-surface-input": "#fafafa",
    // Theme-inverting interactive fills. Must stay byte-identical to the
    // matching :root block in tokens.css — audit-theme-drift compares them.
    "appkit-color-surface-hover": "#f4f4f5",
    "appkit-color-surface-raised": "#fafafa",
    "appkit-color-primary-surface": "#f6f8fe",
    "appkit-color-border": "#e4e4e7",
    "appkit-color-border-subtle": "#f4f4f5",
    "appkit-color-text": "#18181b",
    "appkit-color-text-muted": "#52525a",
    "appkit-color-text-faint": "#525259",
    "appkit-color-text-on-primary": "#ffffff",
    "appkit-color-link": "#0f766e",

    "appkit-color-success": "#15803d",
    "appkit-color-success-surface": "#f0fdf4",
    "appkit-color-warning": "#b45309",
    "appkit-color-warning-surface": "#fffbeb",
    "appkit-color-error": "#b91c1c",
    "appkit-color-error-surface": "#fef2f2",
    "appkit-color-info": "#0369a1",
    "appkit-color-info-surface": "#f0f9ff",

    // Generic accents — not status colors, see required.ts's own comment.
    "appkit-color-accent-a": "#4338ca",   // indigo-700 on indigo-50
    "appkit-color-accent-a-surface": "#eef2ff",
    "appkit-color-accent-b": "#be185d",   // pink-700 on pink-50
    "appkit-color-accent-b-surface": "#fdf2f8",
    "appkit-color-accent-c": "#7e22ce",   // purple-700 on purple-50
    "appkit-color-accent-c-surface": "#faf5ff",
    "appkit-color-star": "#facc15",
    "appkit-color-whatsapp-light": "#1ebe5d",
    "appkit-color-whatsapp-bg": "#ECE5DD",
    "appkit-color-whatsapp-dark": "#075E54",

    "appkit-color-focus-ring": "#3570fc",

    "appkit-shadow-glow":
      "0 0 0 1px rgba(53,112,252,0.10), 0 4px 16px -4px rgba(53,112,252,0.20)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(212,175,55,0.12), 0 4px 16px -4px rgba(212,175,55,0.22)",

    "appkit-font-display":
      "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
    "appkit-font-sans":
      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
    "appkit-font-mono":
      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",

    "appkit-space-0-5": "0.125rem",
    "appkit-space-1": "0.25rem",
    "appkit-space-1-5": "0.375rem",
    "appkit-space-2": "0.5rem",
    "appkit-space-2-5": "0.625rem",
    "appkit-space-3": "0.75rem",
    "appkit-space-3-5": "0.875rem",
    "appkit-space-4": "1rem",
    "appkit-space-5": "1.25rem",
    "appkit-space-6": "1.5rem",
    "appkit-space-8": "2rem",
    "appkit-space-10": "2.5rem",
    "appkit-space-12": "3rem",
    "appkit-space-14": "3.5rem",
    "appkit-space-16": "4rem",
    "appkit-space-18": "4.5rem",
    "appkit-space-20": "5rem",
    "appkit-space-24": "6rem",

    "appkit-text-2xs": "0.6875rem",
    "appkit-text-xs": "0.75rem",
    "appkit-text-sm": "0.875rem",
    "appkit-text-base": "1rem",
    "appkit-text-lg": "1.125rem",
    "appkit-text-xl": "1.25rem",
    "appkit-text-2xl": "1.5rem",
    "appkit-text-3xl": "1.875rem",
    "appkit-text-4xl": "2.25rem",
    "appkit-text-5xl": "3rem",
    "appkit-text-6xl": "3.75rem",
    "appkit-text-7xl": "4.5rem",
    "appkit-text-8xl": "6rem",

    "appkit-radius-sm": "0.25rem",
    "appkit-radius-md": "0.375rem",
    "appkit-radius-lg": "0.5rem",
    "appkit-radius-xl": "0.75rem",
    "appkit-radius-2xl": "1rem",
    "appkit-radius-3xl": "1.5rem",
    "appkit-radius-card": "1rem",
    "appkit-radius-btn": "0.75rem",
    "appkit-radius-full": "9999px",

    "appkit-tracking-tighter": "-0.02em",
    "appkit-tracking-tight": "-0.011em",
    "appkit-tracking-normal": "0em",
    "appkit-tracking-wide": "0.025em",
    "appkit-tracking-wider": "0.05em",

    "appkit-duration-fast": "150ms",
    "appkit-duration-base": "200ms",
    "appkit-duration-slow": "300ms",
    "appkit-duration-slower": "400ms",
    "appkit-ease-default": "cubic-bezier(0.4, 0, 0.2, 1)",
    "appkit-ease-in": "cubic-bezier(0.4, 0, 1, 1)",
    "appkit-ease-out": "cubic-bezier(0, 0, 0.2, 1)",
  },
  gradients: {
    /*
     * ── READABLE STOPS, PER THEME (owner, 2026-11-13) ──────────────────────
     *
     * 🛑 These gradients are used with `background-clip: text` on display
     * headings — the homepage `<h1>` is `brand-tri` — so every stop is TEXT
     * and must clear the 3.0 large-text floor against this theme's `bg`.
     * Measured on production before the fix:
     *
     *   light  secondary #d4af37  2.01:1   🛑   (and `secondary-500` 1.5:1)
     *   light  accent    #8393b2  2.97:1   🛑
     *
     * The identity is unchanged — blue → gold — only the RUNG of each brand
     * ladder differs per theme, which is the point: a single stop value cannot
     * be readable on both a near-white and a near-black page.
     *
     * ⚠ `accent` is replaced by `info` as the third stop. It had no step in
     * its ramp that clears the floor on this background, and the dark theme
     * already used `info` here — so the two themes were drawing *different*
     * gradients under one name. Unifying them fixes a readability failure and
     * an inconsistency at once.
     */
    brand:
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary-800))",
    "brand-tri":
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary-800), var(--appkit-color-info))",
    accent:
      "linear-gradient(to right, var(--appkit-color-secondary-800), var(--appkit-color-primary))",
    "accent-divider":
      "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
    "page-header":
      "linear-gradient(to bottom right, var(--appkit-color-primary-50), transparent 60%, transparent)",
    "section-warm":
      "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface))",
    "section-cool":
      "linear-gradient(to bottom right, var(--appkit-color-primary-50), var(--appkit-color-info-surface))",
    "section-mesh":
      "radial-gradient(ellipse at top, var(--appkit-color-primary-50), var(--appkit-color-surface), var(--appkit-color-secondary-50))",
    "accent-banner":
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
    promotion:
      "linear-gradient(to bottom right, var(--appkit-color-error), var(--appkit-color-primary), var(--appkit-color-warning))",
    spotlight:
      "linear-gradient(to bottom right, var(--appkit-color-info-surface), var(--appkit-color-bg), var(--appkit-color-info-surface))",
    "whatsapp-card":
      "linear-gradient(135deg, var(--appkit-color-whatsapp) 0%, var(--appkit-color-whatsapp-light) 48%, var(--appkit-color-whatsapp-dark) 100%)",
    glass:
      "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
    "card-indigo":
      "linear-gradient(to bottom right, var(--appkit-color-primary-50), var(--appkit-color-surface), var(--appkit-color-surface))",
    "card-teal":
      "linear-gradient(to bottom right, var(--appkit-color-secondary-50), var(--appkit-color-surface), var(--appkit-color-surface))",
    "card-amber":
      "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
    "card-rose":
      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
    logo:
      "linear-gradient(to right, var(--appkit-color-primary-700) 0%, var(--appkit-color-primary-500) 55%, var(--appkit-color-secondary-400) 100%)",
    sidebar:
      "linear-gradient(to bottom, var(--appkit-color-primary-700), var(--appkit-color-secondary-500))",
  },
};
