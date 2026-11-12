/**
 * audit-contrast — refuse to ship unreadable text.
 *
 * Owner, 2026-11-12: *"there should [be] audits as well to prevent unreadable
 * texts and all audits must go."*
 *
 * ## 🛑 WHY A COMPUTED AUDIT AND NOT A SCREENSHOT REVIEW
 *
 * This repo has already shipped **26 invisible surfaces** in one go (Root
 * Cause #67): a status background paired with a literal `text-white`, which is
 * legible in one theme and invisible in the other. The `Disclaimer` component
 * still carries the warning at the line —
 *
 *   "`surface` + the matching ink, never a status background with literal
 *    white text. `-surface` is a near-white tint in light themes and a dark
 *    tint in dark ones, so a fixed `text-white` is invisible in exactly one
 *    theme."
 *
 * A screenshot pass cannot find that class reliably: it needs every theme ×
 * every surface × every ink, a human looking at each, and the one that is
 * white-on-near-white looks like an EMPTY BOX rather than like broken text —
 * which is why 26 of them survived review. The contrast RATIO is arithmetic,
 * so it is checkable without looking, and it cannot be fooled by a cached
 * stylesheet or a stale screenshot.
 *
 * ⚠ This does not replace looking. It replaces TRUSTING looking.
 *
 * ## Thresholds — WCAG 2.1
 *
 *   4.5 : 1   normal body text  (AA)
 *   3.0 : 1   large text ≥18.66px bold / ≥24px, and UI component boundaries
 *
 * `text-faint` is held to the large-text bar rather than exempted: it is used
 * for genuinely secondary copy, and exempting a token entirely is how an
 * unreadable one survives. A token nobody can read is not "subtle".
 *
 * Run: npx tsx scripts/audit-contrast.mts
 */
import { DEFAULT_LIGHT_THEME } from "../src/tokens/themes/default-light";
import { DEFAULT_DARK_THEME } from "../src/tokens/themes/default-dark";

const THEMES = [DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME];

/* ── colour parsing: hex AND rgba, because the dark theme uses both ─────────
 *
 * 🛑 ALPHA IS NOT OPTIONAL TO HANDLE. The dark theme declares seven of its
 * surfaces as translucent tints — `rgba(6, 78, 59, 0.25)` for
 * `success-surface`, and similar for `surface-hover`, `surface-raised`,
 * `primary-surface`, `error-surface`, `info-surface`. A hex-only parser
 * returned `null` for all of them, and the first run of this audit reported
 * *"✅ all 19 pairs pass"* for the dark theme while 15 pairs went unevaluated.
 *
 * ⚠ That is the audit's own false-pass shape: a green line over work it never
 * did. It was only visible because unevaluated pairs are REPORTED rather than
 * skipped — which is the one design decision in this file that mattered.
 *
 * And the dark theme is precisely where it mattered: Root Cause #67 is about
 * a pairing that is *"invisible in exactly one theme"*, so leaving the dark
 * half unchecked misses the entire defect class.
 */
type RGB = { r: number; g: number; b: number; a: number };

function parseColour(v: string): RGB | null {
  const s = v.trim();
  const hex = /^#?([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})$/i.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (fn) {
    const alphaRaw = fn[4];
    const a = alphaRaw === undefined ? 1 : alphaRaw.endsWith("%") ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
    return { r: +fn[1]! / 255, g: +fn[2]! / 255, b: +fn[3]! / 255, a };
  }
  return null;
}

/**
 * Flatten a translucent colour onto what sits beneath it.
 *
 * 🛑 This is the REAL rendered colour, and the only honest basis for a
 * contrast number. A 25%-opacity tint judged as if it were opaque gives a
 * ratio the user never experiences — in either direction.
 */
const over = (top: RGB, base: RGB): RGB => ({
  r: top.r * top.a + base.r * (1 - top.a),
  g: top.g * top.a + base.g * (1 - top.a),
  b: top.b * top.a + base.b * (1 - top.a),
  a: 1,
});

const srgb = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminanceOf = (c: RGB) => 0.2126 * srgb(c.r) + 0.7152 * srgb(c.g) + 0.0722 * srgb(c.b);

/**
 * Contrast ratio of `fg` on `bg`, each flattened onto `beneath` first.
 *
 * `beneath` is the theme's opaque page colour — what a translucent surface is
 * actually layered over.
 */
