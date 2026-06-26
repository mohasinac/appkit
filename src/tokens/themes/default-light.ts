import type { ThemeRecord } from "./types";

/**
 * Built-in light theme — cobalt blue primary + lime green secondary.
 * Mirrors the `:root` block in `appkit/src/tokens/tokens.css`.
 * Cannot be deleted; can be cloned by the admin into a new theme.
 *
 * Drift between this file and `tokens.css` is detected by
 * `scripts/audit-theme-drift.mjs`.
 */
export const DEFAULT_LIGHT_THEME: ThemeRecord = {
  id: "default-light",
  name: "Default Light (Cobalt + Lime)",
  mode: "light",
  builtIn: true,
  tokens: {
    "appkit-color-primary": "#3570fc",
    "appkit-color-primary-50": "#eef5ff",
    "appkit-color-primary-100": "#d9e8ff",
    "appkit-color-primary-200": "#bcd4ff",
    "appkit-color-primary-300": "#8eb9ff",
    "appkit-color-primary-400": "#5992ff",
    "appkit-color-primary-500": "#3570fc",
    "appkit-color-primary-600": "#1a55f2",
    "appkit-color-primary-700": "#1343de",
    "appkit-color-primary-800": "#1536b4",
    "appkit-color-primary-900": "#18318e",
    "appkit-color-primary-950": "#111e58",

    "appkit-color-secondary": "#65c408",
    "appkit-color-secondary-50": "#f3ffe3",
    "appkit-color-secondary-100": "#e4ffc5",
    "appkit-color-secondary-200": "#c8ff90",
    "appkit-color-secondary-300": "#a3f550",
    "appkit-color-secondary-400": "#84e122",
    "appkit-color-secondary-500": "#65c408",
    "appkit-color-secondary-600": "#509c02",
    "appkit-color-secondary-700": "#3e7708",
    "appkit-color-secondary-800": "#345e0d",
    "appkit-color-secondary-900": "#2c5011",
    "appkit-color-secondary-950": "#142d03",

    "appkit-color-cobalt": "#3570fc",
    "appkit-color-accent": "#8393b2",

    "appkit-color-bg": "#fafafa",
    "appkit-color-surface": "#ffffff",
    "appkit-color-surface-elevated": "#ffffff",
    "appkit-color-surface-input": "#ffffff",
    "appkit-color-border": "#e4e4e7",
    "appkit-color-border-subtle": "#f4f4f5",
    "appkit-color-text": "#18181b",
    "appkit-color-text-muted": "#71717a",
    "appkit-color-text-faint": "#a1a1aa",
    "appkit-color-text-on-primary": "#ffffff",

    "appkit-color-success": "#059669",
    "appkit-color-success-surface": "#ecfdf5",
    "appkit-color-warning": "#d97706",
    "appkit-color-warning-surface": "#fffbeb",
    "appkit-color-error": "#dc2626",
    "appkit-color-error-surface": "#fef2f2",
    "appkit-color-info": "#0284c7",
    "appkit-color-info-surface": "#f0f9ff",
    "appkit-color-star": "#facc15",
    "appkit-color-whatsapp-light": "#1ebe5d",
    "appkit-color-whatsapp-bg": "#ECE5DD",

    "appkit-color-focus-ring": "#3570fc",

    "appkit-shadow-glow":
      "0 0 0 1px rgba(53,112,252,0.10), 0 4px 16px -4px rgba(53,112,252,0.20)",
    "appkit-shadow-glow-pink":
      "0 0 0 1px rgba(233,30,140,0.12), 0 4px 16px -4px rgba(233,30,140,0.22)",

    "appkit-font-display":
      "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
    "appkit-font-sans":
      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
    "appkit-font-mono":
      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",
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
  },
};
