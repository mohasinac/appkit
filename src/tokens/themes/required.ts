import type { GradientKey } from "./types";

/**
 * Catalogue of every CSS custom property a theme record may set.
 *
 * The `audit-theme-drift` audit verifies that `default-light.ts` and
 * `default-dark.ts` declare every required token, and that every value in
 * their `tokens` map matches the corresponding block in `tokens.css`.
 *
 * Admin-authored themes are validated against this list via a Zod schema —
 * unknown keys are rejected; missing keys fall back to the active mode's
 * default theme value (so a theme can override only a subset).
 */
export const REQUIRED_THEME_TOKENS = [
  // Brand
  "appkit-color-primary",
  "appkit-color-primary-50",
  "appkit-color-primary-100",
  "appkit-color-primary-200",
  "appkit-color-primary-300",
  "appkit-color-primary-400",
  "appkit-color-primary-500",
  "appkit-color-primary-600",
  "appkit-color-primary-700",
  "appkit-color-primary-800",
  "appkit-color-primary-900",
  "appkit-color-primary-950",
  "appkit-color-secondary",
  "appkit-color-secondary-50",
  "appkit-color-secondary-100",
  "appkit-color-secondary-200",
  "appkit-color-secondary-300",
  "appkit-color-secondary-400",
  "appkit-color-secondary-500",
  "appkit-color-secondary-600",
  "appkit-color-secondary-700",
  "appkit-color-secondary-800",
  "appkit-color-secondary-900",
  "appkit-color-secondary-950",
  // Semantic surface
  "appkit-color-bg",
  "appkit-color-surface",
  "appkit-color-surface-elevated",
  "appkit-color-surface-input",
  "appkit-color-border",
  "appkit-color-border-subtle",
  // Semantic text
  "appkit-color-text",
  "appkit-color-text-muted",
  "appkit-color-text-faint",
  "appkit-color-text-on-primary",
  "appkit-color-link",
  // Status
  "appkit-color-success",
  "appkit-color-success-surface",
  "appkit-color-warning",
  "appkit-color-warning-surface",
  "appkit-color-error",
  "appkit-color-error-surface",
  "appkit-color-info",
  "appkit-color-info-surface",
  // Focus
  "appkit-color-focus-ring",
  // Glow shadow (theme-tinted; dimensional shadow stays in tokens layer)
  "appkit-shadow-glow",
  "appkit-shadow-glow-pink",
  // Fonts
  "appkit-font-display",
  "appkit-font-sans",
  "appkit-font-editorial",
  "appkit-font-mono",
  // Spacing scale
  "appkit-space-0-5",
  "appkit-space-1",
  "appkit-space-1-5",
  "appkit-space-2",
  "appkit-space-2-5",
  "appkit-space-3",
  "appkit-space-3-5",
  "appkit-space-4",
  "appkit-space-5",
  "appkit-space-6",
  "appkit-space-8",
  "appkit-space-10",
  "appkit-space-12",
  "appkit-space-14",
  "appkit-space-16",
  "appkit-space-18",
  "appkit-space-20",
  "appkit-space-24",
  // Font-size scale
  "appkit-text-2xs",
  "appkit-text-xs",
  "appkit-text-sm",
  "appkit-text-base",
  "appkit-text-lg",
  "appkit-text-xl",
  "appkit-text-2xl",
  "appkit-text-3xl",
  "appkit-text-4xl",
  "appkit-text-5xl",
  // Radius scale — previously fixed in :root with no per-theme override seam.
  "appkit-radius-sm",
  "appkit-radius-md",
  "appkit-radius-lg",
  "appkit-radius-xl",
  "appkit-radius-2xl",
  "appkit-radius-3xl",
  "appkit-radius-card",
  "appkit-radius-btn",
  "appkit-radius-full",
  // Letter-spacing scale — `sunset.ts`'s CSS block already varies this per
  // theme (hand-written, outside the theme-record mechanism); promoting it
  // here gives an ADMIN-authored theme the same seam.
  "appkit-tracking-tighter",
  "appkit-tracking-tight",
  "appkit-tracking-normal",
  "appkit-tracking-wide",
  "appkit-tracking-wider",
  // Motion — duration + easing. `appkit/src/tokens/motion.ts`'s spring/tween
  // presets are a separate, non-CSS concern (motion/react `Transition`
  // objects) and are not part of this CSS-variable set.
  "appkit-duration-fast",
  "appkit-duration-base",
  "appkit-duration-slow",
  "appkit-duration-slower",
  "appkit-ease-default",
  "appkit-ease-in",
  "appkit-ease-out",
] as const;

export type RequiredThemeToken = (typeof REQUIRED_THEME_TOKENS)[number];

export const REQUIRED_GRADIENT_KEYS: readonly GradientKey[] = [
  "brand",
  "brand-tri",
  "accent",
  "accent-divider",
  "page-header",
  "section-warm",
  "section-cool",
  "section-mesh",
  "accent-banner",
  "promotion",
  "spotlight",
  "whatsapp-card",
  "glass",
  "card-indigo",
  "card-teal",
  "card-amber",
  "card-rose",
  "logo",
] as const;
