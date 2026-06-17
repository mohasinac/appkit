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
 * The audit ships in REPORT MODE on first run so the baseline can be
 * observed; once W8 flips strict-zero (after the catch / route backlog
 * drains) this enforces no new leakage.
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
    // Architectural entry-point boundaries — every `: unknown` here is the
    // canonical "value of arbitrary shape" landing zone, sanitized/narrowed
    // by the function body. JsonValue would force callers to pre-narrow,
    // defeating the boundary's purpose.
    "appkit/src/core/Logger.ts",                    // logger entry-point (data?: unknown sanitised by setSanitizer)
    "appkit/src/core/EventBus.ts",                  // EventBus payload (...args: unknown[])
    "appkit/src/core/server-action.ts",             // server-action error wrapper
    "appkit/src/core/mutation-events.ts",           // mutation event payload
    "appkit/src/contracts/field-ops.ts",            // Firestore arrayUnion/arrayRemove SDK boundary
    "appkit/src/contracts/extend.ts",               // schema?: unknown extension point
    "appkit/src/contracts/client-realtime.ts",      // RTDB val(): unknown
    "appkit/src/client/api/ApiError.ts",            // ApiError.cause / issues — error chaining
    "appkit/src/client/api/surface-error.ts",       // surfaceError(err: unknown)
    "appkit/src/client/api/useApiQuery.ts",         // React Query callback signatures
    "appkit/src/errors/base-error.ts",              // base-error data?: unknown
    "appkit/src/errors/api-error.ts",
    "appkit/src/errors/authentication-error.ts",
    "appkit/src/errors/authorization-error.ts",
    "appkit/src/errors/database-error.ts",
    "appkit/src/errors/error-handler.ts",           // catch-and-classify entry-point
    "appkit/src/errors/error-mapping.ts",           // error-shape predicates (isZodLikeError, isFirestoreLikeError)
    "appkit/src/errors/validation-error.ts",        // ValidationError.issues from Zod
    "appkit/src/errors/not-found-error.ts",
    "appkit/src/errors/razorpay-unreachable.ts",
    "appkit/src/core/newsletter.repository.ts",     // arbitrary-payload newsletter wrapper
    "appkit/src/configs/next.ts",                   // Next.js config callbacks (webpack ctx)
    "appkit/src/configs/tailwind.ts",               // Tailwind config (plugins?: unknown[])
    "appkit/src/configs/postcss.ts",                // PostCSS config
    "appkit/src/configs/eslint.ts",                 // ESLint config
    "appkit/src/cli/index.ts",                      // CLI argv shape
    "appkit/src/http/ApiClient.ts",                 // HTTP body/response — arbitrary JSON
    "appkit/src/http/api-handler.ts",               // Zod safeParse boundary
    "appkit/src/next/api/api-response.ts",          // Generic response wrapper (issues field)
    "appkit/src/next/api/apiHandler.ts",            // Next.js route dispatcher boundary
    "appkit/src/next/api/routeHandler.ts",          // Route handler — body schema parse boundary
    "appkit/src/features/homepage/lib/social-feed-fetcher.ts", // Third-party RSS/JSON ingest
    "appkit/src/monitoring/error-tracking.ts",      // Observability adapter
    "appkit/src/monitoring/performance.ts",         // Performance adapter
    "appkit/src/_internal/server/jobs/core/wrapJobHandler.ts", // Firebase Function dispatcher
    "appkit/src/features/cron/firebase-adapters.ts", // Firebase Cron adapter
    "appkit/src/next/api/errorHandler.ts",          // Error JSON serialization boundary
    "appkit/src/seed/firestore-indexes.ts",         // Firestore index manifest — arbitrary JSON
    "appkit/src/security/pii-redact.ts",            // PII redaction — accepts arbitrary values
    "appkit/src/providers/db-firebase/field-ops.ts", // Firestore field operations
    "appkit/src/next/cache-middleware.ts",          // Next.js middleware boundary
  ].map((p) => p.replace(/\//g, "/")),
);

const PER_LINE_OK_RE = /\/\/\s*audit-unknown-ok\s*:/i;
// REPORT MODE — bulk suppression with a generic "pre-existing-baseline"
// reason was rejected as fake baseline-0; the only honest path to
// strict-zero is replacing each `: unknown` / `Record<string, unknown>` /
// `as unknown` site with a concrete type. Until that migration lands the
// audit reports the count and exits 0. Flip via `MIGRATE=strict`.
const STRICT = process.env.MIGRATE === "strict";

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

if (STRICT && violations.length > 0) {
  console.error(`audit-unknown-leakage: ${violations.length} violation(s) across ${totalScanned} files.`);
  for (const v of violations.slice(0, 50)) {
    console.error(`  • ${v.file}:${v.line}  [${v.pattern}]  ${v.snippet}`);
  }
  if (violations.length > 50) console.error(`  … and ${violations.length - 50} more.`);
  process.exit(1);
}

if (violations.length > 0) {
  console.warn(`audit-unknown-leakage: REPORT MODE — ${violations.length} sites await migration (across ${totalScanned} files).`);
  console.warn(`  Run with MIGRATE=strict to fail. Wired into the consumer dispatcher (REPORT mode) — flip to strict-zero once the backlog drains.`);
  console.warn(`  Top patterns:`);
  const byPat = new Map();
  for (const v of violations) byPat.set(v.pattern, (byPat.get(v.pattern) ?? 0) + 1);
  for (const [pat, count] of byPat) console.warn(`    ${pat.padEnd(28)}  ${count}`);
} else {
  console.log(`audit-unknown-leakage: OK (no lazy unknown patterns outside the allowlist).`);
}

process.exit(0);
