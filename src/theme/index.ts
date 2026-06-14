/**
 * Public re-export of the appkit theme primitives.
 *
 * `ThemeProvider`, `useTheme`, and the related types live in
 * `_internal/client/theme/` because they are consumed by both the public
 * `client.ts` barrel and other internal modules. This file is the canonical
 * public surface — `client.ts` re-exports through here so the
 * `audit-appkit-reexports` rule (no `_internal/` in public barrels) stays
 * green. Mirrors the `utils/action-result.ts` pattern.
 */

export { ThemeProvider, useTheme } from "../_internal/client/theme";
export type {
  ModePreference,
  ThemeContextValue,
  ThemeProviderProps,
  ThemeRegistry,
} from "../_internal/client/theme";
export { buildThemeRegistry } from "../_internal/client/theme";
export type { SiteSettingsThemeInput } from "../_internal/client/theme";
