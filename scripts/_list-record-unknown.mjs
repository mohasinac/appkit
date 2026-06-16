#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const SCAN_ROOTS = [join(REPO_ROOT, "appkit", "src"), join(REPO_ROOT, "src")];
const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".next", "out", "__tests__", "__mocks__"]);
const PER_LINE_OK_RE = /\/\/\s*audit-unknown-ok\s*:/i;
const RE = /\bRecord\s*<\s*string\s*,\s*unknown\s*>/;

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(e.name)) continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

const byFile = {};
for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    const src = readFileSync(file, "utf8");
    if (!RE.test(src)) continue;
    const lines = src.split(/\r?\n/);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (PER_LINE_OK_RE.test(line)) continue;
      if (i > 0 && PER_LINE_OK_RE.test(lines[i - 1])) continue;
      if (RE.test(line)) count++;
    }
    if (count > 0) byFile[rel] = count;
  }
}

const sorted = Object.keys(byFile).sort((a, b) => byFile[b] - byFile[a]);
let total = 0;
for (const f of sorted) {
  console.log(`${f}  (${byFile[f]})`);
  total += byFile[f];
}
console.log(`TOTAL: ${total}`);
