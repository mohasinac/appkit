/**
 * Theme preset shape.
 *
 * A theme record is a token override map applied at runtime by `ThemeProvider`.
 * Every theme declares its `mode` (light / dark — picked by the user's preference)
 * and a `tokens` map keyed by CSS custom-property name (without the `--` prefix).
 *
 * Theme records are admin-configurable via Site Settings → Themes. The two
 * built-in themes (`default-light`, `default-dark`) are pinned and cannot be
 * deleted; they are the source of truth for the existing brand palette.
 */
export type ThemeMode = "light" | "dark";

export interface ThemeRecord {
  /** Stable id used as `<html data-theme={id}>` and as the persisted reference. */
  id: string;
  /** Human-readable name surfaced in the admin editor. */
  name: string;
  /** Which user-facing mode this theme applies to. */
  mode: ThemeMode;
  /** `true` for `default-light` / `default-dark`; admin cannot delete or edit colour-by-colour. */
  builtIn: boolean;
  /**
   * CSS-variable overrides, keyed by token name (without leading `--`).
   * Example key: `"appkit-color-primary"` → value: `"#3570fc"`.
   *
   * Keys MUST come from the catalogue declared in `./required.ts`.
   */
  tokens: Readonly<Record<string, string>>;
  /**
   * Gradient overrides keyed by gradient slot id.
   * Each value is a complete CSS gradient expression so the admin can vary
   * direction, stops, opacity, and easing — not just stop colours.
   */
  gradients: Readonly<Record<GradientKey, string>>;
}

/** The named gradient slots every theme must declare. */
export type GradientKey =
  | "brand"
  | "brand-tri"
  | "accent"
  | "accent-divider"
  | "page-header"
  | "section-warm"
  | "section-cool"
  | "section-mesh"
  | "accent-banner"
  | "promotion"
  | "spotlight"
  | "whatsapp-card"
  | "glass"
  | "card-indigo"
  | "card-teal"
  | "card-amber"
  | "card-rose"
  | "logo";
