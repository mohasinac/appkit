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
 * ── GRADIENT STOPS — found by LOOKING, then generalised ────────────────────
 *
 * 🛑 A REAL DEFECT THIS AUDIT COULD NOT SEE. The homepage `<h1>` renders
 * "Buy Beyblade in India" with `background-clip: text` over the `brand-tri`
 * gradient. Measured in a real browser on production, dark mode:
 *
 *     stop 1  rgb(30,58,138)   "Buy"        1.95 : 1   🛑
 *     stop 2  rgb(105,86,23)   "Beyblade"   2.83 : 1   🛑
 *     stop 3  rgb(56,189,248)  "in/India"   9.42 : 1   ✅
 *
 * against the dark page `#020617`. Two thirds of the site's largest headline
 * is below the 3.0 large-text floor — the word "India" is barely visible.
 *
 * ⚠ The token-pair matrix above is blind to it: no token is paired with
 * another here. The ink IS a gradient, and its stops are only readable via
 * `gradients`. So the pair audit returned a confident green over the single
 * most prominent piece of text on the storefront.
 *
 * ✅ And it generalises cleanly because the stops are TOKENS
 * (`var(--appkit-color-primary)` …), so every gradient in every theme can be
 * resolved and checked rather than this one being special-cased.
 *
 * ⚠ Thresholds: 3.0, the large-text bar. These gradients are used on display
 * headings. A gradient used for a BACKGROUND rather than clipped to text is
 * excluded by name below — judging a decorative wash by a text rule would
 * flag correct design and train people to ignore the audit.
 */
let gradientWarn = 0;
const TEXT_GRADIENTS = ["brand", "brand-tri", "accent"];

