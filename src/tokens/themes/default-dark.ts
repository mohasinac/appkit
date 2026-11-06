import type { ThemeRecord } from "./types";

/**
 * Built-in dark theme — navy primary + gold secondary-highlight.
 * Refreshed 2026-11-06 from the previous crimson+cyan identity to the new
 * owner-approved brand palette: a deep, rich navy body colour paired with
 * the same warm metallic-gold accent used by the light theme, so the gold
 * identity carries through both modes consistently.
 * Mirrors the `[data-theme="dark"]` block in `appkit/src/tokens/tokens.css`.
 * Cannot be deleted; can be cloned by the admin into a new theme.
 *
 * Drift between this file and `tokens.css` is detected by
 * `scripts/audit-theme-drift.mjs`.
 */
export const DEFAULT_DARK_THEME: ThemeRecord = {
  id: "default-dark",
  name: "Default Dark (Navy + Gold)",
  mode: "dark",
  builtIn: true,
  tokens: {
    "appkit-color-primary": "#1e3a8a",
    "appkit-color-primary-50": "#ebeffb",
    "appkit-color-primary-100": "#d0dbfb",
    "appkit-color-primary-200": "#a8bdfb",
    "appkit-color-primary-300": "#6e90f4",
    "appkit-color-primary-400": "#1f52e4",
    "appkit-color-primary-500": "#1e3a8a",
    "appkit-color-primary-600": "#20346e",
    "appkit-color-primary-700": "#192a5b",
    "appkit-color-primary-800": "#17254c",
    "appkit-color-primary-900": "#16213f",
    "appkit-color-primary-950": "#091022",

    "appkit-color-secondary": "#695617",
    "appkit-color-secondary-50": "#fffbef",
    "appkit-color-secondary-100": "#faf3dc",
    "appkit-color-secondary-200": "#f1e5c0",
    "appkit-color-secondary-300": "#e7d394",
    "appkit-color-secondary-400": "#d6bb62",
    "appkit-color-secondary-500": "#d4af37",
    "appkit-color-secondary-600": "#b9982b",
    "appkit-color-secondary-700": "#977e2a",
    "appkit-color-secondary-800": "#7d6a2c",
    "appkit-color-secondary-900": "#6a5b2a",
    "appkit-color-secondary-950": "#483c15",

    "appkit-color-bg": "#020617",
    "appkit-color-surface": "#0f172a",
    "appkit-color-surface-elevated": "#1e293b",
    "appkit-color-surface-input": "#0b1220",
    // Theme-inverting interactive fills. Must stay byte-identical to the
    // [data-theme="default-dark"] block in tokens.css — audit-theme-drift
    // compares them.
    "appkit-color-surface-hover": "rgba(148, 163, 184, 0.12)",
    "appkit-color-surface-raised": "rgba(30, 41, 59, 0.7)",
    "appkit-color-primary-surface": "rgba(30, 58, 138, 0.16)",
    "appkit-color-border": "#334155",
    "appkit-color-border-subtle": "rgba(30, 41, 59, 0.6)",
    "appkit-color-text": "#fafafa",
    "appkit-color-text-muted": "#b4b4bd",
    "appkit-color-text-faint": "#b3b3b9",
    "appkit-color-link": "#22d3ee",

    "appkit-color-success": "#34d399",
    "appkit-color-success-surface": "rgba(6, 78, 59, 0.25)",
    "appkit-color-warning": "#fbbf24",
    "appkit-color-warning-surface": "#1c1508",
    "appkit-color-error": "#fb7185",
    "appkit-color-error-surface": "rgba(127, 29, 29, 0.25)",
    "appkit-color-info": "#38bdf8",
    "appkit-color-info-surface": "rgba(12, 74, 110, 0.25)",

    // Generic accents — not status colors, see required.ts's own comment.
    "appkit-color-accent-a": "#818cf8",   // indigo-400 on indigo-900 tint
    "appkit-color-accent-a-surface": "rgba(49, 46, 129, 0.25)",
    "appkit-color-accent-b": "#f472b6",   // pink-400 on pink-900 tint
    "appkit-color-accent-b-surface": "rgba(131, 24, 67, 0.25)",
    "appkit-color-accent-c": "#c084fc",   // purple-400 on purple-900 tint
    "appkit-color-accent-c-surface": "rgba(88, 28, 135, 0.25)",

    "appkit-color-focus-ring": "#1f52e4",

    "appkit-shadow-glow":
      "0 0 0 1px rgba(31,82,228,0.12), 0 4px 16px -4px rgba(31,82,228,0.22)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(212,175,55,0.14), 0 4px 20px -4px rgba(212,175,55,0.28)",

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
  },
  gradients: {
    brand:
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
    "brand-tri":
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary), var(--appkit-color-info))",
    accent:
      "linear-gradient(to right, var(--appkit-color-secondary), var(--appkit-color-primary))",
    "accent-divider":
      "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
    "page-header":
      "linear-gradient(to bottom right, rgba(30,58,138,0.10), transparent 60%, transparent)",
    "section-warm":
      "linear-gradient(to bottom right, var(--appkit-color-warning-surface), transparent)",
    "section-cool":
      "linear-gradient(to bottom right, rgba(212,175,55,0.10), transparent)",
    "section-mesh":
      "radial-gradient(ellipse at top, rgba(30,58,138,0.10), var(--appkit-color-surface), rgba(212,175,55,0.08))",
    "accent-banner":
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
    promotion:
      "linear-gradient(to bottom right, var(--appkit-color-error), var(--appkit-color-primary), var(--appkit-color-warning))",
    spotlight:
      "linear-gradient(to bottom right, rgba(212,175,55,0.10), var(--appkit-color-bg), rgba(212,175,55,0.10))",
    "whatsapp-card":
      "linear-gradient(135deg, var(--appkit-color-whatsapp) 0%, var(--appkit-color-whatsapp-light) 48%, var(--appkit-color-whatsapp-dark) 100%)",
    glass:
      "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
    "card-indigo":
      "linear-gradient(to bottom right, rgba(30,58,138,0.10), var(--appkit-color-surface), var(--appkit-color-surface))",
    "card-teal":
      "linear-gradient(to bottom right, rgba(212,175,55,0.10), var(--appkit-color-surface), var(--appkit-color-surface))",
    "card-amber":
      "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
    "card-rose":
      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
    logo:
      "linear-gradient(to right, var(--appkit-color-primary-300) 0%, var(--appkit-color-primary-400) 55%, var(--appkit-color-secondary) 100%)",
    sidebar:
      "linear-gradient(to bottom, var(--appkit-color-primary), var(--appkit-color-secondary))",
  },
};
