#!/usr/bin/env node
/**
 * Move `"use client";` (and `"use server";`) directives back to be the
 * literal first line of every file. The earlier catch codemod inserted
 * imports above them.
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
const USE_RE = /^"use\s+(?:client|server)"\s*;?\s*$/;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    // Scan first 30 lines for a "use ..." directive that isn't on line 0.
    let directiveAt = -1;
    for (let i = 1; i < Math.min(lines.length, 30); i++) {
      if (USE_RE.test(lines[i].trim())) { directiveAt = i; break; }
    }
    if (directiveAt === -1) continue;
    // Move it to line 0.
    const directive = lines[directiveAt];
    lines.splice(directiveAt, 1);
    lines.unshift(directive);
    if (APPLY) writeFileSync(file, lines.join("\n"));
    fixed++;
  }
}
console.log(`${APPLY ? "Fixed" : "Would fix"} ${fixed} files.`);
