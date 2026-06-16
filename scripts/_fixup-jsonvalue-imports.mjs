#!/usr/bin/env node
// Add JsonValue import to files that use it but lack the import.

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

let count = 0;
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  // Only act if JsonValue is used but not imported anywhere
  const usesIt = /\bJsonValue\b/.test(src);
  const importsIt = /import[^;]*\bJsonValue\b[^;]*from/.test(src) ||
                    /from\s+["'].*types["']/.test(src) && /JsonValue/.test(src.split('from "')[0] ?? "");
  if (!usesIt) continue;

  // More precise: check if any import statement actually imports JsonValue
  const importRe = /^import\s+(?:type\s+)?\{[^}]+\}\s+from\s+["'][^"']+["']/gm;
  const imports = [...src.matchAll(importRe)].map((m) => m[0]);
  const hasImport = imports.some((i) => /\bJsonValue\b/.test(i));
  if (hasImport) continue;

  // Find first appkit/schemas/types import we can extend
  const target = imports.find((i) =>
    /from\s+["']@mohasinac\/appkit(?:\/client)?["']/.test(i) ||
    /from\s+["'](?:\.\.\/)+schemas\/types["']/.test(i),
  );

  let newSrc;
  if (target) {
    const updated = target.replace(/\{([^}]*)\}/, (_, inner) => {
      const trimmed = inner.trim();
      const isType = /^import\s+type/.test(target);
      const prefix = isType ? "" : "type ";
      return `{ ${trimmed}${trimmed.endsWith(",") ? "" : ","} ${prefix}JsonValue }`;
    });
    newSrc = src.replace(target, updated);
  } else {
    // Inject new import after first import
    newSrc = src.replace(/^(import [^\n]+\n)/m, `$1import type { JsonValue } from "@mohasinac/appkit";\n`);
  }

  writeFileSync(file, newSrc);
  count++;
  console.log(`+ ${file}`);
}

console.log(`\nTotal: ${count} files fixed`);
