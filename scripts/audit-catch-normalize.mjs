#!/usr/bin/env node
/**
 * audit-catch-normalize
 *
 * Enforces that every `catch (X)` block funnels through `normalizeError(X)`
 * (from appkit/src/errors/normalize.ts) before doing anything else with the
 * thrown value. After normalization the catch variable is a typed
 * `NormalizedError` discriminated union — `unknown` never escapes the
 * catch clause.
 *
 * Pattern accepted (any of the following on the first non-comment statement
 * inside the catch block):
 *   - `normalizeError(<var>)` somewhere in the next 6 lines
 *   - `throw <var>` (re-throw — no narrowing needed)
 *   - `return ...` immediately (handler skipped)
 *   - `// audit-catch-raw-ok: <reason>` on the catch line OR the line above
 *
 * Per the plan, this audit is added in W3 and wired into `npm run check`
 * by W8 (strict-zero). For now it runs in REPORT mode — exits 0 with a
 * stderr summary of any unmigrated catch sites so the migration can be
 * tracked.
 *
 * Run:  node appkit/scripts/audit-catch-normalize.mjs
 *       MIGRATE=strict node appkit/scripts/audit-catch-normalize.mjs   # fail on violation
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
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

// W8 — flipped to strict-zero default after the migration backlog drained.
const STRICT = process.env.MIGRATE !== "report";

function* walk(root) {
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (EXCLUDED_DIRS.has(e.name)) continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      yield full;
    }
  }
}

const CATCH_RE = /(^|\s)catch\s*\(\s*([A-Za-z_$][\w$]*)\b/g;
const RAW_OK_RE = /\/\/\s*audit-catch-raw-ok\s*:/i;

const violations = [];
let totalCatch = 0;

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    if (!src.includes("catch")) continue;

    // Skip our own normalizer file.
    if (file.endsWith(join("errors", "normalize.ts"))) continue;
    // Skip the audit script itself.
    if (file === fileURLToPath(import.meta.url)) continue;

    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = [...line.matchAll(CATCH_RE)];
      if (m.length === 0) continue;
      for (const match of m) {
        totalCatch++;
        const varName = match[2];
        // Suppression marker on this line or the line above.
        if (RAW_OK_RE.test(line)) continue;
        if (i > 0 && RAW_OK_RE.test(lines[i - 1])) continue;

        // Look ahead 6 lines for an acceptable pattern.
        const window = lines.slice(i, i + 7).join("\n");
        const callsNormalize = new RegExp(`normalizeError\\s*\\(\\s*${varName}\\b`).test(window);
        const reThrows = new RegExp(`throw\\s+${varName}\\b`).test(window);
        if (callsNormalize || reThrows) continue;

        violations.push({
          file: relative(REPO_ROOT, file),
          line: i + 1,
          varName,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }
}

const VIOLATIONS = violations.length;

if (STRICT && VIOLATIONS > 0) {
  console.error(`audit-catch-normalize: ${VIOLATIONS}/${totalCatch} catch sites do not call normalizeError().`);
  for (const v of violations.slice(0, 50)) {
    console.error(`  • ${v.file}:${v.line} — catch (${v.varName})  ${v.snippet}`);
  }
  if (violations.length > 50) console.error(`  … and ${violations.length - 50} more.`);
  process.exit(1);
}

if (VIOLATIONS > 0) {
  console.warn(`audit-catch-normalize: REPORT MODE — ${VIOLATIONS}/${totalCatch} catch sites await migration.`);
  console.warn(`  Run with MIGRATE=strict to fail. Wired into npm run check at W8.`);
  console.warn(`  Top 10 sites:`);
  for (const v of violations.slice(0, 10)) {
    console.warn(`    • ${v.file}:${v.line} — catch (${v.varName})`);
  }
} else {
  console.log(`audit-catch-normalize: OK (${totalCatch} catch sites all migrated).`);
}

process.exit(0);
