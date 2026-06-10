#!/usr/bin/env node
/**
 * audit-css-imports.mjs — block CSS `@import` of node_modules.
 *
 * Root Cause #10: Turbopack inlines CSS `@import` BEFORE PostCSS runs. An
 * `@import "@pkg/styles"` of a node_modules package ends up not being processed
 * by tailwindcss + autoprefixer → "Unknown AST node type 0" build failure.
 *
 * Rule: in any *.css file, `@import "X"` is OK only when X starts with `.`, `/`,
 *       or `http(s):`. Imports of bare package names or scoped packages fail.
 *       Fix: `import "pkg/styles";` from layout.tsx instead.
 *
 * Exits 0 clean / 1 on any match.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git"]);
const RE = /^\s*@import\s+["']([^"']+)["']/;

// Baseline drift — keep at 0 (currently clean).

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (extname(entry.name) === ".css") files.push(full);
  }
  return files;
}

const violations = [];
for (const root of [join(APPKIT_ROOT, "src"), join(REPO_ROOT, "src")]) {
  for (const file of walk(root)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(RE);
      if (!m) continue;
      const target = m[1];
      if (target.startsWith(".") || target.startsWith("/")) continue;
      if (/^https?:/.test(target)) continue;
      violations.push({ file: rel, line: i + 1, target, text: lines[i].trim() });
    }
  }
}

if (violations.length === 0) {
  console.log("audit-css-imports: clean ✓");
  process.exit(0);
}

if (violations.length <= BASELINE) {
  console.log(`audit-css-imports: ${violations.length} (baseline ${BASELINE}). No regression.`);
  process.exit(0);
}

const out = [`audit-css-imports: ${violations.length} CSS @import of node_modules .\n`];
out.push("Turbopack inlines @import before PostCSS — breaks tailwindcss + autoprefixer.");
out.push("Fix: import the package CSS via JS in layout.tsx instead:");
out.push(`     import "pkg/styles";\n`);
for (const v of violations) {
  out.push(`  ${v.file}:${v.line}  → @import "${v.target}"`);
}
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
