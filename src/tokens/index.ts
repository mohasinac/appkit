/**
 * @mohasinac/tokens — TypeScript constants
 *
 * Mirrors the CSS custom properties in tokens.css as typed TS values.
 * Use these when you need token values in JS (e.g. canvas drawing, charting,
 * or building the tailwind.config.js color palette from a single source).
 *
 * In CSS/Tailwind prefer `var(--lir-*)` references over these constants.
 */

// ─── Brand Colors ──────────────────────────────────────────────────────────

export const COLORS = {
  primary: {
    DEFAULT: "#84e122",
    50: "#f3ffe3",
    100: "#e4ffc5",
    200: "#c8ff90",
    300: "#a3f550",
    400: "#84e122",
    500: "#65c408",
    600: "#509c02",
    700: "#3e7708",
    800: "#345e0d",
    900: "#2c5011",
    950: "#142d03",
  },
  secondary: {
    DEFAULT: "#e91e8c",
    50: "#fdf0f8",
    100: "#fce2f2",
    200: "#fac6e6",
    300: "#f79dd2",
    400: "#f063b9",
    500: "#e91e8c",
    600: "#d4107a",
    700: "#b00d66",
    800: "#900f56",
    900: "#771249",
    950: "#480525",
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
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
    info: "#0284c7",
  },
} as const;

// ─── Border Radius ─────────────────────────────────────────────────────────

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

// ─── Shadow ────────────────────────────────────────────────────────────────

export const SHADOWS = {
  sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
  soft: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
  glow: "0 0 20px rgba(80, 156, 2, 0.45)",
  glowPink: "0 0 20px rgba(233, 30, 140, 0.5)",
} as const;

// ─── Z-index ───────────────────────────────────────────────────────────────

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

// ─── Token helper ──────────────────────────────────────────────────────────

/**
 * Returns a CSS custom property reference for the given token name.
 *
 * @example
 *   token("color-primary")       // "var(--lir-color-primary)"
 *   token("radius-card")         // "var(--lir-radius-card)"
 *   token("shadow-glow")         // "var(--lir-shadow-glow)"
 */
export function token(name: string): string {
  return `var(--lir-${name})`;
}

// ─── Convenience groups ────────────────────────────────────────────────────

export const TOKENS = {
  colors: COLORS,
  radius: RADIUS,
  shadows: SHADOWS,
  zIndex: Z_INDEX,
  token,
} as const;

// ─── THEME_CONSTANTS ───────────────────────────────────────────────────────
//
// Responsive-first design system constants for Tailwind CSS.
// Framework rule: every grid includes xl: and 2xl: breakpoints (widescreen).
// Touch targets are ≥ 44×44 px (WCAG 2.5.5).
//
// Projects (letitrip.in, licorice, hobson) import this as their base and
// extend with brand-specific values. The `primary`/`secondary` Tailwind color
// names are resolved by each consumer project's tailwind.config.js.

/**
 * Dark-mode aware classes for backgrounds, text, and borders.
 * Base = zinc (light) / slate (dark — navy-tinted).
 */
const THEMED = {
  // Backgrounds
  bgPrimary: "bg-zinc-50 dark:bg-slate-950",
  bgSecondary: "bg-zinc-100 dark:bg-slate-900",
  bgTertiary: "bg-zinc-200 dark:bg-slate-800",
  bgElevated: "bg-white dark:bg-slate-900/90",
  bgInput: "bg-white dark:bg-slate-800/60",
  // Text
  textPrimary: "text-zinc-900 dark:text-zinc-50",
  textSecondary: "text-zinc-500 dark:text-zinc-400",
  textMuted: "text-zinc-400 dark:text-zinc-500",
  textError: "text-red-600 dark:text-red-400",
  textSuccess: "text-emerald-600 dark:text-emerald-400",
  textOnPrimary: "text-white",
  textOnDark: "text-white",
  // Borders
  border: "border-zinc-200 dark:border-slate-700",
  borderSubtle: "border-zinc-100 dark:border-slate-800/60",
  borderLight: "border-zinc-100 dark:border-slate-700/60",
  borderError: "border-red-500",
  borderColor: "border-zinc-200 dark:border-slate-700",
  // Interactive
  hover: "hover:bg-zinc-100 dark:hover:bg-slate-800",
  hoverCard: "hover:bg-zinc-50 dark:hover:bg-slate-800/60",
  hoverBorder: "hover:border-zinc-300 dark:hover:border-slate-600",
  hoverText: "hover:text-zinc-800 dark:hover:text-zinc-100",
  activeRow: "bg-primary-50 dark:bg-secondary-950/30",
  focusRing: "focus:ring-primary-500 dark:focus:ring-secondary-400",
  divider: "divide-zinc-200 dark:divide-slate-700",
  placeholder: "placeholder-zinc-400 dark:placeholder-zinc-500",
} as const;

