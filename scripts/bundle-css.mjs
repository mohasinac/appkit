/**
 * bundle-css.mjs — Flatten all @import chains in dist/styles.css into a single
 * concatenated file. Turbopack (Next.js 16+) does not reliably resolve nested
 * CSS @import chains from node_modules, so shipping a flat file is the safest
 * approach for both webpack and Turbopack consumers.
 *
 * Runs after copy-assets.mjs + tailwindcss build, so dist/ already has every
 * individual .style.css and tokens.css file.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";

const DIST = new URL("../dist", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const ENTRY = join(DIST, "styles.css");

const seen = new Set();

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, match => " ".repeat(match.length));
}

function inlineImports(filePath) {
  if (seen.has(filePath)) return "";
  seen.add(filePath);

  const css = readFileSync(filePath, "utf8");
  const dir = dirname(filePath);
  const stripped = stripComments(css);

  return css.replace(/@import\s+["']([^"']+)["']\s*;/g, (_match, relPath, offset) => {
    if (stripped.substring(offset, offset + _match.length).trim() === "") return _match;
    const resolved = resolve(dir, relPath);
    try {
      return inlineImports(resolved);
    } catch (err) {
      console.error(`[bundle-css] WARNING: could not resolve @import "${relPath}" from ${filePath}`);
      return _match;
    }
  });
}

const bundled = inlineImports(ENTRY);
writeFileSync(ENTRY, bundled, "utf8");

const lines = bundled.split("\n").length;
const bytes = Buffer.byteLength(bundled, "utf8");
console.log(`[bundle-css] Bundled ${seen.size} CSS files into dist/styles.css (${lines} lines, ${(bytes / 1024).toFixed(1)} KB)`);
