#!/usr/bin/env node
/**
 * Fix the broken `import { normalizeError }` lines that the earlier
 * codemod run inserted INSIDE multi-line `import { ... } from "..."`
 * blocks. Walks every .ts(x) under appkit/src and src/, finds the broken
 * pattern, and moves the normalizeError import OUT to a sibling line
 * BEFORE the multi-line block.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const ROOTS = [join(REPO_ROOT, "appkit", "src"), join(REPO_ROOT, "src")];
const EXCLUDED = new Set(["node_modules", "dist", ".next", "out"]);

const APPLY = process.argv.includes("--apply");

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (EXCLUDED.has(e.name)) continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

let fixed = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    let src = readFileSync(file, "utf8");
    // Pattern: line starts with `import {` and the NEXT line is
    // `import { normalizeError } from "X";`.
    const re = /^([ \t]*)import\s*\{[ \t]*$\n([ \t]*)import\s*\{\s*normalizeError\s*\}\s*from\s*("[^"]+");[ \t]*$/m;
    if (!re.test(src)) continue;
    src = src.replace(
      /^([ \t]*)import\s*\{[ \t]*$\n([ \t]*)import\s*\{\s*normalizeError\s*\}\s*from\s*("[^"]+");[ \t]*$/gm,
      (_m, indent1, _indent2, src3) => `${indent1}import { normalizeError } from ${src3};\n${indent1}import {`,
    );
    if (APPLY) writeFileSync(file, src);
    fixed++;
  }
}
console.log(`${APPLY ? "Fixed" : "Would fix"} ${fixed} files.`);
