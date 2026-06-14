#!/usr/bin/env node
/**
 * For every file that contains a `normalizeError(` call but no
 * `import { normalizeError }` line, add the import as the first line
 * of the file (after any `"use ..."` directive).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
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
    if (!/\bnormalizeError\s*\(/.test(src)) continue;
    // Skip the file that defines normalizeError, and its barrel.
    if (file.endsWith(join("errors", "normalize.ts"))) continue;
    if (file.endsWith(join("errors", "index.ts"))) continue;
    if (file.endsWith(join("utils", "auth-error.ts"))) continue;
    // Tight check: line that LITERALLY starts (after whitespace) with
    // `import { normalizeError ` or `import { normalizeError,`. This
    // avoids the false-positive from the previously-broken multi-line
    // import where `import {` opened on one line and `normalizeError`
    // appeared inside the open block.
    if (/^[ \t]*import\s*\{\s*(?:type\s+)?normalizeError\b/m.test(src)) continue;
    if (/^[ \t]*import\s*\{[^}]*,\s*normalizeError\b/m.test(src)) continue;
    if (/^[ \t]*import\s*\{[^}]*\bnormalizeError\s*,/m.test(src)) continue;

    const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
    const isAppkitSrc = relPath.startsWith("appkit/src/");
    let importTarget;
    if (isAppkitSrc) {
      const fileDir = dirname(relPath);
      const target = "appkit/src/errors/normalize";
      const rel = relative(fileDir, target).replace(/\\/g, "/");
      importTarget = rel.startsWith(".") ? rel : "./" + rel;
    } else {
      importTarget = "@mohasinac/appkit";
    }
    const importLine = `import { normalizeError } from "${importTarget}";`;
    const lines = src.split("\n");
    let insertAt = 0;
    while (insertAt < lines.length) {
      const t = lines[insertAt].trim();
      if (/^"use\s+\w+"\s*;?$/.test(t) || t.startsWith("#!")) insertAt++;
      else break;
    }
    lines.splice(insertAt, 0, importLine);
    src = lines.join("\n");
    if (APPLY) writeFileSync(file, src);
    fixed++;
  }
}
console.log(`${APPLY ? "Fixed" : "Would fix"} ${fixed} files.`);
