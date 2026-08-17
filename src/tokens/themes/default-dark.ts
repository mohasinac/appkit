import type { ThemeRecord } from "./types";

/**
 * Built-in dark theme — crimson red unified primary + cyan secondary-highlight.
 * Rebranded 2026-08-17 from the previous hot-pink identity to match the
 * red/cyan "Meteo L-Drago"-style Beyblade reference art supplied for the
 * rebrand (red metallic body + cyan energy-ring highlight + silver accents).
 * Mirrors the `[data-theme="dark"]` block in `appkit/src/tokens/tokens.css`.
 * Cannot be deleted; can be cloned by the admin into a new theme.
 *
 * Drift between this file and `tokens.css` is detected by
 * `scripts/audit-theme-drift.mjs`.
 */
export const DEFAULT_DARK_THEME: ThemeRecord = {
  id: "default-dark",
  name: "Default Dark (Crimson + Cyan)",
  mode: "dark",
  builtIn: true,
  tokens: {
    "appkit-color-primary": "#ef4444",
    "appkit-color-primary-50": "#fef2f2",
    "appkit-color-primary-100": "#fee2e2",
    "appkit-color-primary-200": "#fecaca",
    "appkit-color-primary-300": "#fca5a5",
    "appkit-color-primary-400": "#f87171",
    "appkit-color-primary-500": "#ef4444",
    "appkit-color-primary-600": "#dc2626",
    "appkit-color-primary-700": "#b91c1c",
    "appkit-color-primary-800": "#991b1b",
    "appkit-color-primary-900": "#7f1d1d",
    "appkit-color-primary-950": "#450a0a",

    "appkit-color-secondary": "#06b6d4",
    "appkit-color-secondary-50": "#ecfeff",
    "appkit-color-secondary-100": "#cffafe",
    "appkit-color-secondary-200": "#a5f3fc",
    "appkit-color-secondary-300": "#67e8f9",
    "appkit-color-secondary-400": "#22d3ee",
    "appkit-color-secondary-500": "#06b6d4",
    "appkit-color-secondary-600": "#0891b2",
    "appkit-color-secondary-700": "#0e7490",
    "appkit-color-secondary-800": "#155e75",
    "appkit-color-secondary-900": "#164e63",
    "appkit-color-secondary-950": "#083344",

    "appkit-color-bg": "#020617",
    "appkit-color-surface": "#0f172a",
    "appkit-color-surface-elevated": "rgba(15, 23, 42, 0.9)",
    "appkit-color-surface-input": "rgba(30, 41, 59, 0.6)",
    "appkit-color-border": "#334155",
    "appkit-color-border-subtle": "rgba(30, 41, 59, 0.6)",
    "appkit-color-text": "#fafafa",
    "appkit-color-text-muted": "#a1a1aa",
    "appkit-color-text-faint": "#71717a",

    "appkit-color-success": "#34d399",
    "appkit-color-success-surface": "rgba(6, 78, 59, 0.25)",
    "appkit-color-warning": "#fbbf24",
    "appkit-color-warning-surface": "#1c1508",
    "appkit-color-error": "#fb7185",
    "appkit-color-error-surface": "rgba(127, 29, 29, 0.25)",
    "appkit-color-info": "#38bdf8",
    "appkit-color-info-surface": "rgba(12, 74, 110, 0.25)",

    "appkit-color-focus-ring": "#f87171",

    "appkit-shadow-glow":
      "0 0 0 1px rgba(239,68,68,0.12), 0 4px 16px -4px rgba(239,68,68,0.22)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(6,182,212,0.14), 0 4px 20px -4px rgba(6,182,212,0.28)",

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
    "appkit-text-xs": "0.75rem",
    "appkit-text-sm": "0.875rem",
    "appkit-text-base": "1rem",
    "appkit-text-lg": "1.125rem",
    "appkit-text-xl": "1.25rem",
    "appkit-text-2xl": "1.5rem",
    "appkit-text-3xl": "1.875rem",
    "appkit-text-4xl": "2.25rem",
    "appkit-text-5xl": "3rem",
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
      "linear-gradient(to bottom right, rgba(239,68,68,0.10), transparent 60%, transparent)",
    "section-warm":
      "linear-gradient(to bottom right, var(--appkit-color-warning-surface), transparent)",
    "section-cool":
      "linear-gradient(to bottom right, rgba(6,182,212,0.10), transparent)",
    "section-mesh":
      "radial-gradient(ellipse at top, rgba(239,68,68,0.10), var(--appkit-color-surface), rgba(6,182,212,0.08))",
    "accent-banner":
      "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
    promotion:
      "linear-gradient(to bottom right, var(--appkit-color-error), var(--appkit-color-primary), var(--appkit-color-warning))",
    spotlight:
      "linear-gradient(to bottom right, rgba(6,182,212,0.10), var(--appkit-color-bg), rgba(6,182,212,0.10))",
    "whatsapp-card":
      "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
    glass:
      "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
    "card-indigo":
      "linear-gradient(to bottom right, rgba(239,68,68,0.10), var(--appkit-color-surface), var(--appkit-color-surface))",
    "card-teal":
      "linear-gradient(to bottom right, rgba(6,182,212,0.10), var(--appkit-color-surface), var(--appkit-color-surface))",
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