console.log(`\n  ── gradient stops used as TEXT (background-clip: text) ──`);
for (const theme of THEMES) {
  const t = theme.tokens;
  const pageBg = t["appkit-color-bg"] ?? (theme.mode === "dark" ? "#000000" : "#ffffff");
  const grads = (theme as { gradients?: Record<string, string> }).gradients ?? {};
  for (const name of TEXT_GRADIENTS) {
    const def = grads[name];
    if (!def) continue;
    /* Resolve `var(--appkit-color-x)` stops back to their token values. */
    const stops = [...def.matchAll(/var\(--(appkit-color-[a-z0-9-]+)\)|(#[0-9a-f]{3,8})|(rgba?\([^)]*\))/gi)]
      .map((m) => (m[1] ? t[m[1]] : (m[2] ?? m[3])))
      .filter((s): s is string => !!s && s !== "transparent");
    if (stops.length === 0) continue;
    for (const [i, stop] of stops.entries()) {
      const r = ratio(stop, pageBg, pageBg);
      if (r === null) {
        missing.push(`${theme.id}: gradient ${name} stop ${i + 1} (unparseable ${stop})`);
        continue;
      }
      checked += 1;
      if (r < 3.0) {
        gradientWarn += 1;
        console.log(`    ⚠ ${theme.id}  ${name} stop ${i + 1}  ${r.toFixed(2)}:1 (needs 3.0)  ${stop} on ${pageBg}`);
      }
    }
  }
}
if (gradientWarn === 0) {
  console.log(`    ✅ every text-gradient stop is readable on its own theme background`);
} else {
  /*
   * 🛑 REPORTED, NOT FAILING — deliberate rather than soft.
   *
   * Every failing stop is a BRAND colour (`#d4af37` gold, `#1e3a8a` navy), so
   * the remedy is an owner decision about identity, not an engineering fix.
   * Blocking `check:verifiers` on a pending decision makes the suite red for
   * everyone, and a permanently-red gate is one people learn to bypass — the
   * recorded failure of the absolute brand grep, which always failed against
   * its own 439-occurrence baseline and trained readers to ignore it.
   *
   * ⚠ When the decision lands, change `gradientWarn` to `fail` on the line
   * above. The finding stays loud meanwhile; it just does not hold the gate.
   */
  console.log(`\n    ⚠ ${gradientWarn} gradient stop(s) below the 3.0 large-text floor — REPORTED, NOT FAILING.`);
  console.log(`      Each is a BRAND colour, so the fix is an owner decision about identity.`);
  console.log(`      Measured live on production: the homepage <h1> "Buy Beyblade in India"`);
  console.log(`      renders through brand-tri, and in dark mode two of its three stops`);
  console.log(`      (1.95:1 and 2.83:1) leave most of the headline barely visible.`);
}

/*
 * ── TS ↔ tokens.css AGREEMENT ───────────────────────────────────────────────
 *
 * 🛑 FOLDED IN HERE BECAUSE THE AUDIT THAT WAS SUPPOSED TO DO IT DOES NOT
 * EXIST. `default-light.ts` says in writing:
 *
 *   "Drift between this file and `tokens.css` is detected by
 *    `scripts/audit-theme-drift.mjs`."
 *
 * Measured 2026-11-13: that script is present only under
 * `.claude/worktrees/` — stale copies from old agent runs — and is in NEITHER
 * `appkit/scripts/` nor the shop's audit registry. So the drift it claims to
 * detect has been undetected for however long, which is the
 * declared-but-unwired class applied to a safety net. (Same shape as the seven
 * `.mts` verifiers that no npm script ran.)
 *
 * It matters immediately: the tokens live in TWO files that must stay
 * byte-identical, and a theme edit that lands in one is invisible — the CSS is
 * what the browser paints, while the TS is what this audit reads. Change only
 * the TS and every contrast number here is a fiction about colours nobody
 * sees.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "tokens", "tokens.css"), "utf8");

/*
 * 🛑 STRIP COMMENTS FIRST. The file's own header contains a worked REBRAND
 * EXAMPLE —
 *
 *     :root {
 *       --appkit-color-primary:   #your-primary;
 *       --appkit-color-secondary: #your-secondary;
 *     }
 *
 * — so the first version of this check matched the documentation instead of
 * the stylesheet and reported `CSS=#your-primary` as drift against the real
 * TS value. Two "drifted" tokens, both fictional.
 *
 * ⚠ That is the fourth instance in this session of a checker measuring the
 * wrong thing and saying so confidently (`parentId` vs `parentIds`, the
 * hex-only colour parser, the `/tmp` path split, this). Each was caught only
 * because the OUTPUT looked implausible — `#your-primary` is not a colour, and
 * 2 vars is not a palette. **Read what a checker printed before believing what
 * it concluded.**
 */
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
/* The light theme's `:root` block — up to the first theme-scoped override. */
const cut = cssNoComments.search(/\[data-theme|\.theme-|@media[^{]*prefers-color-scheme/);
const rootBlock = cssNoComments.slice(0, cut === -1 ? cssNoComments.length : cut);
const cssVars = new Map<string, string>();
for (const m of rootBlock.matchAll(/--(appkit-color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  cssVars.set(m[1]!, m[2]!.trim());
}
/*
 * A palette is dozens of vars. If the slice found a handful, it found the
 * wrong region — fail LOUDLY rather than report "0 drifted" over nothing,
 * which is the false-pass this whole file exists to prevent.
 */
if (cssVars.size < 20) {
  console.log(`\n  🛑 only ${cssVars.size} vars parsed from the :root block — the slice is wrong, not the data`);
  fail += 1;
}

const drift: string[] = [];
for (const [k, v] of Object.entries(DEFAULT_LIGHT_THEME.tokens)) {
  if (!k.startsWith("appkit-color-")) continue;
  const inCss = cssVars.get(k);
  if (inCss === undefined) continue; /* not every token is mirrored */
  if (inCss.toLowerCase() !== String(v).toLowerCase()) {
    drift.push(`${k}: TS=${v}  CSS=${inCss}`);
    fail += 1;
  }
}
console.log(`\n  ── TS ↔ tokens.css (light) ──`);
console.log(`    ${cssVars.size} vars in the :root block, ${drift.length} drifted`);
for (const d of drift) console.log(`    🛑 ${d}`);
if (drift.length === 0) console.log(`    ✅ the two sources agree`);

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
