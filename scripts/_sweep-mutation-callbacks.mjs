#!/usr/bin/env node
// W13 codemod: swap `(res: unknown)` / `(err: unknown)` in mutation callbacks
// to JsonValue / Error respectively. Also adds JsonValue / Error imports
// where missing.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const EXCLUDED = new Set(["node_modules", "dist", "__tests__", "__mocks__"]);

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

const PATTERNS = [
  // onSuccess: (data: unknown) =>
  {
    re: /(onSuccess\s*:\s*\(\s*\w+)\s*:\s*unknown\b/g,
    repl: "$1: JsonValue",
    needsJsonValue: true,
  },
  // onError: (err: unknown) =>
  {
    re: /(onError\s*:\s*\(\s*\w+)\s*:\s*unknown\b/g,
    repl: "$1: Error",
    needsError: false, // Error is global
  },
  // onSettled: (data: unknown, err: unknown, ...)
  {
    re: /(onSettled\s*:\s*\(\s*\w+)\s*:\s*unknown(\s*,\s*\w+)\s*:\s*unknown\b/g,
    repl: "$1: JsonValue | undefined$2: Error | null",
    needsJsonValue: true,
  },
];

let totalSites = 0;
let touchedFiles = 0;

for (const file of walk(ROOT)) {
  let src = readFileSync(file, "utf8");
  const before = src;
  let needsJsonValue = false;
  for (const p of PATTERNS) {
    const matches = src.match(p.re);
    if (matches) {
      src = src.replace(p.re, p.repl);
      if (p.needsJsonValue) needsJsonValue = true;
    }
  }
  if (src === before) continue;
  const sites = (before.match(/unknown/g) || []).length - (src.match(/unknown/g) || []).length;

  // Inject JsonValue import if missing
  if (needsJsonValue && !src.includes("JsonValue")) {
    // Find a good import line to add to
    const importMatch = src.match(/^import\s+(?:type\s+)?\{[^}]*\}\s+from\s+["'](?:@mohasinac\/appkit(?:\/client)?|(?:\.\.\/)+schemas\/types)["']/m);
    if (importMatch) {
      const line = importMatch[0];
      const newLine = line.replace(/\{([^}]*)\}/, (_, inner) => `{${inner}, JsonValue}`);
      src = src.replace(line, newLine);
    } else {
      // Add new import after first import
      src = src.replace(/^(import [^\n]+\n)/m, `$1import type { JsonValue } from "@mohasinac/appkit";\n`);
    }
  }

  writeFileSync(file, src);
  touchedFiles++;
  totalSites += sites;
  console.log(`${file}: -${sites} sites`);
}

console.log(`\nTotal: ${touchedFiles} files, -${totalSites} sites`);
