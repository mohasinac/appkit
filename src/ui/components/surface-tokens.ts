/**
 * Surface & layout tokens — shared prop maps for all layout primitives.
 *
 * These maps power the Bootstrap/MUI-style props (`surface`, `padding`,
 * `rounded`, `border`, `shadow`) on Stack, Row, Grid, Container, Section,
 * Article, Main, Aside, Div, BlockHeader, and BlockFooter.
 */

export const SURFACE_MAP = {
  none: "",
  default: "bg-[var(--appkit-color-surface)]",
  muted: "bg-[var(--appkit-color-bg)]",
  subtle: "bg-[var(--appkit-color-border-subtle)]",
  inset: "bg-[var(--appkit-color-surface-input)]",
  card: "bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)] rounded-xl shadow-sm",
  elevated: "bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)] rounded-2xl shadow-md",
  interactive: "bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)] rounded-xl shadow-sm hover:shadow-md hover:border-[var(--appkit-color-primary-300)] transition-all cursor-pointer",
  glass: "backdrop-blur-md border border-[var(--appkit-color-border-subtle)] rounded-2xl shadow-lg bg-[image:var(--appkit-gradient-glass)]",
  form: "bg-[var(--appkit-color-surface)] rounded-2xl border border-[var(--appkit-color-border)] shadow-sm",
  sidePanel: "bg-[var(--appkit-color-surface)]",
  // Status-tinted surfaces — drawn from the active theme so admin custom themes
  // automatically restyle status callouts.
  "success-surface": "bg-[var(--appkit-color-success-surface)]",
  "danger-surface": "bg-[var(--appkit-color-error-surface)]",
  "warning-surface": "bg-[var(--appkit-color-warning-surface)]",
  "info-surface": "bg-[var(--appkit-color-info-surface)]",
  // Dark overlay scrim presets — used for image dimming, modal backdrops,
  // hover overlays. Backdrop-blur should be paired separately via className
  // when needed (backdrop-blur is not a colour utility, not in audit scope).
  "overlay-xs": "bg-black/40",
  "overlay-sm": "bg-black/50",
  "overlay-md": "bg-black/55",
  "overlay-lg": "bg-black/60",
  "overlay-xl": "bg-black/70",
  // Skeleton loader presets — theme-adaptive via CSS variables.
  skeleton: "bg-[var(--appkit-color-border)]",
  "skeleton-light": "bg-[var(--appkit-color-border-subtle)]",
  /** Near-black placeholder behind a media thumbnail (e.g. YouTube card) — deliberately not theme-tinted. */
  "media-dark": "bg-zinc-900",
} as const;

export type SurfaceKey = keyof typeof SURFACE_MAP;

/**
 * Every className below is spelled out as a complete string literal — Tailwind's
 * content scanner reads this source file as plain text (it does not evaluate
 * JS), so building a class name via template-literal interpolation of the
 * space step leaves an unresolved placeholder that the scanner cannot turn
 * into a generatable candidate. See the same fix in Typography.tsx
 * (RESPONSIVE_TEXT_SIZE_CLASS) for the identical issue with text sizes.
 */
