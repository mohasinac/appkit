#!/usr/bin/env node
/*
 * Every stylesheet appkit owns must actually SHIP in dist/styles.css.
 *
 * 🛑 THE BUG THIS EXISTS FOR WAS LIVE AND SILENT. `forms/FormShell.style.css`
 * was never in the bundle: bundle-css.mjs flattens only the @import chain
 * rooted at src/styles.css, and that sheet reached consumers solely through a
 * JS `import "./forms/FormShell.style.css"` at the top of ui/index.ts. So an
 * app that imported `@mohasinac/appkit/styles` — the documented way — and did
 * not also happen to pull the UI barrel got NO FormShell styles.
 * `.appkit-formshell` appeared ZERO times in the built stylesheet.
 *
 * Nothing caught it. tsc cannot see CSS. The Tailwind build cannot see CSS it
 * was never pointed at. `npm run check` passed, the app built, and the only
 * symptom was styles quietly missing on one surface — which reads as a design
 * bug, not a build bug, and is exactly the "missing classes or style
 * behaviours" class of failure that made externalising appkit feel unsafe.
 *
 * The rule is therefore the simplest one that cannot produce a false positive:
 * a `.style.css` file that exists in src must have its rules present in the
 * built bundle. No class-name heuristics, no Tailwind parsing, no guessing
 * about dynamic classNames — just "is this file's content actually in there".
 *
 * Two ways a sheet legitimately ships:
 *   1. @imported (directly or transitively) from src/styles.css, which
 *      bundle-css.mjs flattens — this is the only supported route.
 *   2. Deliberately excluded, listed below with a reason.
 *
 * A JS `import "./x.css"` is NOT a third way, and is separately banned: Node
 * cannot load CSS at any path, so such an edge also puts a stylesheet into
 * appkit's server graph.
 *
 * Usage: node scripts/audit-css-shipped.mjs
 *
 * @tag domain:build
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:none — pure reads
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const BUNDLE = join(ROOT, "dist", "styles.css");

/*
 * Sheets that deliberately do not ship in the main bundle. Each needs a reason
 * — an empty allow-list entry is how a real gap gets waved through.
 */
const INTENTIONALLY_EXCLUDED = new Map([
  // Tailwind's own output is @imported by styles.css under its dist name, so
  // the src-side input file is not expected to appear verbatim.
  ["tailwind-input.css", "Tailwind INPUT; its compiled output ships as tailwind-utilities.css"],
]);

if (!existsSync(BUNDLE)) {
  console.error("[audit-css-shipped] dist/styles.css not found — run `npm run build` first.");
  process.exit(1);
}

const bundle = readFileSync(BUNDLE, "utf8");

/** Every .css file appkit owns, excluding generated output. */
const sheets = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".css")) sheets.push(p);
  }
})(SRC);

/*
 * A sheet "ships" if a distinctive rule from it is present in the bundle.
 * Comparing whole files is wrong — bundle-css strips @import lines and the
 * Tailwind pass rewrites some values — so this samples real SELECTORS, which
 * survive flattening verbatim.
 */
function selectorsOf(css) {
  const out = [];
  /* Strip comments so a selector mentioned in prose is never counted. */
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of stripped.matchAll(/(^|[},])\s*(\.[-\w\\]{4,})/g)) out.push(m[2]);
  return [...new Set(out)];
}

const missing = [];
const empty = [];
let shipped = 0;

for (const file of sheets) {
  const rel = relative(SRC, file).split("\\").join("/");
  const base = rel.split("/").pop();
  if (INTENTIONALLY_EXCLUDED.has(base)) continue;
  if (rel === "styles.css") continue; /* the entry itself */

  const css = readFileSync(file, "utf8");
  const sels = selectorsOf(css);

  if (!sels.length) {
    /* No selectors to sample — a tokens/variables sheet. Fall back to checking
     * a custom-property declaration instead of silently passing it. */
    const prop = /(--[\w-]{6,})\s*:/.exec(css.replace(/\/\*[\s\S]*?\*\//g, " "));
    if (!prop) {
      empty.push(rel);
      continue;
    }
    if (bundle.includes(prop[1])) shipped += 1;
    else missing.push({ rel, probe: prop[1] });
    continue;
  }

  /* Require a MAJORITY of sampled selectors present, not just one — a single
   * shared class name could coincide across sheets. */
  const sample = sels.slice(0, 12);
  const hits = sample.filter((s) => bundle.includes(s.replace(/\\/g, ""))).length;
  if (hits >= Math.ceil(sample.length / 2)) shipped += 1;
  else missing.push({ rel, probe: `${hits}/${sample.length} selectors, e.g. ${sample[0]}` });
}

console.log(
  `[audit-css-shipped] ${sheets.length} stylesheet(s) in src · ${shipped} verified present in dist/styles.css`,
);

if (empty.length) {
  console.log(`  ${empty.length} sheet(s) had nothing to probe (no selectors, no custom properties):`);
  for (const e of empty) console.log(`    ${e}`);
}

if (missing.length) {
  console.error(`\n✗ ${missing.length} stylesheet(s) do NOT ship in dist/styles.css:`);
  for (const m of missing) console.error(`    ${m.rel}   [${m.probe}]`);
  console.error(
    "\n  A consumer importing `@mohasinac/appkit/styles` gets none of these rules.\n" +
      "  Fix: @import the sheet from src/styles.css so bundle-css.mjs flattens it.\n" +
      "  🛑 Do NOT 'fix' it with a JS `import \"./x.css\"` — that hides the sheet from\n" +
      "     the bundle AND puts CSS into appkit's server graph, which Node cannot load.",
  );
  process.exit(1);
}

console.log("✓ every stylesheet appkit owns reaches consumers through the bundle");
