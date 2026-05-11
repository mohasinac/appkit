#!/usr/bin/env node
/**
 * appkit-audit — boundary violation checker.
 *
 * Asserts that:
 *   1. No file under _internal/client/** imports firebase-admin
 *   2. No file under _internal/client/** imports from _internal/server/**
 *   3. No file under _internal/shared/** imports firebase-admin
 *   4. No file under _internal/shared/** imports from _internal/client/** or _internal/server/**
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readdir, readFile } from "fs/promises";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INTERNAL = join(ROOT, "src", "_internal");

const RULES = [
  {
    dir: "client",
    forbidden: [
      { pattern: /from ['"]firebase-admin/, label: "firebase-admin in client" },
      { pattern: /from ['"].*\/_internal\/server/, label: "_internal/server import in client" },
    ],
  },
  {
    dir: "shared",
    forbidden: [
      { pattern: /from ['"]firebase-admin/, label: "firebase-admin in shared" },
      { pattern: /from ['"].*\/_internal\/client/, label: "_internal/client import in shared" },
      { pattern: /from ['"].*\/_internal\/server/, label: "_internal/server import in shared" },
    ],
  },
];

async function walk(dir) {
  let results = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) results = results.concat(await walk(full));
    else if ([".ts", ".tsx"].includes(extname(e.name))) results.push(full);
  }
  return results;
}

let violations = 0;

for (const rule of RULES) {
  const dir = join(INTERNAL, rule.dir);
  const files = await walk(dir);
  for (const file of files) {
    const src = await readFile(file, "utf8");
    for (const { pattern, label } of rule.forbidden) {
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          console.error(`[VIOLATION] ${label}`);
          console.error(`  ${relative(ROOT, file)}:${i + 1}`);
          console.error(`  ${lines[i].trim()}`);
          violations++;
        }
      }
    }
  }
}

if (violations === 0) {
  console.log("appkit-audit: 0 boundary violations ✓");
  process.exit(0);
} else {
  console.error(`\nappkit-audit: ${violations} violation(s) found.`);
  process.exit(1);
}
