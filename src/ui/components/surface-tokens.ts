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
  // Skeleton loader presets — light grey + dark variant.
  skeleton: "bg-zinc-300 dark:bg-slate-700",
  "skeleton-light": "bg-zinc-200 dark:bg-slate-800",
} as const;

export type SurfaceKey = keyof typeof SURFACE_MAP;

export const PADDING_MAP = {
  none: "",
  "2xs": "p-1",
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
  "5": "p-5",
  lg: "p-6",
  xl: "p-8",
  card: "p-5 sm:p-6 lg:p-8",
  "card-tight": "p-3 sm:p-4",
  section: "py-10 sm:py-14 xl:py-20",
  sectionSm: "py-6 sm:py-10",
  page: "py-6 sm:py-8 lg:py-10",
  hero: "py-12 sm:py-16 lg:py-24",
  toolbar: "px-3 py-1.5",
  inline: "px-4 py-3",
  inlineSm: "px-3 py-2",
  inlineLg: "px-6 py-4",
  /** Tiny pill chip — `px-1.5 py-0.5`. Used by Bundle/PrizeDraw badge labels. */
  "chip-2xs": "px-1.5 py-0.5",
  // Vertical-only presets — the variant-catalogue codemod migrates raw
  // `py-N` / `py-N md:py-M` className tokens into these names.
  "y-2xs": "py-1",
  "y-xs": "py-2",
  "y-sm": "py-3",
  "y-md": "py-4",
  "y-lg": "py-6",
  "y-xl": "py-8",
  "y-2xl": "py-10",
  "y-3xl": "py-12",
  "y-4xl": "py-16",
  // Horizontal-only presets.
  "x-xs": "px-2",
  "x-sm": "px-3",
  "x-md": "px-4",
  "x-lg": "px-6",
  "x-xl": "px-8",
  // Top-only and bottom-only side presets.
  "t-2xs": "pt-1",
  "b-2xs": "pb-1",
  "t-xs": "pt-2",
  "t-sm": "pt-3",
  "t-md": "pt-4",
  "t-lg": "pt-6",
  "t-xl": "pt-8",
  "b-xs": "pb-2",
  "b-sm": "pb-3",
  "b-md": "pb-4",
  "b-lg": "pb-6",
  "b-xl": "pb-8",
  "b-2xl": "pb-10",
  // Fill-in vertical sizes.
  "y-2-5xl": "py-14",
  "y-5xl": "py-20",
  "y-6xl": "py-24",
  // Responsive banner preset — used by accent-banner Sections.
  banner: "py-14 md:py-16 lg:py-20",
  // Responsive content preset — about-views inner container padding.
  "content-banner": "py-10 md:py-12 lg:py-16",
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

export const BORDER_MAP = {
  none: "",
  default: "border border-zinc-200 dark:border-slate-700",
  subtle: "border border-zinc-100 dark:border-slate-800/60",
  strong: "border border-zinc-300 dark:border-slate-600",
  dashed: "border border-dashed border-zinc-300 dark:border-slate-600",
  bottom: "border-b border-zinc-200 dark:border-slate-700",
  "bottom-subtle": "border-b border-zinc-100 dark:border-slate-800/60",
  top: "border-t border-zinc-200 dark:border-slate-700",
  "top-subtle": "border-t border-zinc-100 dark:border-slate-800/60",
  /** 2px border for skeleton placeholder cards. */
  "skeleton": "border-2 border-zinc-100 dark:border-slate-700",
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
  xs: "gap-1",
  sm: "gap-2",
  dense: "gap-2",
  md: "gap-3",
  comfortable: "gap-3",
  lg: "gap-4",
  loose: "gap-4",
  xl: "gap-5",
  "2xl": "gap-6",
  section: "gap-6 sm:gap-8",
  hero: "gap-10 sm:gap-12",
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

type XPaddingKey = "none" | "x-xs" | "x-sm" | "x-md" | "x-5" | "x-lg" | "x-xl" | "x-sm-md" | "x-sm-lg-md" | "x-md-lg" | "x-md-xl" | "x-md-2xl" | "x-page";
type YPaddingKey = "none" | "y-2xs" | "y-2xs-tall" | "y-xs" | "y-xs-tall" | "y-sm" | "y-sm-tall" | "y-md" | "y-md-lg" | "y-lg" | "y-xl" | "y-2xl" | "y-3xl" | "y-4xl" | "y-5xl" | "y-6xl" | "y-2-5xl" | "t-2xs" | "b-2xs" | "t-xs" | "b-xs" | "t-sm" | "b-sm" | "t-md" | "b-md" | "b-md-lg" | "b-lg";

const X_ONLY_MAP: Record<XPaddingKey, string> = {
  none: "",
  "x-xs": "px-2",
  "x-sm": "px-3",
  "x-md": "px-4",
  "x-5": "px-5",
  "x-lg": "px-6",
  "x-xl": "px-8",
  /** Responsive: `px-3 sm:px-4` — the canonical mobile-tight container. */
  "x-sm-md": "px-3 sm:px-4",
  /** Responsive: `px-3 lg:px-4` — the canonical mobile-tight wide container. */
  "x-sm-lg-md": "px-3 lg:px-4",
  /** Responsive: `px-4 sm:px-6` — narrow container horizontal padding. */
  "x-md-lg": "px-4 sm:px-6",
  /** Responsive: `px-6 md:px-10` — guide hub / store-extension container padding. */
  "x-md-xl": "px-6 md:px-10",
  /** Responsive: `px-4 sm:px-8` — section header container padding. */
  "x-md-2xl": "px-4 sm:px-8",
  /** Responsive: `px-4 sm:px-6 lg:px-8` — canonical page-container horizontal padding. */
  "x-page": "px-4 sm:px-6 lg:px-8",
};

const Y_ONLY_MAP: Record<YPaddingKey, string> = {
  none: "",
  "y-2xs": "py-1",
  "y-2xs-tall": "py-1.5",
  "y-xs": "py-2",
  "y-xs-tall": "py-2.5",
  "y-sm": "py-3",
  "y-sm-tall": "py-3.5",
  "y-md": "py-4",
  "y-md-lg": "py-5",
  "y-lg": "py-6",
  "y-xl": "py-8",
  "y-2xl": "py-10",
  "y-3xl": "py-12",
  "y-2-5xl": "py-14",
  "y-4xl": "py-16",
  "y-5xl": "py-20",
  "y-6xl": "py-24",
  // Asymmetric top/bottom one-sided values (for sites that pad just one edge).
  "t-2xs": "pt-1",
  "b-2xs": "pb-1",
  "t-xs": "pt-2",
  "b-xs": "pb-2",
  "t-sm": "pt-3",
  "b-sm": "pb-3",
  "t-md": "pt-4",
  "b-md": "pb-4",
  "b-md-lg": "pb-5",
  "b-lg": "pb-6",
};

export interface SurfaceProps {
  surface?: SurfaceKey;
  padding?: PaddingKey;
  /** Independent horizontal padding. Use with `paddingY` when you need different x/y padding without authoring raw className. */
  paddingX?: XPaddingKey;
  /** Independent vertical padding. Use with `paddingX` when you need different x/y padding without authoring raw className. */
  paddingY?: YPaddingKey;
  rounded?: RoundedKey;
  border?: BorderKey;
  shadow?: ShadowKey;
}

export function buildSurfaceClasses(props: SurfaceProps): string {
  return [
    props.surface ? SURFACE_MAP[props.surface] : "",
    props.padding ? PADDING_MAP[props.padding] : "",
    props.paddingX ? X_ONLY_MAP[props.paddingX] : "",
    props.paddingY ? Y_ONLY_MAP[props.paddingY] : "",
    props.rounded ? ROUNDED_MAP[props.rounded] : "",
    props.border ? BORDER_MAP[props.border] : "",
    props.shadow ? SHADOW_MAP[props.shadow] : "",
  ]
    .filter(Boolean)
    .join(" ");
}
