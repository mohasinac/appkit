#!/usr/bin/env node
/**
 * audit-z-any-z-unknown
 *
 * Forbids `z.any()` and `z.unknown()` in any Zod schema file outside the
 * explicit allowlist. These two Zod helpers re-introduce the lazy `unknown`
 * we're trying to eliminate at the system boundary.
 *
 * Allowlist:
 *   - SCHEMAS.rtdb.*           — RTDB channel payloads are inherently
 *                                 dynamic; an `audit-rtdb-channel-payload`
 *                                 (future) constrains them by path.
 *   - appkit/src/schemas/types.ts — the `JsonValue` recursive type.
 *
 * Per-line suppression marker: `// audit-z-any-ok: <reason>`.
 *
 * Strict-zero — wired into appkit's check:audits.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");

const SCAN_ROOTS = [
  join(REPO_ROOT, "appkit", "src", "schemas"),
  join(REPO_ROOT, "appkit", "src", "features"),
  join(REPO_ROOT, "src", "schemas"),
];

const ALLOWLIST_PATHS = new Set([]);

const PER_LINE_OK_RE = /\/\/\s*audit-z-any-ok\s*:/i;
const VIOLATION_RE = /\bz\s*\.\s*(any|unknown)\s*\(/g;

const failures = [];

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name === "__tests__") continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST_PATHS.has(relPath)) continue;
    const src = readFileSync(file, "utf8");
    if (!/\bz\s*\.\s*(any|unknown)\s*\(/.test(src)) continue;
    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      VIOLATION_RE.lastIndex = 0;
      if (!VIOLATION_RE.test(line)) continue;
      if (PER_LINE_OK_RE.test(line)) continue;
      if (i > 0 && PER_LINE_OK_RE.test(lines[i - 1])) continue;
      failures.push({ file: relPath, line: i + 1, snippet: line.trim().slice(0, 120) });
    }
  }
}

if (failures.length > 0) {
  console.error(`audit-z-any-z-unknown: ${failures.length} violation(s).`);
  for (const f of failures.slice(0, 30)) {
    console.error(`  • ${f.file}:${f.line}  ${f.snippet}`);
  }
  if (failures.length > 30) console.error(`  … and ${failures.length - 30} more.`);
  process.exit(1);
}

console.log("audit-z-any-z-unknown: OK (no z.any() or z.unknown() outside the allowlist).");