/**
 * Layout dimension constants (height, width strings for Tailwind).
 */
const LAYOUT = {
  titleBarHeight: "h-12",
  navbarHeight: "h-10 md:h-12",
  sidebarWidth: "w-80",
  bottomNavHeight: "h-14",
  maxContentWidth: "max-w-[1920px]",
  containerWidth: "max-w-[1920px]",
  contentPadding: "px-4 md:px-6 lg:px-8",
  navPadding: "px-4 sm:px-6 lg:px-8",
  titleBarBg:
    "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-slate-800/80",
  navbarBg:
    "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-slate-800/80",
  sidebarBg:
    "bg-white dark:bg-slate-900 border-l border-zinc-200 dark:border-slate-800",
  bottomNavBg:
    "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-slate-800/80",
  footerBg:
    "bg-zinc-50 dark:bg-slate-900 border-t border-zinc-200 dark:border-slate-800",
  fullScreen: "min-h-screen",
  flexCenter: "flex items-center justify-center",
  centerText: "text-center",
} as const;

/**
 * Typography scale — fluid steps across sm/md/lg breakpoints.
 */
const TYPOGRAPHY = {
  pageTitle:
    "text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight",
  pageSubtitle:
    "text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1",
  sectionTitle: "text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight",
  sectionSubtitle:
    "text-sm md:text-base lg:text-lg text-zinc-500 dark:text-zinc-400",
  cardTitle: "text-base md:text-lg font-semibold leading-snug",
  cardBody: "text-sm md:text-base leading-relaxed",
  label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
  caption: "text-xs text-zinc-500 dark:text-zinc-400",
  overline:
    "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
  h1: "text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight font-display",
  h2: "text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight font-display",
  h3: "text-xl md:text-2xl lg:text-3xl font-bold tracking-tight font-display",
  h4: "text-lg md:text-xl lg:text-2xl font-bold font-display",
  h5: "text-base md:text-lg lg:text-xl font-medium",
  h6: "text-sm md:text-base lg:text-lg font-medium",
  body: "text-base lg:text-lg",
  small: "text-sm lg:text-base",
  xs: "text-xs lg:text-sm",
  display: "text-8xl md:text-9xl font-bold font-display",
} as const;

/**
 * Spacing — section, form, and element stacking patterns + gap token map.
 * The gap map mirrors the GAP_MAP inlined in @mohasinac/ui Layout.tsx.
 */
const SPACING = {
  section: "space-y-8 md:space-y-12 lg:space-y-16",
  formGroup: "space-y-6 lg:space-y-8",
  stack: "space-y-4",
  stackSmall: "space-y-2",
  inline: "space-x-4",
  inlineSmall: "gap-2 lg:gap-3",
  inlineLarge: "gap-4 lg:gap-6",
  pageY: "py-6 sm:py-8 lg:py-10",
  sectionGap: "mt-8 md:mt-12",
  cardPadding: "p-5 sm:p-6 lg:p-8",
  padding: {
    xs: "p-2",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  },
  gap: {
    none: "",
    px: "gap-px",
    xs: "gap-1",
    sm: "gap-2",
    "2.5": "gap-2.5",
    "3": "gap-3",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
    "2xl": "gap-12",
  },
} as const;

/**
 * Responsive grid presets — mobile-first, every preset reaches xl: and 2xl:.
 *
 * Rules:
 * - Fixed column grids (cols1–cols6) scale gracefully to widescreen.
 * - Card grids start at 1 col on portrait mobile (≤639 px) for readability.
 * - Auto-fill grids use minmax so columns form naturally at any viewport width.
 */
