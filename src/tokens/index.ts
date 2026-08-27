/**
 * @mohasinac/tokens — TypeScript constants
 *
 * Mirrors the CSS custom properties in tokens.css as typed TS values.
 * Use these when you need token values in JS (e.g. canvas drawing, charting,
 * or building the tailwind.config.js color palette from a single source).
 *
 * In CSS/Tailwind prefer `var(--appkit-*)` references over these constants.
 */

// --- Brand Colors ----------------------------------------------------------

export const COLORS = {
  primary: {
    DEFAULT: "#0d9488",
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
    950: "#042f2e",
  },
  secondary: {
    DEFAULT: "#c026d3",
    50: "#fdf4ff",
    100: "#fae8ff",
    200: "#f5d0fe",
    300: "#f0abfc",
    400: "#e879f9",
    500: "#d946ef",
    600: "#c026d3",
    700: "#a21caf",
    800: "#86198f",
    900: "#701a75",
    950: "#4a044e",
  },
  cobalt: {
    DEFAULT: "#3570fc",
    50: "#eef5ff",
    100: "#d9e8ff",
    200: "#bcd4ff",
    300: "#8eb9ff",
    400: "#5992ff",
    500: "#3570fc",
    600: "#1a55f2",
    700: "#1343de",
    800: "#1536b4",
    900: "#18318e",
    950: "#111e58",
  },
  accent: {
    DEFAULT: "#8393b2",
    50: "#f5f7fa",
    100: "#eaeef4",
    200: "#d1dae6",
    300: "#adb9cf",
    400: "#8393b2",
    500: "#657599",
    600: "#505f7f",
    700: "#424d67",
    800: "#394257",
    900: "#333b4b",
    950: "#222730",
  },
  semantic: {
    success: "#15803d",
    warning: "#b45309",
    error: "#b91c1c",
    info: "#0369a1",
  },
} as const;

// --- Border Radius ---------------------------------------------------------

export const RADIUS = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  card: "1rem",
  btn: "0.75rem",
  full: "9999px",
} as const;

// --- Shadow ----------------------------------------------------------------

export const SHADOWS = {
  sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
  soft: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
  glow: "0 0 20px rgba(13, 148, 136, 0.45)",
  glowPink: "0 0 20px rgba(192, 38, 211, 0.5)",
} as const;

// --- Z-index ---------------------------------------------------------------

export const Z_INDEX = {
  dropdown: 30,
  searchBackdrop: 35,
  navbar: 40,
  bottomNav: 40,
  overlay: 45,
  sidebar: 50,
  titleBar: 50,
  modal: 60,
  toast: 70,
} as const;

// --- Token helper ----------------------------------------------------------

/**
 * Returns a CSS custom property reference for the given token name.
 *
 * @example
 *   token("color-primary")       // "var(--appkit-color-primary)"
 *   token("radius-card")         // "var(--appkit-radius-card)"
 *   token("shadow-glow")         // "var(--appkit-shadow-glow)"
 */
export function token(name: string): string {
  return `var(--appkit-${name})`;
}

// --- Convenience groups ----------------------------------------------------

export const TOKENS = {
  colors: COLORS,
  radius: RADIUS,
  shadows: SHADOWS,
  zIndex: Z_INDEX,
  token,
} as const;

// --- LOCALE_CONFIG ---------------------------------------------------------

import {
  getDefaultCurrency,
  getDefaultLocale,
  getDefaultCountry,
  getDefaultTimezone,
  getDefaultPhonePrefix,
} from "../core/baseline-resolver";

/**
 * Locale and currency defaults.
 * Scalar defaults are resolved at call-time via the baseline resolver so that
 * consumer overrides (via `configureMarketDefaults()`) take effect everywhere.
 *
 * @example
 * ```ts
 * import { LOCALE_CONFIG } from "@mohasinac/appkit/tokens";
 *
 * const price = new Intl.NumberFormat(LOCALE_CONFIG.defaultLocale, {
 * style: "currency",
 * currency: LOCALE_CONFIG.defaultCurrency,
 * }).format(1299);
 * // => "\u20b91,299.00"
 * ```
 */
export const LOCALE_CONFIG = {
  /** IETF language tag used for Intl formatters. Resolved via baseline resolver. */
  get defaultLocale() {
    return getDefaultLocale();
  },
  /** ISO 4217 currency code. Resolved via baseline resolver. */
  get defaultCurrency() {
    return getDefaultCurrency();
  },
  /** IANA timezone for server-side date rendering. Resolved via baseline resolver. */
  get defaultTimezone() {
    return getDefaultTimezone();
  },
  /** ISO 3166-1 alpha-2 country code. Resolved via baseline resolver. */
  get defaultCountry() {
    return getDefaultCountry();
  },
  /** Phone number prefix. Resolved via baseline resolver. */
  get defaultPhonePrefix() {
    return getDefaultPhonePrefix();
  },
  /** Locales available for the i18n router. */
  supportedLocales: ["en-IN", "en-US", "en-GB"] as const,
  /** Currencies the platform accepts. */
  supportedCurrencies: ["INR", "USD", "GBP", "EUR", "AED", "SGD"] as const,
  /** Currency symbol map for quick display use. */
  currencySymbols: {
    INR: "\u20b9",
    USD: "$",
    GBP: "\u00a3",
    EUR: "\u20ac",
    AED: "\u062f.\u0625",
    SGD: "S$",
  } as const,
  /** Postal code pattern for India (6 digits). */
  postalPattern: /^[1-9][0-9]{5}$/,
} as const;

