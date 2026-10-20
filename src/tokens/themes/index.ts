import { DEFAULT_DARK_THEME } from "./default-dark";
import { DEFAULT_LIGHT_THEME } from "./default-light";
import { COBALT_NIGHT_THEME } from "./cobalt-night";
import { SUNSET_THEME } from "./sunset";
import { TECHNICAL_DARK_THEME } from "./technical-dark";
import { TECHNICAL_LIGHT_THEME } from "./technical-light";
import type { ThemeMode, ThemeRecord } from "./types";

export {
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  COBALT_NIGHT_THEME,
  SUNSET_THEME,
  TECHNICAL_DARK_THEME,
  TECHNICAL_LIGHT_THEME,
};
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
  /*
   * Technical Dark / Light — a developer-tool identity: graphite surfaces,
   * hairline borders, a mono-forward type stack and syntax-palette accents
   * reused semantically (difficulty badges, submission verdicts, status chips).
   * Shipped as a matched PAIR so switching mode does not change identity.
   */
  TECHNICAL_DARK_THEME,
  TECHNICAL_LIGHT_THEME,
];

/**
 * Find the default built-in theme for a given mode.
 * Used as a fallback when `siteSettings.theme.default{Light,Dark}ThemeId`
 * points at a deleted record.
 */
export function getDefaultBuiltInTheme(mode: ThemeMode): ThemeRecord {
  return mode === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
}