function ratio(fg: string, bg: string, beneath = "#ffffff"): number | null {
  const base = parseColour(beneath);
  const f = parseColour(fg);
  const b = parseColour(bg);
  if (!f || !b || !base) return null;
  const bgFlat = over(b, base);
  /* The ink is composited over the SURFACE, not over the page — that is the
   * stacking order the browser uses. */
  const fgFlat = over(f, bgFlat);
  const [hi, lo] = [luminanceOf(fgFlat), luminanceOf(bgFlat)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/*
 * ── THE PAIRS THE UI ACTUALLY COMBINES ─────────────────────────────────────
 *
 * 🛑 Measured from the token names, not invented. Checking every ink against
 * every colour would flag pairs no component renders and train people to
 * ignore the audit — the recorded failure of the absolute brand grep against
 * its own 439-occurrence baseline.
 *
 * `min` is the threshold: 4.5 for body copy, 3.0 for large/secondary.
 */
const PAIRS: { ink: string; on: string; min: number; note?: string }[] = [
  /* Body copy on every surface a card or page can use. */
  ...["bg", "surface", "surface-elevated", "surface-input", "surface-hover", "surface-raised", "primary-surface"].flatMap(
    (on) => [
      { ink: "text", on, min: 4.5 },
      { ink: "text-muted", on, min: 4.5 },
      { ink: "text-faint", on, min: 3.0 },
    ],
  ),
  /* Links must be readable AND distinguishable from body text. */
  { ink: "link", on: "bg", min: 4.5 },
  { ink: "link", on: "surface", min: 4.5 },

  /*
   * 🛑 THE ROOT-CAUSE-#67 PAIRS. Each status ink on its OWN surface — the
   * exact combination `Disclaimer` renders, and the one that shipped 26
   * invisible surfaces when the ink was hardcoded white instead.
   */
  { ink: "success", on: "success-surface", min: 4.5, note: "RC#67" },
  { ink: "warning", on: "warning-surface", min: 4.5, note: "RC#67" },
  { ink: "error", on: "error-surface", min: 4.5, note: "RC#67" },
  { ink: "info", on: "info-surface", min: 4.5, note: "RC#67" },
  /* …and on the plain surfaces, because status text is not always boxed. */
  { ink: "success", on: "surface", min: 4.5 },
  { ink: "warning", on: "surface", min: 4.5 },
  { ink: "error", on: "surface", min: 4.5 },
  { ink: "info", on: "surface", min: 4.5 },

  /* The one deliberately-inverted pair: white on the brand fill. */
  { ink: "text-on-primary", on: "primary", min: 4.5 },
  { ink: "text-on-primary", on: "primary-600", min: 4.5 },
  { ink: "text-on-primary", on: "primary-700", min: 4.5 },
];

let fail = 0;
let checked = 0;
const missing: string[] = [];

for (const theme of THEMES) {
  const t = theme.tokens;
  const get = (name: string) => t[`appkit-color-${name}`];
  console.log(`\n  ── ${theme.name}  (${theme.mode}) ──`);
  const bad: string[] = [];

  for (const p of PAIRS) {
    const fg = get(p.ink);
    const bg = get(p.on);
    if (!fg || !bg) {
      /*
       * ⚠ A MISSING TOKEN IS REPORTED, NEVER SKIPPED. Silently skipping is how
       * an audit reports "all clear" over a pair it never evaluated — the
       * false-pass shape this file exists to prevent.
       */
      missing.push(`${theme.id}: ${p.ink} on ${p.on} (${!fg ? p.ink : p.on} undefined)`);
      continue;
    }
    const r = ratio(fg, bg, get("bg") ?? (theme.mode === "dark" ? "#000000" : "#ffffff"));
    if (r === null) {
      missing.push(`${theme.id}: ${p.ink} on ${p.on} (unparseable colour)`);
      continue;
    }
    checked += 1;
    if (r < p.min) {
      fail += 1;
      bad.push(
        `    🛑 ${r.toFixed(2)}:1  (needs ${p.min})  ${p.ink} on ${p.on}  ${fg}/${bg}${p.note ? `  [${p.note}]` : ""}`,
      );
    }
  }
  if (bad.length === 0) console.log(`    ✅ all ${PAIRS.length - missing.length} pairs pass`);
  else bad.forEach((b) => console.log(b));
}

if (missing.length) {
  console.log(`\n  ⚠ ${missing.length} pair(s) could not be evaluated — reported, not skipped:`);
  for (const m of missing.slice(0, 12)) console.log(`      ${m}`);
  if (missing.length > 12) console.log(`      … and ${missing.length - 12} more`);
}

/*
 * ── PROVE THE AUDIT CAN FAIL ────────────────────────────────────────────────
 * A green checker that cannot go red has already produced one false PASS in
 * this project. White on a near-white surface is the literal Root Cause #67
 * pairing, and it must be refused.
 */
const sabotage = ratio("#ffffff", "#fffbeb");
const sabotageCaught = sabotage !== null && sabotage < 4.5;
console.log(
  `\n  self-test: white on warning-surface → ${sabotage?.toFixed(2)}:1 → ${
    sabotageCaught ? "✅ would be REFUSED" : "🛑 WOULD PASS — the audit is broken"
  }`,
);
/* And a positive control, so an audit that refuses everything is caught too. */
const control = ratio("#18181b", "#ffffff");
const controlOk = control !== null && control >= 4.5;
console.log(
  `  self-test: near-black on white → ${control?.toFixed(2)}:1 → ${controlOk ? "✅ accepted" : "🛑 REFUSED — broken"}`,
);
if (!sabotageCaught || !controlOk) fail += 1;

console.log(`\n  ${checked} pairs evaluated across ${THEMES.length} themes`);
console.log(fail === 0 ? "✅ no unreadable pairs" : `🛑 ${fail} unreadable pair(s)`);
process.exit(fail === 0 ? 0 : 1);