//
// Responsive-first design system constants for Tailwind CSS.
// Framework rule: every grid includes xl: and 2xl: breakpoints (widescreen).
// Touch targets are ≥ 44×44 px (WCAG 2.5.5).
//
// Projects (letitrip.in, licorice, hobson) import this as their base and
// extend with brand-specific values. The `primary`/`secondary` Tailwind color
// names are resolved by each consumer project's tailwind.config.js.

/**
 * Layout dimension constants (height, width strings for Tailwind).
 */
export const LAYOUT = {
  titleBarHeight: "h-12",
  navbarHeight: "h-10 md:h-12",
  sidebarWidth: "w-80",
  bottomNavHeight: "h-14",
  maxContentWidth: "max-w-[1920px]",
  containerWidth: "max-w-[1920px]",
  contentPadding: "px-4 md:px-6 lg:px-8",
  navPadding: "px-4 sm:px-6 lg:px-8",
  titleBarBg:
    "bg-[color-mix(in_srgb,var(--appkit-color-bg)_90%,transparent)] backdrop-blur-md border-b border-[var(--appkit-color-border)]",
  navbarBg:
    "bg-[color-mix(in_srgb,var(--appkit-color-bg)_90%,transparent)] backdrop-blur-md border-b border-[var(--appkit-color-border)]",
  sidebarBg:
    "bg-[var(--appkit-color-surface)] border-l border-[var(--appkit-color-border-subtle)]",
  bottomNavBg:
    "bg-[color-mix(in_srgb,var(--appkit-color-bg)_90%,transparent)] backdrop-blur-md border-t border-[var(--appkit-color-border)]",
  footerBg:
  " bg-[var(--appkit-color-surface)] border-t border-[var(--appkit-color-border-subtle)]",
  fullScreen: "min-h-screen",
  flexCenter: "flex items-center justify-center",
  centerText: "text-center",
  // Mobile-first layout zone tokens (Phase 20)
  /** Full-width content zone: max screen-xl, centred, responsive px */
  content: "w-full max-w-screen-xl mx-auto px-4 sm:px-6 xl:px-8",
  /** Narrow zone for forms, articles, policy pages */
  tight: "w-full max-w-3xl mx-auto px-4 sm:px-6",
  /** Vertical rhythm padding for sections */
  section: "py-10 sm:py-14 xl:py-20",
  /** Compact sections (filters, related products) */
  sectionSm: "py-6 sm:py-10",
  /** Responsive gap for flex/grid children */
  gap: "gap-4 sm:gap-6 xl:gap-8",
  /** Responsive vertical stack spacing */
  stack: "space-y-4 sm:space-y-6",
  /** Kill trailing space from last child in a zone */
  noBleed: "pb-0 mb-0",
  /** Kill top margin from first element in a zone */
  firstChild: "mt-0 pt-0",
  /** Kill bottom margin from last element in a zone */
  lastChild: "mb-0 pb-0",
  /** Main content bottom padding to clear the bottom nav on mobile */
  mainPadBottomNav: "pb-20 lg:pb-0",
  /** Standard card heights for consistency */
  cardHeight: {
    sm: "h-32",
    md: "h-48",
    lg: "h-64",
    xl: "h-80",
    product: "h-72",
    store: "h-56",
    event: "h-80",
    blog: "h-96",
  },
  /** Standard card widths for consistency */
  cardWidth: {
    sm: "w-32",
    md: "w-48",
    lg: "w-64",
    xl: "w-80",
    full: "w-full",
  },
} as const;

// --- FLUID GRID -------------------------------------------------------------
/**
 * Minimum item widths for auto-fill fluid grids matching the four
 * `fluid-grid-*` CSS utilities (defined in tailwind.config.js plugin).
 *
 * Usage: `useContainerGrid({ minItemWidth: FLUID_GRID_MIN_WIDTHS.card })`
 */
export const FLUID_GRID_MIN_WIDTHS = {
  /** Product cards, store cards */
  card: 220,
  /** Admin stat cards, user cards */
  admin: 260,
  /** Blog cards, event cards */
  wide: 300,
  /** Gallery thumbnails */
  thumb: 160,
  /** Form fields — two-column threshold */
  form: 280,
  /** Tab strip items */
  tabItem: 100,
  /** Filter chips */
  chip: 80,
} as const;

// THEME_CONSTANTS deleted 2026-06-17 in Phase 8 of the Three-Layer Style
// System refactor. Use primitive variant props (<Card>, <Section>, <Stack>,
// <Text>, <Heading>, <Badge>, …) for every styling intent. The handful of
// legacy raw-className tokens still needed live in typed feature files
// under `_internal/shared/styles/{page,themed,grid,skeleton}.ts`. The two
// token groups still consumed outside this file (LAYOUT, FLUID_GRID_MIN_WIDTHS)
// remain exported above. The rest of the old THEME_CONSTANTS slice (THEMED,
// TYPOGRAPHY, SPACING, GRID, PAGE, INPUT, CARD, FLEX, POSITION, STATES,
// TRANSITIONS, SKELETON, MOTION, TEXT, TOUCH, FLUID_GRID, UTILITIES,
// PATTERNS, ICON, TAB, RATING) had no remaining callers and was removed.
