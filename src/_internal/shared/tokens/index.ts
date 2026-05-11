/**
 * Shared design-system tokens — semantic aliases on top of raw COLORS/RADIUS/etc.
 *
 * Use semantic names (primary, secondary, success …) everywhere in components.
 * Never use raw COLORS.primary.DEFAULT or hex literals inside _internal/client/.
 *
 * CSS custom properties (--appkit-color-primary, etc.) are injected at runtime
 * by LayoutShellClient from siteSettings.theme, overriding these TS defaults.
 */

// Re-export raw token sets for consumers that need JS values (charting, canvas)
export {
  COLORS,
  RADIUS,
  SHADOWS,
  Z_INDEX,
  THEME_CONSTANTS,
  LAYOUT,
  FLUID_GRID_MIN_WIDTHS,
  LOCALE_CONFIG,
  TOKENS,
  token,
} from "../../../tokens/index";

import { COLORS, RADIUS, SHADOWS, Z_INDEX } from "../../../tokens/index";

// ---------------------------------------------------------------------------
// Semantic color aliases — never reference COLORS.primary directly in components
// Light-mode defaults; CSS variables are overridden in .dark by LayoutShellClient
// ---------------------------------------------------------------------------

export const SEMANTIC_COLORS = {
  // Brand
  primary: COLORS.primary.DEFAULT,
  primaryMuted: COLORS.primary[100],
  onPrimary: "#ffffff",
  secondary: COLORS.secondary.DEFAULT,
  secondaryMuted: COLORS.secondary[100],
  onSecondary: "#ffffff",
  accent: COLORS.accent.DEFAULT,
  onAccent: "#ffffff",
  // State
  success: COLORS.semantic.success,
  onSuccess: "#ffffff",
  warning: COLORS.semantic.warning,
  onWarning: "#ffffff",
  danger: COLORS.semantic.error,
  onDanger: "#ffffff",
  info: COLORS.semantic.info,
  onInfo: "#ffffff",
  // Surface
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  surfaceElevated: "#ffffff",
  onSurface: "#0f172a",
  onSurfaceMuted: "#64748b",
  border: "#e2e8f0",
  borderStrong: "#94a3b8",
  divider: "#f1f5f9",
  // Text
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textTertiary: "#94a3b8",
  textDisabled: "#cbd5e1",
  textInverse: "#ffffff",
  link: COLORS.cobalt.DEFAULT,
  linkHover: COLORS.cobalt[600],
} as const;

/**
 * Dark-mode overrides for all semantic color tokens.
 * Applied under the `.dark` class by LayoutShellClient CSS injection.
 * Admin theme overrides (siteSettings.theme.*Dark) layer on top.
 */
export const SEMANTIC_COLORS_DARK = {
  // Brand — keep vivid; muted shifts to near-black
  primary: COLORS.primary.DEFAULT,
  primaryMuted: COLORS.primary[950],
  onPrimary: "#0f172a",
  secondary: COLORS.secondary.DEFAULT,
  secondaryMuted: COLORS.secondary[950],
  onSecondary: "#0f172a",
  accent: COLORS.accent[300],
  onAccent: "#0f172a",
  // State — vivid variants work on dark surfaces
  success: "#34d399",
  onSuccess: "#022c22",
  warning: "#fbbf24",
  onWarning: "#1c1107",
  danger: "#f87171",
  onDanger: "#1c0505",
  info: "#38bdf8",
  onInfo: "#082f49",
  // Surface
  surface: "#0f172a",
  surfaceMuted: "#1e293b",
  surfaceElevated: "#1e293b",
  onSurface: "#f1f5f9",
  onSurfaceMuted: "#94a3b8",
  border: "#334155",
  borderStrong: "#475569",
  divider: "#1e293b",
  // Text
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textTertiary: "#64748b",
  textDisabled: "#475569",
  textInverse: "#0f172a",
  link: COLORS.cobalt[300],
  linkHover: COLORS.cobalt[200],
} as const;

export type SemanticColor = keyof typeof SEMANTIC_COLORS;

// ---------------------------------------------------------------------------
// Semantic radius aliases
// ---------------------------------------------------------------------------

export const SEMANTIC_RADIUS = {
  radiusNone: "0",
  radiusSm: RADIUS.sm,
  radiusMd: RADIUS.md,
  radiusLg: RADIUS.lg,
  radiusXl: RADIUS.xl,
  radiusFull: RADIUS.full,
} as const;

// ---------------------------------------------------------------------------
// Semantic shadow aliases
// ---------------------------------------------------------------------------

export const SEMANTIC_SHADOWS = {
  shadowNone: "none",
  shadowSm: SHADOWS.sm,
  shadowMd: SHADOWS.md,
  shadowLg: SHADOWS.lg,
  shadowOverlay: SHADOWS.xl,
} as const;

// ---------------------------------------------------------------------------
// Z-index semantic names
// ---------------------------------------------------------------------------

export const SEMANTIC_Z_INDEX = {
  zBase: Z_INDEX.dropdown - 30,      // 0
  zHeader: Z_INDEX.titleBar,          // 50
  zDropdown: Z_INDEX.dropdown,        // 30
  zOverlay: Z_INDEX.overlay,          // 45
  zModal: Z_INDEX.modal,              // 60
  zToast: Z_INDEX.toast,              // 70
  zTooltip: Z_INDEX.toast + 10,       // 80
} as const;

// ---------------------------------------------------------------------------
// Motion tokens
// ---------------------------------------------------------------------------

export const MOTION_TOKENS = {
  durationFast: "150ms",
  durationBase: "200ms",
  durationSlow: "500ms",
  easeStandard: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeEnter: "cubic-bezier(0.0, 0, 0.2, 1)",
  easeExit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

// ---------------------------------------------------------------------------
// Breakpoints — shared Responsive<T> contract
// ---------------------------------------------------------------------------

export const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Allows a prop to accept either a single value or per-breakpoint overrides.
 *
 * @example
 *   maxWidth: Responsive<"sm" | "lg" | "full">
 *   gap: Responsive<1 | 2 | 3 | 4>
 */
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

// ---------------------------------------------------------------------------
// Platform-level limits — single source of truth
// ---------------------------------------------------------------------------

export const PLATFORM_LIMITS = {
  WISHLIST_MAX: 20,
  HISTORY_MAX: 50,
  CART_MAX: 50,
  AUCTION_MIN_INCREMENT_PERCENT: 5,
} as const;
