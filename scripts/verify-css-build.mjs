/**
 * Post-build guard: verifies that critical responsive Tailwind classes are present
 * in the compiled dist/tailwind-utilities.css. Fails the build if any are missing,
 * catching cases where a stale or incomplete CSS bundle was published.
 *
 * Run via: node scripts/verify-css-build.mjs
 * Called automatically at the end of `npm run build`.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(__dirname, "../dist/tailwind-utilities.css");

const REQUIRED_CLASSES = [
  // Responsive display utilities used by MainNavbar (NavbarLayout) and TitleBar
  "lg\\:block",
  "lg\\:flex",
  "lg\\:hidden",
  "md\\:block",
  "md\\:flex",
  "md\\:hidden",
  // Responsive breakpoints must exist as @media rules.
  // Tailwind v4 (2026-08-16 migration) uses rem-based default breakpoints —
  // 64rem/48rem are the exact same viewport widths as v3's 1024px/768px at the
  // browser default 16px root font-size (this project does not override
  // html { font-size }), just expressed in the new unit.
  "min-width:64rem",
  "min-width:48rem",
];

let css;
try {
  css = readFileSync(CSS_PATH, "utf8");
} catch {
  console.error(`[verify-css-build] ERROR: Could not read ${CSS_PATH}`);
  console.error("  Run 'npm run build' in appkit/ before publishing.");
  process.exit(1);
}

const missing = REQUIRED_CLASSES.filter((cls) => !css.includes(cls));

if (missing.length > 0) {
  console.error("[verify-css-build] FAIL: Missing critical CSS classes in dist/tailwind-utilities.css:");
  missing.forEach((cls) => console.error(`  - ${cls}`));
  console.error("");
  console.error("  This usually means the Tailwind build ran on stale source files.");
  console.error("  Fix: rebuild appkit with 'npm run build' and re-verify.");
  process.exit(1);
}

console.log(`[verify-css-build] OK: all ${REQUIRED_CLASSES.length} required classes/breakpoints present.`);
