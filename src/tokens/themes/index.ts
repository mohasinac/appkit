import { DEFAULT_DARK_THEME } from "./default-dark";
import { DEFAULT_LIGHT_THEME } from "./default-light";
import { COBALT_NIGHT_THEME } from "./cobalt-night";
import { SUNSET_THEME } from "./sunset";
import type { ThemeMode, ThemeRecord } from "./types";

export { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME, COBALT_NIGHT_THEME, SUNSET_THEME };
export { REQUIRED_GRADIENT_KEYS, REQUIRED_THEME_TOKENS } from "./required";
export type { RequiredThemeToken } from "./required";
export type { GradientKey, ThemeMode, ThemeRecord } from "./types";

/** Built-in themes that ship with appkit; admin cannot delete these. */
export const BUILT_IN_THEMES: readonly ThemeRecord[] = [
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
];

/**
 * Selectable theme templates — not built-in (admin can delete/edit them),
 * but shipped pre-defined so they're available immediately in
 * `ThemeManagerView` without an admin hand-building a palette from scratch.
 */
export const THEME_TEMPLATES: readonly ThemeRecord[] = [
  COBALT_NIGHT_THEME,
  SUNSET_THEME,
];

/**
 * Find the default built-in theme for a given mode.
 * Used as a fallback when `siteSettings.theme.default{Light,Dark}ThemeId`
 * points at a deleted record.
 */
export function getDefaultBuiltInTheme(mode: ThemeMode): ThemeRecord {
  return mode === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
}
