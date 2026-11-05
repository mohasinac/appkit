/*
 * WHY: 2A (overhaul brief) — a `IDesignPack` contract was proposed to
 *      abstract color/font/spacing/radius/tracking/motion behind one
 *      interface. Correctly NOT built as a multi-implementation
 *      abstraction: colors/fonts/spacing are already Firestore-theme-driven
 *      (`SiteSettingsThemeRecord.tokens`, injected as CSS custom properties
 *      by `LayoutShellClient`), and radius/tracking/motion are Tailwind's
 *      own static, compiled tokens — both paths already resolve to the
 *      SAME mechanism (a `--appkit-*` CSS custom property), which is what
 *      makes a single, real implementation correct rather than premature:
 *      there is no second design-token SOURCE to abstract over, only one
 *      access pattern worth naming.
 * WHAT: `IDesignPack` (6 typed accessors) + `cssVarDesignPack`, the one
 *       real implementation, reading computed `--appkit-*` custom
 *       properties off a given element (default: the document root).
 *
 * EXPORTS: IDesignPack, cssVarDesignPack
 *
 * @tag domain:ui
 * @tag layer:client
 * @tag pattern:none
 * @tag access:client-only
 * @tag consumers:none-yet
 * @tag sideEffects:none
 */

export interface IDesignPack {
  /** `--appkit-color-{token}`, e.g. `color("primary")`. Theme-overridable. */
  color(token: string): string;
  /** `--appkit-font-{token}`. Theme-overridable. */
  font(token: string): string;
  /** `--appkit-space-{token}`. Theme-overridable. */
  spacing(token: string): string;
  /** `--appkit-radius-{token}`. Tailwind-static, not theme-overridable. */
  radius(token: string): string;
  /** `--appkit-tracking-{token}`. Tailwind-static, not theme-overridable. */
  tracking(token: string): string;
  /** `--appkit-duration-{token}`. Tailwind-static, not theme-overridable. */
  motion(token: string): string;
}

function readVar(prefix: string, token: string, element?: HTMLElement): string {
  const el = element ?? (typeof document !== "undefined" ? document.documentElement : undefined);
  if (!el || typeof getComputedStyle !== "function") return "";
  return getComputedStyle(el).getPropertyValue(`--appkit-${prefix}-${token}`).trim();
}

/**
 * The one real `IDesignPack` implementation — see this file's header for
 * why a second one isn't a design gap to fill. `element` lets a caller
 * read tokens off a scoped subtree (e.g. inside a themed preview panel)
 * rather than always the document root.
 */
export function cssVarDesignPack(element?: HTMLElement): IDesignPack {
  return {
    color: (token) => readVar("color", token, element),
    font: (token) => readVar("font", token, element),
    spacing: (token) => readVar("space", token, element),
    radius: (token) => readVar("radius", token, element),
    tracking: (token) => readVar("tracking", token, element),
    motion: (token) => readVar("duration", token, element),
  };
}
