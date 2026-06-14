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
} as const;

export type SurfaceKey = keyof typeof SURFACE_MAP;

export const PADDING_MAP = {
  none: "",
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
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
} as const;

export type PaddingKey = keyof typeof PADDING_MAP;

export const ROUNDED_MAP = {
  none: "",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
} as const;

export type RoundedKey = keyof typeof ROUNDED_MAP;

export const BORDER_MAP = {
  none: "",
  default: "border border-zinc-200 dark:border-slate-700",
  subtle: "border border-zinc-100 dark:border-slate-800/60",
  strong: "border border-zinc-300 dark:border-slate-600",
  dashed: "border border-dashed border-zinc-300 dark:border-slate-600",
} as const;

export type BorderKey = keyof typeof BORDER_MAP;

export const SHADOW_MAP = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
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

export interface SurfaceProps {
  surface?: SurfaceKey;
  padding?: PaddingKey;
  rounded?: RoundedKey;
  border?: BorderKey;
  shadow?: ShadowKey;
}

export function buildSurfaceClasses(props: SurfaceProps): string {
  return [
    props.surface ? SURFACE_MAP[props.surface] : "",
    props.padding ? PADDING_MAP[props.padding] : "",
    props.rounded ? ROUNDED_MAP[props.rounded] : "",
    props.border ? BORDER_MAP[props.border] : "",
    props.shadow ? SHADOW_MAP[props.shadow] : "",
  ]
    .filter(Boolean)
    .join(" ");
}
