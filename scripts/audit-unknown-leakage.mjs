#!/usr/bin/env node
/**
 * audit-unknown-leakage
 *
 * Detects the remaining lazy `unknown` shapes after W1–W8 land:
 *   - `: unknown` annotation (parameter, return, variable, field)
 *   - `Record<string, unknown>` type literal
 *   - `as unknown` cast (and the `as unknown as T` pattern)
 *
 * Allowlist (legitimate retained uses):
 *   - Generic-helper signatures with `<T = unknown>` — phantom default,
 *     stripped at call sites.
 *   - `catch (X: unknown)` and the auto-typed catch variable.
 *   - RichText / RichBlock HTML sanitiser boundary.
 *   - `appkit/src/utils/object.helper.ts` deep-equality utility.
 *   - `appkit/src/schemas/types.ts` `JsonValue` recursive definition.
 *
 * Per-line suppression marker: `// audit-unknown-ok: <reason>`.
 *
 * Strict-zero — any violation outside the allowlist fails the audit.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");

const SCAN_ROOTS = [
  join(REPO_ROOT, "appkit", "src"),
  join(REPO_ROOT, "src"),
];

const EXCLUDED_DIRS = new Set([
  "node_modules", "dist", ".next", "out", "__tests__", "__mocks__",
]);

const ALLOWLIST_FILES = new Set(
  [
    "appkit/src/utils/object.helper.ts",
    "appkit/src/schemas/types.ts",
    "appkit/src/ui/rich-text/RichText.tsx",
    "appkit/src/ui/components/RichTextEditor.tsx",
    "appkit/src/errors/normalize.ts", // normalizeError(e: unknown) signature
  ].map((p) => p.replace(/\//g, "/")),
);

const PER_LINE_OK_RE = /\/\/\s*audit-unknown-ok\s*:/i;

const PATTERNS = [
  { name: "field-or-param-unknown", re: /(:\s*unknown\b)(?!.*\/\/\s*audit-unknown-ok)/ },
  { name: "record-string-unknown", re: /\bRecord\s*<\s*string\s*,\s*unknown\s*>/ },
  { name: "as-unknown", re: /\bas\s+unknown\b/ },
];

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(e.name)) continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

function isLegitGenericDefault(line) {
  // `<T = unknown>`, `<T extends unknown>`, `<T = unknown, ...>`
  return /<[^>]*(?:=\s*unknown|extends\s+unknown)\b/.test(line);
}

function isCatchClause(line) {
  return /\bcatch\s*\(/.test(line);
}

const violations = [];
let totalScanned = 0;

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST_FILES.has(relPath)) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("unknown")) continue;
    totalScanned++;
    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (PER_LINE_OK_RE.test(line)) continue;
      if (i > 0 && PER_LINE_OK_RE.test(lines[i - 1])) continue;
      if (isLegitGenericDefault(line)) continue;
      if (isCatchClause(line)) continue;
      for (const { name, re } of PATTERNS) {
        if (re.test(line)) {
          violations.push({ file: relPath, line: i + 1, pattern: name, snippet: line.trim().slice(0, 120) });
          break;
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`audit-unknown-leakage: ${violations.length} violation(s) across ${totalScanned} files.`);
  for (const v of violations.slice(0, 50)) {
    console.error(`  • ${v.file}:${v.line}  [${v.pattern}]  ${v.snippet}`);
  }
  if (violations.length > 50) console.error(`  … and ${violations.length - 50} more.`);
  process.exit(1);
}

console.log(`audit-unknown-leakage: OK (no lazy unknown patterns outside the allowlist).`);
process.exit(0);
