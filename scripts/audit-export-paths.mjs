#!/usr/bin/env node
/**
 * audit-export-paths.mjs — verifies every re-export in appkit entry points resolves to a
 * source file that actually exists on disk.
 *
 * Root cause this prevents:
 *   When a feature is partially removed (source files deleted but the barrel export in
 *   client.ts / index.ts is left behind), TypeScript in the consumer app reports TS2305
 *   ("Module has no exported member 'X'") or TS2307 ("Cannot find module"). This script
 *   catches the broken export at stop-hook time (fast file-system check, ~100ms) rather
 *   than waiting for the full tsc invocation.
 *
 * Checks:
 *   appkit/src/client.ts   — all  `export { ... } from "./path"`  and
 *                                  `export type { ... } from "./path"`
 *   appkit/src/index.ts    — same
 *   appkit/src/server.ts   — same
 *
 * Resolution order for each `from "./path"` specifier (no extension):
 *   1. path.ts
 *   2. path.tsx
 *   3. path/index.ts
 *   4. path/index.tsx
 *
 * Exits 0 on clean, 1 on failure.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

const ENTRY_POINTS = [
  join(SRC, "client.ts"),
  join(SRC, "index.ts"),
  join(SRC, "server.ts"),
];

// Regex: matches both  export { ... } from "./..."  and  export type { ... } from "./..."
// Captures the specifier (single or double quoted, relative path starting with . or /)
const EXPORT_FROM_RE = /^export\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"](\.[^'"]+)['"]/gm;

function resolveSpecifier(specifier, fromDir) {
  const base = resolve(fromDir, specifier);
  const candidates = [
    base + ".ts",
    base + ".tsx",
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  // If the specifier already has an extension, test it directly first
  if (/\.(ts|tsx|js|jsx)$/.test(specifier)) {
    if (existsSync(base)) return base;
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

let totalViolations = 0;

for (const entryFile of ENTRY_POINTS) {
  if (!existsSync(entryFile)) continue;

  const src = readFileSync(entryFile, "utf8");
  const dir = dirname(entryFile);
  const violations = [];

  let m;
  EXPORT_FROM_RE.lastIndex = 0;
  while ((m = EXPORT_FROM_RE.exec(src)) !== null) {
    const specifier = m[1];
    const resolved = resolveSpecifier(specifier, dir);
    if (!resolved) {
      violations.push(specifier);
    }
  }

  if (violations.length > 0) {
    const rel = entryFile.replace(ROOT + "/", "").replace(ROOT + "\\", "");
    for (const v of violations) {
      process.stderr.write(`[BROKEN_EXPORT] ${rel}: export from '${v}' → file not found\n`);
    }
    totalViolations += violations.length;
  }
}

if (totalViolations === 0) {
  console.log("audit-export-paths: all entry-point re-exports resolve to existing files ✓");
  process.exit(0);
} else {
  process.stderr.write(
    `\naudit-export-paths: ${totalViolations} broken export path(s) found.\n` +
      "  Fix: remove the export statement from client.ts / index.ts / server.ts, OR restore the missing file.\n" +
      "  This error means the appkit barrel exports a symbol from a file that no longer exists.\n" +
      "  Consumer TypeScript (check:types:app) will fail with TS2305 / TS2307 until resolved.\n",
  );
  process.exit(1);
}