export const PADDING_MAP = {
  none: "",
  "2xs": "p-[var(--appkit-space-1)]",
  xs: "p-[var(--appkit-space-2)]",
  sm: "p-[var(--appkit-space-3)]",
  md: "p-[var(--appkit-space-4)]",
  "5": "p-[var(--appkit-space-5)]",
  lg: "p-[var(--appkit-space-6)]",
  xl: "p-[var(--appkit-space-8)]",
  "3xl": "p-[var(--appkit-space-12)]",
  card: "p-[var(--appkit-space-5)] sm:p-[var(--appkit-space-6)] lg:p-[var(--appkit-space-8)]",
  "card-tight": "p-[var(--appkit-space-3)] sm:p-[var(--appkit-space-4)]",
  section: "py-[var(--appkit-space-10)] sm:py-[var(--appkit-space-14)] xl:py-[var(--appkit-space-20)]",
  sectionSm: "py-[var(--appkit-space-6)] sm:py-[var(--appkit-space-10)]",
  page: "py-[var(--appkit-space-6)] sm:py-[var(--appkit-space-8)] lg:py-[var(--appkit-space-10)]",
  hero: "py-[var(--appkit-space-12)] sm:py-[var(--appkit-space-16)] lg:py-[var(--appkit-space-24)]",
  toolbar: "px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)]",
  inline: "px-[var(--appkit-space-4)] py-[var(--appkit-space-3)]",
  inlineSm: "px-[var(--appkit-space-3)] py-[var(--appkit-space-2)]",
  inlineLg: "px-[var(--appkit-space-6)] py-[var(--appkit-space-4)]",
  /** Tiny pill chip — `px-1.5 py-0.5`. Used by Bundle/PrizeDraw badge labels. */
  "chip-2xs": "px-[var(--appkit-space-1-5)] py-[var(--appkit-space-0-5)]",
  // Vertical-only presets — the variant-catalogue codemod migrates raw
  // `py-N` / `py-N md:py-M` className tokens into these names.
  "y-2xs": "py-[var(--appkit-space-1)]",
  "y-xs": "py-[var(--appkit-space-2)]",
  "y-sm": "py-[var(--appkit-space-3)]",
  "y-md": "py-[var(--appkit-space-4)]",
  "y-lg": "py-[var(--appkit-space-6)]",
  "y-xl": "py-[var(--appkit-space-8)]",
  "y-2xl": "py-[var(--appkit-space-10)]",
  "y-3xl": "py-[var(--appkit-space-12)]",
  "y-4xl": "py-[var(--appkit-space-16)]",
  // Horizontal-only presets.
  "x-xs": "px-[var(--appkit-space-2)]",
  "x-sm": "px-[var(--appkit-space-3)]",
  "x-md": "px-[var(--appkit-space-4)]",
  "x-lg": "px-[var(--appkit-space-6)]",
  "x-xl": "px-[var(--appkit-space-8)]",
  // Top-only and bottom-only side presets.
  "t-2xs": "pt-[var(--appkit-space-1)]",
  "b-2xs": "pb-[var(--appkit-space-1)]",
  "t-xs": "pt-[var(--appkit-space-2)]",
  "t-sm": "pt-[var(--appkit-space-3)]",
  "t-md": "pt-[var(--appkit-space-4)]",
  "t-lg": "pt-[var(--appkit-space-6)]",
  "t-xl": "pt-[var(--appkit-space-8)]",
  "b-xs": "pb-[var(--appkit-space-2)]",
  "b-sm": "pb-[var(--appkit-space-3)]",
  "b-md": "pb-[var(--appkit-space-4)]",
  "b-lg": "pb-[var(--appkit-space-6)]",
  "b-xl": "pb-[var(--appkit-space-8)]",
  "b-2xl": "pb-[var(--appkit-space-10)]",
  // Fill-in vertical sizes.
  "y-2-5xl": "py-[var(--appkit-space-14)]",
  "y-5xl": "py-[var(--appkit-space-20)]",
  "y-6xl": "py-[var(--appkit-space-24)]",
  // Responsive banner preset — used by accent-banner Sections.
  banner: "py-[var(--appkit-space-14)] md:py-[var(--appkit-space-16)] lg:py-[var(--appkit-space-20)]",
  // Responsive content preset — about-views inner container padding.
  "content-banner": "py-[var(--appkit-space-10)] md:py-[var(--appkit-space-12)] lg:py-[var(--appkit-space-16)]",
} as const;

export type PaddingKey = keyof typeof PADDING_MAP;

export const ROUNDED_MAP = {
  none: "",
  default: "rounded",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
} as const;

export type RoundedKey = keyof typeof ROUNDED_MAP;

const ROUNDED_TOP_MAP: Record<RoundedKey, string> = {
  none: "",
  default: "rounded-t",
  sm: "rounded-t-sm",
  md: "rounded-t-md",
  lg: "rounded-t-lg",
  xl: "rounded-t-xl",
  "2xl": "rounded-t-2xl",
  "3xl": "rounded-t-3xl",
  full: "rounded-t-full",
};

const ROUNDED_BOTTOM_MAP: Record<RoundedKey, string> = {
  none: "",
  default: "rounded-b",
  sm: "rounded-b-sm",
  md: "rounded-b-md",
  lg: "rounded-b-lg",
  xl: "rounded-b-xl",
  "2xl": "rounded-b-2xl",
  "3xl": "rounded-b-3xl",
  full: "rounded-b-full",
};

export const BORDER_MAP = {
  none: "",
  default: "border border-[var(--appkit-color-border)]",
  subtle: "border border-[var(--appkit-color-border-subtle)]",
  strong: "border border-[var(--appkit-color-border)]",
  dashed: "border border-dashed border-[var(--appkit-color-border)]",
  bottom: "border-b border-[var(--appkit-color-border)]",
  "bottom-subtle": "border-b border-[var(--appkit-color-border-subtle)]",
  top: "border-t border-[var(--appkit-color-border)]",
  "top-subtle": "border-t border-[var(--appkit-color-border-subtle)]",
  /** 2px border for skeleton placeholder cards. */
  "skeleton": "border-2 border-[var(--appkit-color-border-subtle)]",
} as const;

export type BorderKey = keyof typeof BORDER_MAP;

