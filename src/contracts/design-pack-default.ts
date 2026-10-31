// --- Default Design Pack ------------------------------------------------------

import {
  SURFACE_MAP,
  PADDING_MAP,
  ROUNDED_MAP,
  BORDER_MAP,
  SHADOW_MAP,
  GAP_PRESETS,
  type SurfaceKey,
  type PaddingKey,
  type RoundedKey,
  type BorderKey,
  type ShadowKey,
  type GapPresetKey,
} from "../ui/components/surface-tokens";
import { MOTION_PRESETS, type MotionPreset } from "../tokens/motion";
import type { IDesignPack, RadiusKey, TrackingKey } from "./design-pack";

/**
 * Wraps the maps that already exist — `DEFAULT_DESIGN_PACK` is what every
 * install gets with zero configuration, and it changes nothing about how
 * `surface-tokens.ts` or `tokens.css` behave. See `design-pack.ts`'s
 * docstring for why the maps themselves are not moved behind this.
 */
export const DEFAULT_DESIGN_PACK: IDesignPack = {
  surface: (key: SurfaceKey) => SURFACE_MAP[key],
  padding: (key: PaddingKey) => PADDING_MAP[key],
  rounded: (key: RoundedKey) => ROUNDED_MAP[key],
  border: (key: BorderKey) => BORDER_MAP[key],
  shadow: (key: ShadowKey) => SHADOW_MAP[key],
  gap: (key: GapPresetKey) => GAP_PRESETS[key],
  radius: (key: RadiusKey) => `var(--appkit-radius-${key})`,
  tracking: (key: TrackingKey) => `var(--appkit-tracking-${key})`,
  motion: (key: MotionPreset) => MOTION_PRESETS[key],
};
