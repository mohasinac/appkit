/**
 * verify-css-build — the BUILD-TIME guard on appkit's compiled stylesheets.
 *
 * Runs at the end of `npm run build`, before `npm publish` can ship the tarball.
 *
 * ── What this is for, and what it is NOT ───────────────────────────────────
 * This answers "did the build produce a plausible, complete stylesheet?" — a
 * question about the ARTEFACT. It deliberately does not try to answer "does
 * every authored class resolve to a rule?", which is a question about the
 * CODE: `scripts/audit-dead-css-classes.mjs` owns that, reads all three
 * stylesheets, and runs in `npm run check` and the Stop hook.
 *
 * 🛑 It used to be a list of EIGHT hardcoded strings — `{md,lg}:{block,flex,
 * hidden}` plus two breakpoints — chosen in 2026-08 for one specific nav bug.
 * That is what it could see, and nothing added since was covered: not a hover,
 * not a dropdown, not one of the ~980 hand-written `appkit-*` classes. Asked
 * in 2026-10 whether the CSS was checked "or just a few", the honest answer
 * was: just those eight.
 *
 * The replacement checks properties that hold for ANY correct build, so it
 * cannot go stale as the class surface grows:
 *
 *   1. Each artefact EXISTS and is non-trivially large.
 *   2. Each carries a floor of rules — catching a half-written `dist/`.
 *   3. `styles.css` has no unresolved `@import` left in it.
 *   4. The responsive machinery is present (media queries at the real
 *      breakpoints), without naming individual classes.
 *
 * ── Why (2) exists: the half-written dist is a REAL failure here ───────────
 * CLAUDE.md records a publish that died inside its own build step and left
 * `dist/` with `client-entry.js` present and `tailwind-utilities.css` gone.
 * A guard that only checked for a few class names in a file that existed
 * would have passed a stylesheet missing most of itself. The floors are set
 * well below current size so ordinary authoring never trips them; they exist
 * to catch an order-of-magnitude loss, not a diff.
 */
import { readFileSync, statSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "../dist");

/**
 * Floors, not targets. Measured 2026-10-19 at 205 KB / 2,400 rules for the
 * utilities and 495 KB / 7,900 rules for the components; these sit at roughly
 * a third of that, so deleting a feature is fine and losing the file is not.
 */
const ARTEFACTS = [
  {
    file: "tailwind-utilities.css",
    minBytes: 60_000,
    minRules: 800,
    what: "Tailwind utilities generated from appkit/src",
  },
  {
    file: "styles.css",
    minBytes: 150_000,
    minRules: 2_500,
    what: "hand-written appkit-* component CSS, flattened from *.style.css",
  },
];

/**
 * The breakpoints the layout primitives actually switch on. Expressed as
 * MEDIA QUERIES rather than class names: a class list has to be maintained
 * and silently narrows over time, while "the build emitted rules at these
 * widths" stays true however the classes are spelled.
 *
 * rem, not px — Tailwind v4 emits `min-width: 64rem`, the same viewport width
 * v3's `1024px` meant at the browser default root font-size (this project does
 * not override `html { font-size }`).
 */
const BREAKPOINTS = ["40rem", "48rem", "64rem", "80rem"];

const problems = [];

for (const { file, minBytes, minRules, what } of ARTEFACTS) {
  const p = resolve(DIST, file);
  if (!existsSync(p)) {
    problems.push(`${file} — MISSING (${what})`);
    continue;
  }
  const bytes = statSync(p).size;
  const css = readFileSync(p, "utf8");
  // Rule count ≈ declaration blocks. Minified output is one line, so counting
  // `{` is the only size-independent measure available.
  const rules = (css.match(/\{/g) ?? []).length;

  if (bytes < minBytes) {
    problems.push(`${file} — ${bytes} bytes, below the ${minBytes} floor (${what})`);
  }
  if (rules < minRules) {
    problems.push(`${file} — ${rules} rules, below the ${minRules} floor (${what})`);
  }
  // An unresolved @import means bundle-css.mjs did not run, or ran against an
  // already-flattened file. Turbopack does not reliably resolve nested CSS
  // imports, so one left here ships as missing styles.
  if (file === "styles.css" && /@import\s+["']\./.test(css)) {
    problems.push(`${file} — contains an unresolved relative @import; run bundle-css.mjs`);
  }
}

const utilitiesPath = resolve(DIST, "tailwind-utilities.css");
if (existsSync(utilitiesPath)) {
  const css = readFileSync(utilitiesPath, "utf8");
  const missingBps = BREAKPOINTS.filter((bp) => !css.includes(`min-width:${bp}`) && !css.includes(`min-width: ${bp}`));
  if (missingBps.length) {
    problems.push(
      `tailwind-utilities.css — no @media rule at ${missingBps.join(", ")}; ` +
        `the responsive layer did not build`,
    );
  }
}

if (problems.length) {
  console.error("[verify-css-build] FAIL:");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("");
  console.error("  The build did not produce a complete stylesheet. Most likely causes:");
  console.error("    - a concurrent `npm run build` wrote dist/ at the same time");
  console.error("      (never run two builds at once — see CLAUDE.md's publish rules)");
  console.error("    - copy-assets.mjs or bundle-css.mjs did not run");
  console.error("    - the tailwindcss CLI failed without a non-zero exit");
  console.error("");
  console.error("  For per-class completeness run `npm run audit dead-css-classes`,");
  console.error("  which compares every authored class against the compiled CSS.");
  process.exit(1);
}

console.log(
  `[verify-css-build] OK — ${ARTEFACTS.length} artefact(s) present, above their size/rule floors, ` +
    `responsive layer built at ${BREAKPOINTS.join(" / ")}.`,
);
