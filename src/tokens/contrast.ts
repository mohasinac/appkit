/**
 * WCAG contrast ratio, for the live check in `ThemeManagerView`'s colour
 * inputs. A build-script twin of this formula lives in
 * `scripts/audit-color-contrast.mjs`, which enforces the same AAA
 * thresholds against the four shipped theme presets — kept separate on
 * purpose: that script runs standalone with no appkit dependency, the same
 * lane-boundary reason several other audit/library pairs in this codebase
 * stay duplicated rather than sharing one module.
 */

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses `#rrggbb` or `rgb(a)(...)`. Returns `null` for anything else (a CSS function, a bare var() reference, empty input). */
export function parseCssColor(value: string): ParsedColor | null {
  const hex = value.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] !== undefined ? Number(rgba[4]) : 1,
    };
  }
  return null;
}

/** Alpha-composite `fg` over an opaque `bg`, returning an opaque colour. */
export function compositeOver(fg: ParsedColor, bg: ParsedColor): ParsedColor {
  if (fg.a >= 1) return fg;
  return {
    r: fg.a * fg.r + (1 - fg.a) * bg.r,
    g: fg.a * fg.g + (1 - fg.a) * bg.g,
    b: fg.a * fg.b + (1 - fg.a) * bg.b,
    a: 1,
  };
}

function relativeLuminance({ r, g, b }: ParsedColor): number {
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** WCAG contrast ratio between two opaque colours, 1 (none) to 21 (black/white). */
export function contrastRatio(a: ParsedColor, b: ParsedColor): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AAA — 7:1 normal text, 4.5:1 large text/icons. */
export const AAA_NORMAL_TEXT_MIN = 7;
export const AAA_LARGE_TEXT_MIN = 4.5;

/**
 * Convenience for the editor: ratio between two raw colour strings against a
 * given backdrop (for alpha-compositing a translucent value). Returns `null`
 * when either string does not parse — the caller renders "—" rather than a
 * false measurement.
 */
export function contrastRatioFromStrings(
  fgValue: string,
  bgValue: string,
  backdropValue: string,
): number | null {
  const fg = parseCssColor(fgValue);
  const bg = parseCssColor(bgValue);
  const backdrop = parseCssColor(backdropValue);
  if (!fg || !bg || !backdrop) return null;
  const opaqueFg = compositeOver(fg, backdrop);
  const opaqueBg = compositeOver(bg, backdrop);
  return contrastRatio(opaqueFg, opaqueBg);
}

/**
 * The same pair set `scripts/audit-color-contrast.mjs` checks against the
 * four shipped presets, for the LIVE check in `ThemeManagerView`. Kept here
 * rather than only in the script so the editor can warn an admin before
 * they save a pairing the build-time audit would later reject.
 */
export interface ContrastPairRule {
  bg: string;
  fg: string;
  min: number;
  label: string;
  lightOnly?: boolean;
  darkOnly?: boolean;
}

const BODY_BACKGROUNDS = [
  "appkit-color-bg",
  "appkit-color-surface",
  "appkit-color-surface-elevated",
  "appkit-color-surface-input",
  "appkit-color-border-subtle",
];
const BODY_FOREGROUNDS = [
  "appkit-color-text",
  "appkit-color-text-muted",
  "appkit-color-text-faint",
];

export const CONTRAST_PAIR_RULES: readonly ContrastPairRule[] = [
  ...BODY_BACKGROUNDS.flatMap((bg) =>
    BODY_FOREGROUNDS.map((fg) => ({ bg, fg, min: AAA_NORMAL_TEXT_MIN, label: `${fg} on ${bg}` })),
  ),
  ...["success", "warning", "error", "info"].map((status) => ({
    bg: `appkit-color-${status}-surface`,
    fg: `appkit-color-${status}`,
    min: AAA_LARGE_TEXT_MIN,
    label: `${status} badge`,
  })),
  { bg: "appkit-color-primary-700", fg: "appkit-color-text-on-primary", min: AAA_NORMAL_TEXT_MIN, label: "primary button (light)", lightOnly: true },
  { bg: "appkit-color-secondary", fg: "appkit-color-text-on-primary", min: AAA_NORMAL_TEXT_MIN, label: "primary button (dark)", darkOnly: true },
];

export interface ContrastIssue {
  label: string;
  ratio: number;
  min: number;
}

/**
 * Checks `CONTRAST_PAIR_RULES` against a resolved token map (the draft's own
 * overrides merged over its mode's built-in fallback — same merge
 * `ThemeProvider.applyTheme` effectively produces). Returns only the
 * failing pairs; an unresolved pair (a value the parser can't read, e.g. a
 * `var(...)` reference) is silently skipped rather than reported — the
 * build-time audit is the authority on anything this live check cannot
 * parse.
 */
export function findContrastIssues(
  tokens: Record<string, string>,
  mode: "light" | "dark",
): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  const backdrop = tokens["appkit-color-bg"];
  if (!backdrop) return issues;
  for (const rule of CONTRAST_PAIR_RULES) {
    if (rule.lightOnly && mode !== "light") continue;
    if (rule.darkOnly && mode !== "dark") continue;
    const bgValue = tokens[rule.bg];
    const fgValue = tokens[rule.fg];
    if (!bgValue || !fgValue) continue;
    const ratio = contrastRatioFromStrings(fgValue, bgValue, backdrop);
    if (ratio === null) continue;
    if (ratio < rule.min) issues.push({ label: rule.label, ratio, min: rule.min });
  }
  return issues;
}
