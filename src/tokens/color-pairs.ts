import type { SurfaceKey } from "../ui/components/surface-tokens";

/**
 * Colors as a function, not a convention.
 *
 * Every layout primitive that accepts a `surface` prop (Stack, Row, Grid,
 * Container, Section, Div, Card) used to pick its background and its text
 * color completely independently — nothing stopped a consumer from combining
 * a light surface with light text, because there was no single source of
 * truth pairing them. `getSurfaceTextPair` is that source of truth: one
 * lookup, one entry per surface token, each entry a real CSS-var pair
 * already used somewhere in this codebase (this is a consolidation of
 * existing choices, not a new palette).
 *
 * `buildSurfaceClasses` (surface-tokens.ts) calls this automatically so
 * every consumer of a `surface` prop gets a readable default text color for
 * free. A child element's own explicit `color`/`text-*` class still wins
 * (normal CSS specificity — the default only fills in when nothing more
 * specific is set), so this is additive, not a breaking change.
 */

export interface SurfaceTextPair {
  /** CSS var reference for the surface's default (non-muted) text color. */
  textVar: string;
  /** CSS var reference for secondary/de-emphasized text on this surface. */
  textMutedVar: string;
  /** CSS var reference for the lowest-emphasis text on this surface. */
  textFaintVar: string;
}

const DEFAULT_PAIR: SurfaceTextPair = {
  textVar: "var(--appkit-color-text)",
  textMutedVar: "var(--appkit-color-text-muted)",
  textFaintVar: "var(--appkit-color-text-faint)",
};

const ON_PRIMARY_PAIR: SurfaceTextPair = {
  textVar: "var(--appkit-color-text-on-primary)",
  textMutedVar: "var(--appkit-color-text-on-primary)",
  textFaintVar: "var(--appkit-color-text-on-primary)",
};

/**
 * One entry per `SurfaceKey` (surface-tokens.ts). Surfaces that are light
 * neutrals (default/muted/subtle/inset/card/elevated/interactive/form/
 * sidePanel/skeleton/status-surfaces) pair with the theme's standard
 * text/text-muted/text-faint triad, since those surfaces are always close
 * to `--appkit-color-surface`/`--appkit-color-bg` in lightness regardless of
 * theme. Surfaces that are dark overlays or near-black regardless of theme
 * mode (overlay-*, media-dark) pair with on-primary (white-on-dark) text —
 * they never lighten in dark mode, so a theme-relative text color would
 * become unreadable exactly when the surface is at its darkest.
 */
export const SURFACE_TEXT_PAIR_MAP: Record<SurfaceKey, SurfaceTextPair> = {
  none: DEFAULT_PAIR,
  default: DEFAULT_PAIR,
  muted: DEFAULT_PAIR,
  subtle: DEFAULT_PAIR,
  inset: DEFAULT_PAIR,
  card: DEFAULT_PAIR,
  elevated: DEFAULT_PAIR,
  interactive: DEFAULT_PAIR,
  glass: DEFAULT_PAIR,
  form: DEFAULT_PAIR,
  sidePanel: DEFAULT_PAIR,
  "success-surface": {
    textVar: "var(--appkit-color-success)",
    textMutedVar: "var(--appkit-color-success)",
    textFaintVar: "var(--appkit-color-text-muted)",
  },
  "danger-surface": {
    textVar: "var(--appkit-color-error)",
    textMutedVar: "var(--appkit-color-error)",
    textFaintVar: "var(--appkit-color-text-muted)",
  },
  "warning-surface": {
    textVar: "var(--appkit-color-warning)",
    textMutedVar: "var(--appkit-color-warning)",
    textFaintVar: "var(--appkit-color-text-muted)",
  },
  "info-surface": {
    textVar: "var(--appkit-color-info)",
    textMutedVar: "var(--appkit-color-info)",
    textFaintVar: "var(--appkit-color-text-muted)",
  },
  frost: ON_PRIMARY_PAIR,
  "overlay-xs": ON_PRIMARY_PAIR,
  "overlay-sm": ON_PRIMARY_PAIR,
  "overlay-md": ON_PRIMARY_PAIR,
  "overlay-lg": ON_PRIMARY_PAIR,
  "overlay-xl": ON_PRIMARY_PAIR,
  skeleton: DEFAULT_PAIR,
  "skeleton-light": DEFAULT_PAIR,
  "media-dark": ON_PRIMARY_PAIR,
};

export function getSurfaceTextPair(surface: SurfaceKey): SurfaceTextPair {
  return SURFACE_TEXT_PAIR_MAP[surface] ?? DEFAULT_PAIR;
}

/**
 * Fixed, statically-written Tailwind arbitrary-value classes — one per
 * distinct `textVar` that can appear in `SURFACE_TEXT_PAIR_MAP`. Every class
 * string below is a complete literal Tailwind can find via its static
 * content scan. Building this string via runtime template-literal
 * interpolation (`` `text-[${pair.textVar}]` ``) instead would make Tailwind's
 * scanner unable to see it — no CSS rule would ever be generated — caught by
 * `audit-dynamic-tailwind-arbitrary.mjs`.
 */
const TEXT_VAR_TO_CLASS: Record<string, string> = {
  "var(--appkit-color-text)": "text-[var(--appkit-color-text)]",
  "var(--appkit-color-text-on-primary)": "text-[var(--appkit-color-text-on-primary)]",
  "var(--appkit-color-success)": "text-[var(--appkit-color-success)]",
  "var(--appkit-color-error)": "text-[var(--appkit-color-error)]",
  "var(--appkit-color-warning)": "text-[var(--appkit-color-warning)]",
  "var(--appkit-color-info)": "text-[var(--appkit-color-info)]",
};

/**
 * Tailwind class for the surface's default text color, e.g.
 * `text-[var(--appkit-color-text)]`. `buildSurfaceClasses` appends this so
 * every `surface`-bearing primitive gets a readable default.
 */
export function getSurfaceTextClass(surface: SurfaceKey): string {
  if (surface === "none") return "";
  const pair = getSurfaceTextPair(surface);
  return TEXT_VAR_TO_CLASS[pair.textVar] ?? "";
}