export const SHADOW_MAP = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
  /** No static shadow; transitions to shadow-md on hover. Used for interactive card surfaces. */
  "hover-md": "hover:shadow-md transition-shadow",
  /** No static shadow; transitions to shadow-lg on hover. */
  "hover-lg": "hover:shadow-lg transition-shadow",
  /** Resting shadow-sm that lifts to shadow-md on hover. */
  "sm-hover-md": "shadow-sm hover:shadow-md transition-shadow",
  /** Themed card shadow via --card-shadow CSS variable. */
  card: "shadow-[var(--card-shadow)]",
} as const;

export type ShadowKey = keyof typeof SHADOW_MAP;

/**
 * Named gap presets consumed by `<Stack>` / `<Row>` / `<Grid>` `gap` props.
 *
 * The variant catalogue blocks raw `space-y-*` / `gap-*` literals at the call
 * site; consumers pick a token name and the primitive resolves it here.
 *
 * The mapping uses Tailwind's `gap-*` utility for *both* axes — `<Stack>`
 * renders `flex-col`, so `gap` collapses to vertical spacing automatically.
 */
export const GAP_PRESETS = {
  none: "gap-0",
  px: "gap-px",
  xs: "gap-[var(--appkit-space-1)]",
  sm: "gap-[var(--appkit-space-2)]",
  dense: "gap-[var(--appkit-space-2)]",
  md: "gap-[var(--appkit-space-3)]",
  comfortable: "gap-[var(--appkit-space-3)]",
  lg: "gap-[var(--appkit-space-4)]",
  loose: "gap-[var(--appkit-space-4)]",
  xl: "gap-[var(--appkit-space-5)]",
  "2xl": "gap-[var(--appkit-space-6)]",
  section: "gap-[var(--appkit-space-6)] sm:gap-[var(--appkit-space-8)]",
  hero: "gap-[var(--appkit-space-10)] sm:gap-[var(--appkit-space-12)]",
} as const;

export type GapPresetKey = keyof typeof GAP_PRESETS;

/**
 * Named padding presets consumed by `<Container>` / `<Section>` / `<Card>` /
 * `<Stack>` / `<Row>` / `<Div>` `padding` props. Re-exports `PADDING_MAP` under
 * the catalogue alias so existing consumers keep working while new code uses
 * the catalogue name.
 */
export const PADDING_PRESETS = PADDING_MAP;
export type PaddingPresetKey = PaddingKey;

export type XPaddingKey = "none" | "x-xs" | "x-sm" | "x-md" | "x-5" | "x-lg" | "x-xl" | "x-sm-md" | "x-sm-lg-md" | "x-md-lg" | "x-md-xl" | "x-md-2xl" | "x-page" | "l-xl";
type YPaddingKey = "none" | "y-2xs" | "y-2xs-tall" | "y-xs" | "y-xs-tall" | "y-sm" | "y-sm-tall" | "y-md" | "y-md-lg" | "y-lg" | "y-xl" | "y-2xl" | "y-3xl" | "y-4xl" | "y-5xl" | "y-6xl" | "y-2-5xl" | "t-2xs" | "b-2xs" | "t-xs" | "b-xs" | "t-sm" | "b-sm" | "t-md" | "b-md" | "b-md-lg" | "b-lg" | "t-md-b-lg";

export const X_ONLY_MAP: Record<XPaddingKey, string> = {
  none: "",
  "x-xs": "px-[var(--appkit-space-2)]",
  "x-sm": "px-[var(--appkit-space-3)]",
  "x-md": "px-[var(--appkit-space-4)]",
  "x-5": "px-[var(--appkit-space-5)]",
  "x-lg": "px-[var(--appkit-space-6)]",
  "x-xl": "px-[var(--appkit-space-8)]",
  /** Responsive: `px-3 sm:px-4` — the canonical mobile-tight container. */
  "x-sm-md": "px-[var(--appkit-space-3)] sm:px-[var(--appkit-space-4)]",
  /** Responsive: `px-3 lg:px-4` — the canonical mobile-tight wide container. */
  "x-sm-lg-md": "px-[var(--appkit-space-3)] lg:px-[var(--appkit-space-4)]",
  /** Responsive: `px-4 sm:px-6` — narrow container horizontal padding. */
  "x-md-lg": "px-[var(--appkit-space-4)] sm:px-[var(--appkit-space-6)]",
  /** Responsive: `px-6 md:px-10` — guide hub / store-extension container padding. */
  "x-md-xl": "px-[var(--appkit-space-6)] md:px-[var(--appkit-space-10)]",
  /** Responsive: `px-4 sm:px-8` — section header container padding. */
  "x-md-2xl": "px-[var(--appkit-space-4)] sm:px-[var(--appkit-space-8)]",
  /** Responsive: `px-4 sm:px-6 lg:px-8` — canonical page-container horizontal padding. */
  "x-page": "px-[var(--appkit-space-4)] sm:px-[var(--appkit-space-6)] lg:px-[var(--appkit-space-8)]",
  // Asymmetric left one-sided value (for sites that pad just one edge, e.g. a
  // selection-checkbox gutter).
  /** Asymmetric: `pl-8` — reserves a left gutter (e.g. for an overlaid selection checkbox). */
  "l-xl": "pl-[var(--appkit-space-8)]",
};

