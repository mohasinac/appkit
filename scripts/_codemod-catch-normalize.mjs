#!/usr/bin/env node
/**
 * Codemod: migrate every `catch (X)` block to call `normalizeError(X)`.
 *
 * For each catch site that doesn't already call normalizeError() or
 * re-throw, this codemod inserts `void normalizeError(varName);` as the
 * first statement inside the catch body. The `void` discards the result
 * so existing logic that does `instanceof` checks or property access on
 * the raw catch variable continues to work unchanged.
 *
 * The codemod also injects an import for `normalizeError` from the
 * appkit package (or relative path for files inside appkit/) when the
 * symbol isn't already imported.
 *
 * Run from repo root:
 *   node appkit/scripts/_codemod-catch-normalize.mjs --apply
 *   node appkit/scripts/_codemod-catch-normalize.mjs           # dry-run
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");

const APPLY = process.argv.includes("--apply");

const SCAN_ROOTS = [
  join(REPO_ROOT, "appkit", "src"),
  join(REPO_ROOT, "src"),
];

const EXCLUDED_DIRS = new Set([
  "node_modules", "dist", ".next", "out", "__tests__", "__mocks__",
]);

const EXCLUDED_FILES = new Set(
  [
    "appkit/src/errors/normalize.ts",
    "appkit/src/utils/auth-error.ts",
    "appkit/scripts/_codemod-catch-normalize.mjs",
    "appkit/scripts/audit-catch-normalize.mjs",
  ].map((p) => p.replace(/\//g, sep)),
);

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(e.name)) continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

// Find first `{` after the catch (var). Returns the index of `{` in src
// or -1 if not found within a reasonable window.
function findOpeningBrace(src, fromIdx) {
  for (let i = fromIdx; i < src.length && i - fromIdx < 200; i++) {
    if (src[i] === "{") return i;
  }
  return -1;
}

function getIndent(src, idx) {
  // Walk backwards to find the start of the line containing `idx`.
  let i = idx;
  while (i > 0 && src[i - 1] !== "\n") i--;
  let indent = "";
  while (i < src.length && (src[i] === " " || src[i] === "\t")) {
    indent += src[i];
    i++;
  }
  return indent;
}

let totalModified = 0;
let totalCatchSitesProcessed = 0;
let totalCatchSitesSkipped = 0;

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    if (EXCLUDED_FILES.has(file)) continue;
    const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
    let src = readFileSync(file, "utf8");
    if (!/\bcatch\s*\(/.test(src)) continue;

    let needsImport = false;
    let modified = false;

    // Walk catch sites left-to-right, tracking offset adjustment as we
    // insert. Use a regex with sticky behavior.
    const findCatch = /\bcatch\s*\(\s*([A-Za-z_$][\w$]*)(\s*:[^)]*)?\s*\)\s*(?:\{)/g;
    const insertions = [];
    let m;
    while ((m = findCatch.exec(src)) !== null) {
      totalCatchSitesProcessed++;
      const varName = m[1];
      const braceIdx = src.indexOf("{", m.index + m[0].length - 1);
      if (braceIdx === -1) {
        totalCatchSitesSkipped++;
        continue;
      }
      // Inspect the body of the catch up to ~10 lines. Limiting to 10 lines
      // avoids false-positive `throw varName` matches from sibling catches
      // deep in the same function. `normalizeError(varName)` only counts if
      // it's within the same catch body.
      const tailFromBrace = src.slice(braceIdx);
      const next10Lines = tailFromBrace.split("\n").slice(0, 10).join("\n");
      const callsNormalize = new RegExp(`normalizeError\\s*\\(\\s*${varName}\\b`).test(next10Lines);
      const reThrows = new RegExp(`throw\\s+${varName}\\b`).test(next10Lines);
      if (callsNormalize || reThrows) {
        totalCatchSitesSkipped++;
        continue;
      }
      // Insert `void normalizeError(varName);` after the opening brace.
      const indent = getIndent(src, m.index) + "  ";
      const insert = `\n${indent}void normalizeError(${varName});`;
      insertions.push({ at: braceIdx + 1, insert });
      needsImport = true;
    }

    if (insertions.length === 0) continue;

    // Apply insertions right-to-left so offsets stay valid.
    insertions.sort((a, b) => b.at - a.at);
    for (const ins of insertions) {
      src = src.slice(0, ins.at) + ins.insert + src.slice(ins.at);
    }

    // Inject the import if absent.
    // Detect: does src ALREADY have `normalizeError` named in any import statement?
    const alreadyImported = /import\s*(?:type\s*)?\{[^}]*\bnormalizeError\b[^}]*\}/m.test(src) ||
                            /import\s*\*\s*as\s+\w+\s+from\s*["']@mohasinac\/appkit["']/.test(src);
    if (needsImport && !alreadyImported) {
      // Determine import target.
      let importTarget;
      const isAppkitSrc = relPath.startsWith("appkit/src/");
      if (isAppkitSrc) {
        // Relative path from this file to appkit/src/errors/normalize.
        const fileDir = dirname(relPath);
        const target = "appkit/src/errors/normalize";
        const rel = relative(fileDir, target).replace(/\\/g, "/");
        importTarget = rel.startsWith(".") ? rel : "./" + rel;
      } else {
        importTarget = "@mohasinac/appkit";
      }
      const importLine = `import { normalizeError } from "${importTarget}";`;
      // Strategy: insert the new import as the VERY FIRST line of the file
      // (or right after any `"use client"`/`"use server"` directive). This
      // can never land inside a multi-line `import { ... } from "..."`
      // block. The import resolver / linter may sort it later; correctness
      // first.
      const lines = src.split("\n");
      let insertAt = 0;
      // Skip any "use client"/"use server" directives or a shebang.
      while (insertAt < lines.length) {
        const t = lines[insertAt].trim();
        if (/^"use\s+\w+"\s*;?$/.test(t) || t.startsWith("#!")) {
          insertAt++;
        } else {
          break;
        }
      }
      lines.splice(insertAt, 0, importLine);
      src = lines.join("\n");
    }

    if (APPLY) {
      writeFileSync(file, src);
      modified = true;
    }
    totalModified++;
    if (!APPLY && totalModified <= 5) {
      console.log(`[dry-run] would modify ${relPath} (+${insertions.length} catch sites)`);
    }
  }
}

console.log("---");
console.log(`Catch sites processed: ${totalCatchSitesProcessed}`);
console.log(`Catch sites skipped (already migrated / re-throws): ${totalCatchSitesSkipped}`);
console.log(`Files ${APPLY ? "modified" : "to be modified"}: ${totalModified}`);
if (!APPLY) console.log(`Dry-run. Re-run with --apply to write changes.`);
