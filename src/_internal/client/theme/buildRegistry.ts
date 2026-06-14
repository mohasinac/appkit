import {
  BUILT_IN_THEMES,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  type GradientKey,
  type ThemeRecord,
} from "../../../tokens/themes";

import type { ThemeRegistry } from "./ThemeProvider";

/**
 * Minimal shape this helper needs from `siteSettings.theme`. Kept loose so the
 * consumer can pass the live document or a stripped-down server-action payload
 * without dragging in the admin schemas package.
 */
export interface SiteSettingsThemeInput {
  themes?: Array<{
    id: string;
    name: string;
    mode: "light" | "dark";
    builtIn?: boolean;
    tokens: Record<string, string>;
    gradients: Record<string, string>;
  }>;
  defaultLightThemeId?: string;
  defaultDarkThemeId?: string;
}

/**
 * Build a runtime theme registry from `siteSettings.theme`.
 *
 * - Built-in themes (`default-light`, `default-dark`) are always present, even
 *   if the admin tries to omit them from the stored list.
 * - Admin-authored records override built-ins of the same id (allows the admin
 *   to override the default palette without losing the built-in fallback path).
 * - `defaultLightThemeId` / `defaultDarkThemeId` fall back to the built-ins when
 *   the stored ids are missing or point at a record whose mode does not match.
 */
export function buildThemeRegistry(input: SiteSettingsThemeInput | undefined | null): ThemeRegistry {
  const byId = new Map<string, ThemeRecord>();
  for (const built of BUILT_IN_THEMES) {
    byId.set(built.id, built);
  }
  for (const admin of input?.themes ?? []) {
    byId.set(admin.id, {
      id: admin.id,
      name: admin.name,
      mode: admin.mode,
      builtIn: Boolean(admin.builtIn),
      tokens: admin.tokens,
      gradients: admin.gradients as Record<GradientKey, string>,
    });
  }

  const themes = Array.from(byId.values());
  const wantedLight = input?.defaultLightThemeId ?? DEFAULT_LIGHT_THEME.id;
  const wantedDark = input?.defaultDarkThemeId ?? DEFAULT_DARK_THEME.id;

  const lightMatches = themes.find((t) => t.id === wantedLight && t.mode === "light");
  const darkMatches = themes.find((t) => t.id === wantedDark && t.mode === "dark");

  return {
    themes,
    defaultLightThemeId: lightMatches?.id ?? DEFAULT_LIGHT_THEME.id,
    defaultDarkThemeId: darkMatches?.id ?? DEFAULT_DARK_THEME.id,
  };
}
