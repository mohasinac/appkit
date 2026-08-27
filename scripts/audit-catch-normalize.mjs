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

/**
 * `try { } catch (err) { }` — the original check.
 *
 * The leading `(^|\s)` is load-bearing: it is what keeps this from also matching
 * the `.catch(` promise form, which is handled separately below because the two
 * have different shapes (and, historically, because this regex silently skipped
 * every promise catch in the codebase — see BOUND_PROMISE_CATCH_RE).
 */
const CATCH_RE = /(^|\s)catch\s*\(\s*([A-Za-z_$][\w$]*)\b/g;

/**
 * `.catch((err) => …)` / `.catch(err => …)` / `.catch(async (err) => …)`.
 *
 * These bind the same `unknown` a `try/catch` does and carry the same
 * obligation, but CATCH_RE could never match them — in `.catch(` the preceding
 * character is `.`, which fails its `(^|\s)` prefix. That hole hid every promise
 * catch in `src/` and `appkit/src/` from this audit.
 *
 * NOTE: an *unbound* `.catch(() => null)` is deliberately NOT matched here.
 * There is no error variable to normalize, so it is a different defect —
 * a swallowed failure rather than an untyped one — and it belongs to
 * audit-silent-degrade, which counts several hundred of them.
 */
const BOUND_PROMISE_CATCH_RE =
  /\.catch\s*\(\s*(?:async\s*)?\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>/g;

/**
 * `catch { }` — optional catch binding. Nothing to normalize because nothing is
 * captured, which also means the error is unconditionally discarded. Always a
 * violation; there is no compliant form.
 */
const BARE_CATCH_RE = /(^|\s)catch\s*\{/g;

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
      // Suppression marker on this line or the line above covers every kind.
      const suppressed =
        RAW_OK_RE.test(line) || (i > 0 && RAW_OK_RE.test(lines[i - 1]));

      // --- bound catches: try/catch (err) and .catch(err => …) -------------
      const bound = [
        ...[...line.matchAll(CATCH_RE)].map((m) => m[2]),
        ...[...line.matchAll(BOUND_PROMISE_CATCH_RE)].map((m) => m[1]),
      ];

      for (const varName of bound) {
        totalCatch++;
        if (suppressed) continue;

        // Look ahead 6 lines for an acceptable pattern.
        const window = lines.slice(i, i + 7).join("\n");
        const callsNormalize = new RegExp(`normalizeError\\s*\\(\\s*${varName}\\b`).test(window);
        const reThrows = new RegExp(`throw\\s+${varName}\\b`).test(window);
        if (callsNormalize || reThrows) continue;

        violations.push({
          file: relative(REPO_ROOT, file),
          line: i + 1,
          varName,
          kind: "UNNORMALIZED_CATCH",
          snippet: line.trim().slice(0, 120),
        });
      }

      // --- bare `catch {` — no binding, so the error is always discarded ----
      for (const _m of line.matchAll(BARE_CATCH_RE)) {
        totalCatch++;
        if (suppressed) continue;
        violations.push({
          file: relative(REPO_ROOT, file),
          line: i + 1,
          varName: "(no binding)",
          kind: "BARE_CATCH",
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
