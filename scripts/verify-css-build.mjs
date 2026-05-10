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
  // Responsive breakpoints must exist as @media rules
  "min-width:1024px",
  "min-width:768px",
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