const GRID = {
  /** Single column */
  cols1: "grid grid-cols-1",
  /** 1 → 2 */
  cols2: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2",
  /** 1 → 2 → 3 → 4 on widescreen */
  cols3:
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
  /** 1 → 2 → 3 → 4 → 5 on widescreen */
  cols4:
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  /** 1 → 2 → 3 → 4 → 5 */
  cols5:
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5",
  /** 2 → 3 → 4 → 5 → 6 */
  cols6:
    "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  /**
   * Generic card grid — 1 col on portrait mobile → 5 on ultrawide.
   * Starts at 1 (not 2) so product cards with title+image+price are readable
   * even on 320 px handsets in portrait orientation.
   */
  cards:
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5",
  /** Auto-fill product cards — min 200 px */
  productCards: "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6",
  /** Auto-fill store cards — min 220 px */
  storeCards: "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6",
  /** Auto-fill category icon+label tiles — min 130 px */
  categoryCards: "grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4",
  /** Auto-fill coupon/promo cards — min 264 px */
  couponCards: "grid grid-cols-[repeat(auto-fill,minmax(264px,1fr))] gap-6",
  /** Auto-fill address / wide cards — min 300 px */
  addressCards: "grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4",
  /** Auto-fill KPI/stat tiles — min 180 px */
  statTiles: "grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4",
  /** Auto-fill account nav tiles — min 160 px */
  navTiles: "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4",
  /** Auto-fill, min 200 px */
  autoFillSm: "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
  /** Auto-fill, min 280 px */
  autoFillMd: "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))]",
  /** Auto-fill, min 360 px */
  autoFillLg: "grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))]",
  /** Fixed 280 px left sidebar + 1fr */
  sidebar: "grid grid-cols-1 lg:grid-cols-[280px_1fr]",
  /** 1fr + fixed 280 px right sidebar */
  sidebarRight: "grid grid-cols-1 lg:grid-cols-[1fr_280px]",
  /** Fixed 320 px left sidebar + 1fr (admin) */
  sidebarWide: "grid grid-cols-1 lg:grid-cols-[320px_1fr]",
  /** Equal halves on md+ */
  halves: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2",
  /** 2fr / 1fr */
  twoThird: "grid grid-cols-1 md:grid-cols-[2fr_1fr]",
  /** 1fr / 2fr */
  oneThird: "grid grid-cols-1 md:grid-cols-[1fr_2fr]",
} as const;

/**
 * Page container presets — max-width + centering + responsive horizontal padding.
 * Mirrors the CONTAINER_MAP inlined in @mohasinac/ui Layout.tsx.
 */
const PAGE = {
  px: "px-4 sm:px-6 lg:px-8",
  container: {
    /** max-w-3xl — blog / policy */
    sm: "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8",
    /** max-w-4xl — contact / about */
    md: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",
    /** max-w-5xl — checkout / help */
    lg: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8",
    /** max-w-6xl — product detail / cart */
    xl: "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
    /** max-w-7xl — main content grids (default) */
    "2xl": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    /** max-w-screen-2xl — full-bleed content */
    full: "max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8",
    /** max-w-screen-2xl — wide store/seller layouts (compact px) */
    wide: "max-w-screen-2xl mx-auto px-4 sm:px-6",
    /** max-w-[1920px] — ultra-wide / 4K displays */
    ultra: "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8",
  },
} as const;

/**
 * Form input styles — border, bg, focus ring, error/success/disabled states.
 */
const INPUT = {
  base: "rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-primary-500/40 dark:focus:ring-secondary-400/40 focus:border-primary-500 dark:focus:border-secondary-400 focus:outline-none transition-colors duration-150 placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
  error:
    "border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50/30 dark:bg-red-950/10",
  success:
    "border-emerald-400 dark:border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500",
  disabled:
    "bg-zinc-50 dark:bg-slate-800/30 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60",
  withIcon: "pl-10",
} as const;

/**
 * Card styles — base, hover, elevated, glass, and interactive variants.
 */
const CARD = {
  base: "rounded-2xl overflow-hidden transition-all",
  shadow: "shadow-sm",
  shadowElevated: "shadow-lg",
  hover:
    "hover:shadow-md dark:hover:shadow-xl cursor-pointer transition-shadow duration-200",
  standard:
    "rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200",
  elevated:
    "rounded-2xl bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow duration-200",
  interactive:
    "rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-primary-300/60 dark:hover:border-secondary-500/60 transition-all duration-200 cursor-pointer",
  glass:
    "rounded-2xl backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border border-zinc-200/60 dark:border-slate-700/40 shadow-lg",
} as const;

/**
 * Flex layout compositions — pre-composed flex containers.
 * Use these instead of writing flex classes inline.
 */
