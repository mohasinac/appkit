import { DEFAULT_DARK_THEME } from "./default-dark";
import { DEFAULT_LIGHT_THEME } from "./default-light";
import type { ThemeMode, ThemeRecord } from "./types";

export { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME };
export { REQUIRED_GRADIENT_KEYS, REQUIRED_THEME_TOKENS } from "./required";
export type { RequiredThemeToken } from "./required";
export type { GradientKey, ThemeMode, ThemeRecord } from "./types";

/** Built-in themes that ship with appkit; admin cannot delete these. */
export const BUILT_IN_THEMES: readonly ThemeRecord[] = [
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
];

/**
 * Find the default built-in theme for a given mode.
 * Used as a fallback when `siteSettings.theme.default{Light,Dark}ThemeId`
 * points at a deleted record.
 */
export function getDefaultBuiltInTheme(mode: ThemeMode): ThemeRecord {
  return mode === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
}