const Y_ONLY_MAP: Record<YPaddingKey, string> = {
  none: "",
  "y-2xs": "py-[var(--appkit-space-1)]",
  "y-2xs-tall": "py-[var(--appkit-space-1-5)]",
  "y-xs": "py-[var(--appkit-space-2)]",
  "y-xs-tall": "py-[var(--appkit-space-2-5)]",
  "y-sm": "py-[var(--appkit-space-3)]",
  "y-sm-tall": "py-[var(--appkit-space-3-5)]",
  "y-md": "py-[var(--appkit-space-4)]",
  "y-md-lg": "py-[var(--appkit-space-5)]",
  "y-lg": "py-[var(--appkit-space-6)]",
  "y-xl": "py-[var(--appkit-space-8)]",
  "y-2xl": "py-[var(--appkit-space-10)]",
  "y-3xl": "py-[var(--appkit-space-12)]",
  "y-2-5xl": "py-[var(--appkit-space-14)]",
  "y-4xl": "py-[var(--appkit-space-16)]",
  "y-5xl": "py-[var(--appkit-space-20)]",
  "y-6xl": "py-[var(--appkit-space-24)]",
  // Asymmetric top/bottom one-sided values (for sites that pad just one edge).
  "t-2xs": "pt-[var(--appkit-space-1)]",
  "b-2xs": "pb-[var(--appkit-space-1)]",
  "t-xs": "pt-[var(--appkit-space-2)]",
  "b-xs": "pb-[var(--appkit-space-2)]",
  "t-sm": "pt-[var(--appkit-space-3)]",
  "b-sm": "pb-[var(--appkit-space-3)]",
  "t-md": "pt-[var(--appkit-space-4)]",
  "b-md": "pb-[var(--appkit-space-4)]",
  "b-md-lg": "pb-[var(--appkit-space-5)]",
  "b-lg": "pb-[var(--appkit-space-6)]",
  /** Asymmetric: `pt-4 pb-6` — hotspot control bar with tighter top than bottom. */
  "t-md-b-lg": "pt-[var(--appkit-space-4)] pb-[var(--appkit-space-6)]",
};

export type OverflowKey = "auto" | "hidden" | "scroll" | "visible" | "x-auto" | "x-hidden" | "y-auto" | "y-hidden";

const OVERFLOW_MAP: Record<OverflowKey, string> = {
  auto: "overflow-auto",
  hidden: "overflow-hidden",
  scroll: "overflow-scroll",
  visible: "overflow-visible",
  "x-auto": "overflow-x-auto",
  "x-hidden": "overflow-x-hidden",
  "y-auto": "overflow-y-auto",
  "y-hidden": "overflow-y-hidden",
};

export interface SurfaceProps {
  surface?: SurfaceKey;
  padding?: PaddingKey;
  /** Independent horizontal padding. Use with `paddingY` when you need different x/y padding without authoring raw className. */
  paddingX?: XPaddingKey;
  /** Independent vertical padding. Use with `paddingX` when you need different x/y padding without authoring raw className. */
  paddingY?: YPaddingKey;
  rounded?: RoundedKey;
  /** Round only the top two corners — replaces raw `rounded-t-*` className on primitives. */
  roundedTop?: RoundedKey;
  /** Round only the bottom two corners — replaces raw `rounded-b-*` className on primitives. */
  roundedBottom?: RoundedKey;
  border?: BorderKey;
  shadow?: ShadowKey;
  /** Overflow behaviour — replaces consumer `overflow-*` className. */
  overflow?: OverflowKey;
}

export function buildSurfaceClasses(props: SurfaceProps): string {
  return [
    props.surface ? SURFACE_MAP[props.surface] : "",
    props.padding ? PADDING_MAP[props.padding] : "",
    props.paddingX ? X_ONLY_MAP[props.paddingX] : "",
    props.paddingY ? Y_ONLY_MAP[props.paddingY] : "",
    props.rounded ? ROUNDED_MAP[props.rounded] : "",
    props.roundedTop ? ROUNDED_TOP_MAP[props.roundedTop] : "",
    props.roundedBottom ? ROUNDED_BOTTOM_MAP[props.roundedBottom] : "",
    props.border ? BORDER_MAP[props.border] : "",
    props.shadow ? SHADOW_MAP[props.shadow] : "",
    props.overflow ? OVERFLOW_MAP[props.overflow] : "",
  ]
    .filter(Boolean)
    .join(" ");
}