const FLEX = {
  row: "flex flex-row",
  col: "flex flex-col",
  rowWrap: "flex flex-row flex-wrap",
  colWrap: "flex flex-col flex-wrap",
  inline: "inline-flex",
  center: "flex items-center justify-center",
  between: "flex items-center justify-between",
  betweenStart: "flex items-start justify-between",
  betweenEnd: "flex items-end justify-between",
  start: "flex items-center justify-start",
  end: "flex items-center justify-end",
  rowCenter: "flex flex-row items-center",
  rowStart: "flex flex-row items-start",
  rowEnd: "flex flex-row items-end",
  centerCol: "flex flex-col items-center justify-center",
  colStart: "flex flex-col items-start",
  colCenter: "flex flex-col items-center",
  colEnd: "flex flex-col items-end",
  colBetween: "flex flex-col justify-between",
  inlineCenter: "inline-flex items-center",
  inlineFull: "inline-flex items-center justify-center",
  grow: "flex-1",
  growMin: "flex-1 min-w-0",
  growMinH: "flex-1 min-h-0",
  noShrink: "flex-shrink-0",
  none: "flex-none",
  hCenter: "flex justify-center",
} as const;

/**
 * Position utilities.
 */
const POSITION = {
  relative: "relative",
  absolute: "absolute",
  fixed: "fixed",
  sticky: "sticky",
  static: "static",
  fill: "absolute inset-0",
  absoluteCenter: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  absoluteTop: "absolute top-0 inset-x-0",
  absoluteBottom: "absolute bottom-0 inset-x-0",
  absoluteTopRight: "absolute top-0 right-0",
  absoluteTopLeft: "absolute top-0 left-0",
  absoluteBottomRight: "absolute bottom-0 right-0",
  absoluteBottomLeft: "absolute bottom-0 left-0",
} as const;

/**
 * Component state modifiers.
 */
const STATES = {
  disabled: "opacity-50 cursor-not-allowed pointer-events-none",
  loading: "opacity-75 cursor-wait",
  readonly: "bg-zinc-100 dark:bg-slate-800 cursor-default",
  error: "border-red-500 dark:border-red-500",
  success: "border-green-500 dark:border-green-500",
  focus:
    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-secondary-400 dark:focus:ring-offset-slate-950",
} as const;

/**
 * Transition classes.
 */
const TRANSITIONS = {
  default: "transition-all duration-200 ease-in-out",
  fast: "transition-all duration-150 ease-in-out",
  slow: "transition-all duration-500 ease-in-out",
  colors: "transition-colors duration-200 ease-in-out",
  transform: "transition-transform duration-200 ease-in-out",
  opacity: "transition-opacity duration-200 ease-in-out",
} as const;

/**
 * Skeleton loading placeholders.
 */
const SKELETON = {
  base: "animate-pulse rounded bg-zinc-200 dark:bg-slate-700/60",
  text: "animate-pulse rounded bg-zinc-200 dark:bg-slate-700/60 h-4",
  heading: "animate-pulse rounded bg-zinc-200 dark:bg-slate-700/60 h-7",
  image: "animate-pulse rounded-xl bg-zinc-200 dark:bg-slate-700/60",
  card: "animate-pulse rounded-2xl bg-zinc-200 dark:bg-slate-700/60",
} as const;

/**
 * Touch target sizes — WCAG 2.5.5 (minimum 44 × 44 px).
 */
const TOUCH = {
  target: "min-h-[44px] min-w-[44px]",
  targetSm: "min-h-[36px] min-w-[36px]",
  targetH: "min-h-[44px]",
  targetW: "min-w-[44px]",
} as const;

/**
 * Scrollbar and safe-area utilities.
 */
const UTILITIES = {
  scrollbarHide:
    "scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
  scrollbarThin:
    "scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-zinc-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-zinc-400 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500",
  scrollbarThinX:
    "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-zinc-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800/60 [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-zinc-400 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500",
  safeAreaBottom: "pb-[env(safe-area-inset-bottom)]",
  safeAreaTop: "pt-[env(safe-area-inset-top)]",
  safeAreaInline:
    "px-[env(safe-area-inset-left)] px-[env(safe-area-inset-right)]",
  gradientText:
    "bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent",
} as const;

/**
 * Common component pattern compositions.
 */
