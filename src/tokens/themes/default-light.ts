import type { ThemeRecord } from "./types";

/**
 * Built-in light theme — teal-blue primary + magenta secondary-highlight.
 * Rebranded 2026-08-17 from the previous cobalt+lime identity to match the
 * teal/magenta Beyblade reference art supplied for the rebrand (turquoise
 * metallic body + magenta energy-ring highlight + silver accents), paired
 * with the new red/cyan dark theme.
 * Mirrors the `:root` block in `appkit/src/tokens/tokens.css`.
 * Cannot be deleted; can be cloned by the admin into a new theme.
 *
 * Drift between this file and `tokens.css` is detected by
 * `scripts/audit-theme-drift.mjs`.
 */
export const DEFAULT_LIGHT_THEME: ThemeRecord = {
  id: "default-light",
  name: "Default Light (Teal + Magenta)",
  mode: "light",
  builtIn: true,
  tokens: {
    "appkit-color-primary": "#0d9488",
    "appkit-color-primary-50": "#f0fdfa",
    "appkit-color-primary-100": "#ccfbf1",
    "appkit-color-primary-200": "#99f6e4",
    "appkit-color-primary-300": "#5eead4",
    "appkit-color-primary-400": "#2dd4bf",
    "appkit-color-primary-500": "#14b8a6",
    "appkit-color-primary-600": "#0d9488",
    "appkit-color-primary-700": "#0f766e",
    "appkit-color-primary-800": "#115e59",
    "appkit-color-primary-900": "#134e4a",
    "appkit-color-primary-950": "#042f2e",

    "appkit-color-secondary": "#c026d3",
    "appkit-color-secondary-50": "#fdf4ff",
    "appkit-color-secondary-100": "#fae8ff",
    "appkit-color-secondary-200": "#f5d0fe",
    "appkit-color-secondary-300": "#f0abfc",
    "appkit-color-secondary-400": "#e879f9",
    "appkit-color-secondary-500": "#d946ef",
    "appkit-color-secondary-600": "#c026d3",
    "appkit-color-secondary-700": "#a21caf",
    "appkit-color-secondary-800": "#86198f",
    "appkit-color-secondary-900": "#701a75",
    "appkit-color-secondary-950": "#4a044e",

    "appkit-color-cobalt": "#0d9488",
    "appkit-color-accent": "#8393b2",

    "appkit-color-bg": "#fafafa",
    "appkit-color-surface": "#ffffff",
    "appkit-color-surface-elevated": "#ffffff",
    "appkit-color-surface-input": "#ffffff",
    "appkit-color-border": "#e4e4e7",
    "appkit-color-border-subtle": "#f4f4f5",
    "appkit-color-text": "#18181b",
    "appkit-color-text-muted": "#71717a",
    "appkit-color-text-faint": "#87878f",
    "appkit-color-text-on-primary": "#ffffff",

    "appkit-color-success": "#15803d",
    "appkit-color-success-surface": "#f0fdf4",
    "appkit-color-warning": "#b45309",
    "appkit-color-warning-surface": "#fffbeb",
    "appkit-color-error": "#b91c1c",
    "appkit-color-error-surface": "#fef2f2",
    "appkit-color-info": "#0369a1",
    "appkit-color-info-surface": "#f0f9ff",
    "appkit-color-star": "#facc15",
    "appkit-color-whatsapp-light": "#1ebe5d",
    "appkit-color-whatsapp-bg": "#ECE5DD",

    "appkit-color-focus-ring": "#0d9488",

    "appkit-shadow-glow":
      "0 0 0 1px rgba(13,148,136,0.10), 0 4px 16px -4px rgba(13,148,136,0.20)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(192,38,211,0.12), 0 4px 16px -4px rgba(192,38,211,0.22)",

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

    "appkit-text-2xs": "0.625rem",
    "appkit-text-xs": "0.6875rem",
    "appkit-text-sm": "0.8125rem",
    "appkit-text-base": "0.9375rem",
    "appkit-text-lg": "1rem",
    "appkit-text-xl": "1.125rem",
    "appkit-text-2xl": "1.375rem",
    "appkit-text-3xl": "1.625rem",
    "appkit-text-4xl": "1.875rem",
    "appkit-text-5xl": "2.5rem",
  },
  gradients: {
    brand:
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
    "brand-tri":
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary), var(--appkit-color-accent))",
    accent:
      "linear-gradient(to right, var(--appkit-color-cobalt-500, var(--appkit-color-primary)), var(--appkit-color-secondary-500, var(--appkit-color-secondary)))",
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
      "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
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
