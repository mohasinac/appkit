/**
 * Surface & layout tokens — shared prop maps for all layout primitives.
 *
 * These maps power the Bootstrap/MUI-style props (`surface`, `padding`,
 * `rounded`, `border`, `shadow`) on Stack, Row, Grid, Container, Section,
 * Article, Main, Aside, Div, BlockHeader, and BlockFooter.
 */

export const SURFACE_MAP = {
  none: "",
  default: "bg-white dark:bg-slate-900",
  muted: "bg-zinc-50 dark:bg-slate-950",
  subtle: "bg-zinc-100 dark:bg-slate-900",
  inset: "bg-zinc-200 dark:bg-slate-800",
  card: "bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-xl shadow-sm",
  elevated: "bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-2xl shadow-md",
  interactive: "bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:border-primary-300/60 dark:hover:border-secondary-500/60 transition-all cursor-pointer",
  glass: "backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border border-zinc-200/60 dark:border-slate-700/40 rounded-2xl shadow-lg",
  form: "bg-white dark:bg-slate-900 rounded-2xl border border-zinc-200 dark:border-slate-700 shadow-sm",
  sidePanel: "bg-white dark:bg-slate-950",
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
  section: "py-10 sm:py-14 xl:py-20",
  sectionSm: "py-6 sm:py-10",
  page: "py-6 sm:py-8 lg:py-10",
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