const PATTERNS = {
  pageContainer: "min-h-screen bg-white dark:bg-slate-950",
  sectionContainer: "max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 lg:py-12",
  formContainer:
    "bg-white dark:bg-slate-900 rounded-2xl border border-zinc-200 dark:border-slate-700 shadow-sm p-6 lg:p-8 space-y-6",
  listItem:
    "bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-slate-600 transition-colors",
  linkDefault:
    "text-primary-600 dark:text-secondary-400 hover:text-primary-500 dark:hover:text-secondary-300 transition-colors underline-offset-2 hover:underline",
  iconButton:
    "p-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-slate-800 active:bg-zinc-200 dark:active:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center",
  modalOverlay:
    "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50",
  modalContent:
    "bg-white dark:bg-slate-900 rounded-2xl border border-zinc-200 dark:border-slate-700 shadow-xl max-w-lg w-full mx-4 overflow-hidden",
  divider: "border-t border-zinc-200 dark:border-slate-700",
  emptyState:
    "flex flex-col items-center justify-center py-12 text-center text-zinc-500 dark:text-zinc-400",
} as const;

/** Icon colour variants and sizes. */
const ICON = {
  muted: "text-zinc-400 dark:text-zinc-500",
  primary: "text-primary-600 dark:text-secondary-400",
  success: "text-emerald-500 dark:text-emerald-400",
  danger: "text-red-500 dark:text-red-400",
  warning: "text-amber-500 dark:text-amber-400",
  size: {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-16 h-16",
  },
} as const;

/** Horizontal tab active / inactive states. */
const TAB = {
  active:
    "border-b-2 border-primary-600 dark:border-secondary-400 text-primary-600 dark:text-secondary-400 font-semibold",
  inactive:
    "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
} as const;

/** Star rating colours. */
const RATING = {
  filled: "text-yellow-400",
  empty: "text-zinc-300 dark:text-zinc-600",
} as const;

/**
 * THEME_CONSTANTS
 *
 * The complete, responsive-first design system constant map.
 * Import in your project's `constants/theme.ts` and extend with
 * brand-specific values (accentBanner gradients, badge role variants, etc.).
 *
 * @example
 * ```ts
 * // In your project constants/theme.ts:
 * import { THEME_CONSTANTS } from "@mohasinac/tokens";
 *
 * export { THEME_CONSTANTS };        // re-export as-is
 *
 * // or merge with project-specific extensions:
 * export const THEME_CONSTANTS = {
 *   ...baseTheme,
 *   accentBanner: { ... },           // project-specific
 * };
 * ```
 */
export const THEME_CONSTANTS = {
  themed: THEMED,
  layout: LAYOUT,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  grid: GRID,
  page: PAGE,
  input: INPUT,
  card: CARD,
  flex: FLEX,
  position: POSITION,
  states: STATES,
  transitions: TRANSITIONS,
  skeleton: SKELETON,
  touch: TOUCH,
  utilities: UTILITIES,
  patterns: PATTERNS,
  icon: ICON,
  tab: TAB,
  rating: RATING,
  /** Breakpoints for reference (matches Tailwind defaults). */
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
    "3xl": "1920px",
  },
  /** Global body/html base classes. */
  base: {
    body: 'bg-white dark:bg-slate-950 text-zinc-900 dark:text-zinc-100 antialiased font-[Inter,ui-sans-serif,system-ui,-apple-system,"Segoe_UI",Roboto,"Helvetica_Neue",Arial,sans-serif]',
    html: "scroll-smooth",
  },
  /** Hero / homepage section layout tokens. */
  homepage: {
    heroMinH: "min-h-[clamp(420px,72vh,680px)]" as const,
    heroMinHMobile: "min-h-[clamp(120px,14vh,200px)]" as const,
  },
  /** Carousel navigation tokens — shared by HeroCarousel and SectionCarousel. */
  carousel: {
    arrow:
      "w-10 h-10 rounded-2xl bg-white/85 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg border border-zinc-300/70 dark:border-slate-600 text-zinc-800 dark:text-zinc-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:border-zinc-400 dark:hover:border-slate-500 active:scale-95 transition-all duration-200 flex items-center justify-center" as const,
    dotActive:
      "w-8 h-2 !min-h-0 rounded-full bg-white shadow-sm transition-all duration-500" as const,
    dotInactive:
      "w-2 h-2 !min-h-0 rounded-full bg-white/55 shadow-sm transition-all duration-500" as const,
  },
} as const;
