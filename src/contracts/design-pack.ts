// --- Design Pack Contract -----------------------------------------------------

import type {
  SurfaceKey,
  PaddingKey,
  RoundedKey,
  BorderKey,
  ShadowKey,
  GapPresetKey,
} from "../ui/components/surface-tokens";
import type { MOTION_PRESETS, MotionPreset } from "../tokens/motion";

/**
 * The design-value seam. Point 3 of the overhaul brief ("variables and
 * constants should never be hard coded") was already true for colors, fonts,
 * spacing and font-size — those are Firestore-theme-driven via
 * `REQUIRED_THEME_TOKENS` + `ThemeProvider.applyTheme`. Radius, letter-spacing
 * and motion were the gap: fixed in `tokens.css`'s `:root` block with no
 * per-theme override seam, and the six Tailwind-class lookup tables in
 * `surface-tokens.ts` (`SURFACE_MAP`, `PADDING_MAP`, `ROUNDED_MAP`,
 * `BORDER_MAP`, `SHADOW_MAP`, `GAP_PRESETS`) had no seam at all.
 *
 * ## The six class-lookup methods do not move the maps
 *
 * Same pattern as `ITaxProvider`'s India-GST fields: `SURFACE_MAP` etc. stay
 * exactly where they are in `surface-tokens.ts`, read as PLAIN TEXT by
 * Tailwind's content scanner — moving them behind a dynamic lookup would stop
 * the scanner from ever generating those classes. `DEFAULT_DESIGN_PACK`
 * (`design-pack-default.ts`) is a thin wrapper around the existing maps, not a
 * reimplementation, and the ~90 existing call sites that read the maps
 * directly are untouched — this is a seam for new/opt-in callers and a future
 * second implementation, not a 90-file sweep.
 *
 * ## `radius`/`tracking` return a `var(--...)` reference, not a bare value
 *
 * Mirrors `IStyleAdapter.token()`'s existing convention
 * (`token("color-primary")` → `"var(--appkit-color-primary)"`), so a caller
 * building an inline style object gets the same shape either way. Most
 * consumption of these two scales is raw `var(--appkit-radius-lg)` in
 * `.style.css` files, which cannot go through any JS seam — CSS has no way to
 * call a function — so these two methods exist for the minority of call
 * sites (an inline `style={{ borderRadius: ... }}`) that are JS, not CSS.
 */
export interface IDesignPack {
  surface(key: SurfaceKey): string;
  padding(key: PaddingKey): string;
  rounded(key: RoundedKey): string;
  border(key: BorderKey): string;
  shadow(key: ShadowKey): string;
  gap(key: GapPresetKey): string;
  /** `radius("lg")` → `"var(--appkit-radius-lg)"`. */
  radius(key: RadiusKey): string;
  /** `tracking("wide")` → `"var(--appkit-tracking-wide)"`. */
  tracking(key: TrackingKey): string;
  /**
   * The `motion/react` variant/transition config for one named preset.
   * Unlike the other methods, this returns an OBJECT, not a CSS string —
   * `MOTION_PRESETS` values are framer-motion configs, not Tailwind classes.
   */
  motion(key: MotionPreset): (typeof MOTION_PRESETS)[MotionPreset];
}

/** Matches the radius scale in `tokens.css`'s `:root` block. */
export type RadiusKey =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "card"
  | "btn"
  | "full";

/** Matches the letter-spacing scale in `tokens.css`'s `:root` block. */
export type TrackingKey = "tighter" | "tight" | "normal" | "wide" | "wider";
