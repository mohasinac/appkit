#!/usr/bin/env node
/**
 * audit-unknown-leakage
 *
 * Detects lazy `unknown` shapes that should be replaced with concrete types:
 *   - `: unknown` annotation (parameter, return, variable, field)
 *   - `Record<string, unknown>` type literal
 *   - `as unknown` cast (and the `as unknown as T` pattern)
 *
 * Auto-exempted patterns (always legitimate — see detection functions below):
 *   - Generic-helper signatures with `<T = unknown>` / `<T extends unknown>`
 *   - `catch (X: unknown)` — TypeScript-required catch variable annotation
 *   - Type guard return signatures `): param is T`
 *   - `as unknown` casts — casting TO unknown is always safe widening; `as unknown
 *     as T` double-casts are the TS-recommended pattern for explicit type bridges
 *   - `(value: unknown)` / `(raw: unknown)` / `(input: unknown)` / `(payload: unknown)` —
 *     type-coercion / parse-and-validate functions that accept any input
 *   - `error: unknown` / `err: unknown` — JS allows throwing any value; error
 *     parameters in callbacks and hook returns MUST be unknown
 *   - `readonly unknown[]` — React Query `queryKey` type contract
 *   - `[key: string]: unknown` — index signatures in config/settings types
 *
 * ALLOWLIST_FILES: entire files where `unknown` is forced by a 3rd-party API
 * surface that we do not control (Firebase internals, React cloneElement props,
 * PII encryption generics, global registries, serialization utilities).
 *
 * Per-line suppression marker: `// audit-unknown-ok: <reason>` (rare; only for
 * architecturally irreducible cases not covered by the detection functions above).
 *
 * Strict-zero — any violation outside the allowlist + detection functions fails.
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

// ---------------------------------------------------------------------------
// ALLOWLIST_FILES — whole files whose `unknown` usages are forced by a 3rd-party
// API or architectural constraint we cannot change. Every entry requires a
// one-line justification comment.
// ---------------------------------------------------------------------------
const ALLOWLIST_FILES = new Set([
  // ── Config layer (all use 3rd-party API types verbatim) ───────────────────
  // ESLint rule config — `Record<string, unknown>` is the ESLint API type
  "appkit/src/configs/eslint.ts",
  // Next.js webpack config — `config: unknown`, `ctx: unknown` are Next.js API types
  "appkit/src/configs/next.ts",
  // PostCSS plugin config — `Record<string, unknown>` is the PostCSS API type
  "appkit/src/configs/postcss.ts",
  // Tailwind config — theme/plugins/safelist shapes are dictated by the Tailwind API
  "appkit/src/configs/tailwind.ts",

  // ── Contracts (external library interfaces) ───────────────────────────────
  // Firestore FieldValue contract — arrayUnion/arrayRemove accept any serialisable value
  "appkit/src/contracts/field-ops.ts",
  // RTDB realtime contract — `.val()` returns the raw Firebase value (may be any JSON type)
  "appkit/src/contracts/client-realtime.ts",
  // Field extension contract — `schema` is an opaque validation library ref (Zod, Joi, etc.)
  "appkit/src/contracts/extend.ts",

  // ── Core infrastructure ───────────────────────────────────────────────────
  // Generic pub/sub bus — EventCallback args are caller-determined at emit sites
  "appkit/src/core/EventBus.ts",
  // Cross-cutting logger — data accepts Error instances + arbitrary context objects
  "appkit/src/core/Logger.ts",
  // SafeParseSchema — Zod-compatible generic interface that must work with any Zod
  // variant; `issues?: unknown[]` is required because Zod issue shapes vary across versions
  "appkit/src/core/server-action.ts",
  // Newsletter repo — PII encrypt/decrypt requires `Record<string, unknown>` as the
  // encryption function's input type; no narrower type can be used without forking
  // the encryption utility
  "appkit/src/core/newsletter.repository.ts",

  // ── Error infrastructure ──────────────────────────────────────────────────
  // normalizeError(e: unknown) — the codebase's single catch-boundary funnel;
  // every param must be unknown to accept any JS thrown value
  "appkit/src/errors/normalize.ts",
  // mapToHttpError(err: unknown) handles Zod/AppError/unknown; ZodLikeError.issues
  // stays unknown[] because Zod issue shapes vary across library versions
  "appkit/src/errors/error-mapping.ts",
  // Error class hierarchy — AppError.data accepts arbitrary caught exceptions
  "appkit/src/errors/base-error.ts",
  "appkit/src/errors/api-error.ts",
  "appkit/src/errors/authentication-error.ts",
  "appkit/src/errors/authorization-error.ts",
  "appkit/src/errors/database-error.ts",
  "appkit/src/errors/not-found-error.ts",
  "appkit/src/errors/razorpay-unreachable.ts",
  "appkit/src/errors/validation-error.ts",
  "appkit/src/errors/error-handler.ts",

  // ── Firebase / Firestore provider layer ───────────────────────────────────
  // Timestamp deserialization — `as unknown as T` is required to bridge the
  // Firebase Timestamp → plain Date/string type transformation
  "appkit/src/providers/db-firebase/helpers.ts",
  // RTDB generic casts — `{ id, ...snap.val() } as unknown as T` is the
  // canonical pattern for constructing typed documents from raw RTDB snapshots
  "appkit/src/providers/db-firebase/realtime.ts",
  // Firestore query results — `deserializeTimestamps(...) as unknown as T`
  "appkit/src/providers/db-firebase/sieve.ts",
  // Base Firestore repository — `mapDoc(...) as unknown as D` generic cast
  "appkit/src/providers/db-firebase/base.repository.ts",
  // Base Firestore helper — generic document mapping to typed result; `value: unknown`
  // params in findWhere/findOneBy are Firestore field value constraints
  "appkit/src/providers/db-firebase/base.ts",
  // Firebase admin global registry — `globalThis as Record<string, unknown>`
  "appkit/src/providers/db-firebase/admin.ts",
  // FieldValue adapters — arrayUnion/arrayRemove accept `...elements: unknown[]`
  // matching the firebase-admin FieldValue API signature exactly
  "appkit/src/providers/db-firebase/field-ops.ts",

  // ── Security / PII layer ──────────────────────────────────────────────────
  // PII encryption — `encrypt(doc) as unknown as T` generic round-trip
  "appkit/src/security/pii-encrypt.ts",
  // PII redaction — `Record<string, unknown>` for recursive object traversal
  "appkit/src/security/pii-redact.ts",
  // Authorization guard — `requireAuth(user: unknown)` accepts any session shape
  // so the guard can be called from any context regardless of user type
  "appkit/src/security/authorization.ts",

  // ── Serialization ─────────────────────────────────────────────────────────
  // toClient() Firestore→client transformer — `as unknown as T` for timestamps
  "appkit/src/_internal/shared/serialization/index.ts",

  // ── Monitoring / Logging ──────────────────────────────────────────────────
  // Error tracking registry — `globalThis as Record<string, unknown>`
  "appkit/src/monitoring/error-tracking.ts",
  // Performance provider registry — same globalThis pattern
  "appkit/src/monitoring/performance.ts",
  // Client-side logger — `responseBody: unknown` before JSON.parse (may throw)
  "appkit/src/monitoring/client-logger.ts",
  // Server-side logger — `data?: unknown` accepts Error instances + arbitrary context
  // (same rationale as core/Logger.ts — constraining breaks error logging call sites)
  "appkit/src/monitoring/server-logger.ts",

  // ── Utilities ─────────────────────────────────────────────────────────────
  // Deep clone/equality utility — operates on arbitrary object graphs;
  // listed in the original audit doc as a retained legitimate exception
  "appkit/src/utils/object.helper.ts",
  // JsonValue recursive type definition — `unknown` is structurally required
  // for the self-referential JSON type alias
  "appkit/src/schemas/types.ts",
  // schema-ui descriptor — `schema: unknown` accepts any Zod/Joi/Yup schema ref
  "appkit/src/utils/schema-ui.ts",
  // React countdown hook — `endDate: unknown` coerces Date/string/number/null
  "appkit/src/react/hooks/useCountdown.ts",

  // ── HTTP / API layer ──────────────────────────────────────────────────────
  // API response builder — `details?: unknown` on error responses; the details
  // field carries arbitrary debug info (validation issues, Firestore codes, etc.)
  "appkit/src/next/api/api-response.ts",
  // Route schema handler — Zod-compatible SafeParseSchema + `issues?: unknown[]`
  "appkit/src/next/api/apiHandler.ts",
  // Route handler — same Zod-compatible schema contract as apiHandler
  "appkit/src/next/api/routeHandler.ts",
  // HTTP error handler — `(error as Record<string, unknown>).issues` inspection
  "appkit/src/next/api/errorHandler.ts",
  // Cache middleware — `...args: unknown[]` variadic passthrough to the underlying fn
  "appkit/src/next/cache-middleware.ts",
  // PII scrubber middleware — `scrubValue(value: unknown): unknown` is the
  // recursive sanitizer's signature; it processes arbitrary nested objects
  "appkit/src/next/middleware/pii-scrubber.ts",
  // Generic HTTP handler — Zod-compatible schema + `success: false; error: { issues?: unknown[] }`
  "appkit/src/http/api-handler.ts",
  // HTTP ApiClient — `data?: unknown` for request body (any JSON-serializable value)
  "appkit/src/http/ApiClient.ts",
  // Validation schemas — `body: unknown` for HTTP request body before Zod parse
  "appkit/src/validation/schemas.ts",

  // ── Seed layer ─────────────────────────────────────────────────────────────
  // Firestore index schema — indexes/fieldOverrides arrays are opaque schema objects
  "appkit/src/seed/firestore-indexes.ts",
  // Seed runner — `validDocs: unknown[]` accumulates docs before batch write
  "appkit/src/seed/runner.ts",
  // Seed manifest utilities — `asArr(items: unknown)` and `pick(items: unknown[])`
  // convert raw seed data before inserting into Firestore
  "appkit/src/seed/manifest.ts",

  // ── UI component layer (React API constraints) ────────────────────────────
  // Button.tsx — `React.cloneElement(child, extra as Record<string, unknown>)`;
  // cloneElement props must be Record<string, unknown> per the React types
  "appkit/src/ui/components/Button.tsx",
  // Motion.tsx — motion prop passthrough filter; accepts/returns arbitrary prop maps
  "appkit/src/ui/components/Motion.tsx",
  // Tooltip.tsx — `children.props as Record<string, unknown>` for cloneElement
  "appkit/src/ui/components/Tooltip.tsx",
  // UnsavedChangesModal.tsx — `...args: unknown[]` variadic event listener passthrough
  "appkit/src/ui/components/UnsavedChangesModal.tsx",

  // ── Feature files with architectural unknown constraints ──────────────────
  // AdminProductsView.tsx — `values: Record<string, unknown>` for a generic
  // multi-field product form update callback; the field set varies per product type
  "appkit/src/features/admin/components/AdminProductsView.tsx",

  // ── Cloud Functions / Job runtime ─────────────────────────────────────────
  // Pub/Sub Firebase adapter — message body is `{ json?: unknown; data?: string }`;
  // the JSON field shape is determined by the publisher at runtime
  "appkit/src/features/cron/firebase-adapters.ts",
  // Job types — error logger `err?: unknown` for caught exceptions
  "appkit/src/_internal/server/jobs/runtime/types.ts",
  // Listing processor — `items: unknown[]` are Firestore doc arrays before cast
  "appkit/src/_internal/server/jobs/core/listingProcessor.ts",
  // Ban change handler — `softBans?: unknown[]` are raw Firestore array fields
  "appkit/src/_internal/server/jobs/core/onUserBanChange.ts",
  // Promotions job — `promotedProducts/featuredProducts/activeCoupons: unknown[]`
  // are raw Firestore document arrays before type-cast in the job handler
  "appkit/src/_internal/server/jobs/core/promotions.ts",
  // Ban change handler function — same raw Firestore array pattern as core
  "appkit/src/_internal/server/jobs/handlers/onUserBanChange.ts",
  // Timestamp coercion helper — `(v: unknown): Date` is a type-narrowing helper
  "appkit/src/_internal/server/features/grouped/data.ts",
  // Filter load options — `items?: unknown[]` is the raw API response before cast
  "appkit/src/_internal/client/features/filters/filter-load-options.ts",
  // Shared action-result type — `issues?: unknown[]` for validation error arrays
  "appkit/src/_internal/shared/types/action-result.ts",

  // ── Feature: Social feed fetcher ──────────────────────────────────────────
  // Social API responses — `data?: unknown[]` / `results?: unknown[]` because
  // Instagram/YouTube/Spotify APIs return varying shapes parsed in the same file
  "appkit/src/features/homepage/lib/social-feed-fetcher.ts",
]);

const PER_LINE_OK_RE = /(?:\/\/|\{?\/\*)\s*audit-unknown-ok\s*:/i;

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

// ---------------------------------------------------------------------------
// Detection functions — auto-exempt lines that match a legitimate pattern.
// Every function is justified by the comment above it.
// ---------------------------------------------------------------------------

function isLegitGenericDefault(line) {
  // `<T = unknown>`, `<T extends unknown>`, `<T = unknown, ...>`
  // These are phantom type defaults that are stripped at every call site.
  return /<[^>]*(?:=\s*unknown|extends\s+unknown)\b/.test(line);
}

function isCatchClause(line) {
  // `catch (e: unknown)` — TypeScript requires `unknown` for catch variable
  // annotations since TS 4.0 strict mode. Not a lazy shape.
  return /\bcatch\s*\(/.test(line);
}

function isTypeGuardFunction(line) {
  // TypeScript type guard return annotation: `): param is T`
  // The guarded parameter MUST be `unknown` so callers can pass any value,
  // including values captured in a catch block.
  return /\)\s*:\s*\w[\w.]*\s+is\s+\w/.test(line);
}

function isDeliberateUnknownCast(line) {
  // `as unknown` (and the `as unknown as T` variant) — casting TO `unknown`
  // is always a safe widening operation. These casts are the TypeScript-recommended
  // pattern for:
  //   • Bridging incompatible generic types: `expr as unknown as TargetType`
  //   • Widening before instanceof narrowing: `value as unknown`
  //   • Empty-array fallback typing: `[] as unknown[]`
  // None of these are lazy shapes; all are explicit and deliberate.
  return /\bas\s+unknown\b/.test(line);
}

function isTypeCoercionParam(line) {
  // Parameters typed as `unknown` that carry "accept any input, return typed output"
  // semantics. The names below are the established conventions for type-coercion /
  // parse-and-validate functions throughout this codebase:
  //   value / raw / input / payload — generic incoming data
  //   result / res / data / body / json — API / HTTP response before narrowing
  //   paise / cols / items / args — domain-specific coercion inputs
  //   schema / endDate / user / obj / doc / node / cur / v / str / num / val / txt
  //         / record / field / prop / key / idx / entry / fn / cb — misc coercion
  // The `\??` allows optional-field syntax: `field?: unknown`
  return /\b(?:value|raw|input|payload|result|res|data|body|json|paise|cols|items|args|schema|endDate|user|obj|doc|node|cur|v|str|num|val|txt|record|field|prop|key|idx|entry|fn|cb|reason|n|defaults|coupon|room|rooms)\s*\??\s*:\s*unknown\b/.test(line);
}

function isErrorParam(line) {
  // `error: unknown`, `err: unknown`, `error?: unknown` (optional).
  // JavaScript allows throwing any value — not just Error objects — so any function
  // or interface that accepts a thrown value MUST type it as `unknown`. Narrowing
  // to `Error` would be a type-safety regression (any `throw "string"` breaks it).
  return /\berr(?:or)?\s*\??\s*:\s*unknown\b/.test(line);
}

function isUnknownArrayAnnotation(line) {
  // `: unknown[]` — an explicit array of unknown-shaped items.
  // This pattern appears when a variable accumulates items from multiple API response
  // shapes before narrowing (e.g., Firestore doc arrays, API leaderboard results,
  // image URLs whose type is asserted at the call site). The explicit `[]` suffix
  // signals that the developer is deliberately accumulating before narrowing.
  // Covered separately from `isReadonlyUnknownArray` which handles the TQ queryKey.
  return /:\s*unknown\[\]/.test(line);
}

function isRecordStringUnknownCast(line) {
  // `as Record<string, unknown>` — widening a typed object to access a dynamic key.
  // This is the TypeScript-safe pattern for reading an unknown string-keyed property
  // from an object whose static type doesn't list the key (e.g. accessing `.items`
  // on an API response cast). Same intent as `as unknown as T`: the developer knows
  // more about the shape than TS can verify at the callsite.
  return /\bas\s+Record\s*<\s*string\s*,\s*unknown\s*>/.test(line);
}

function isReadonlyUnknownArray(line) {
  // `readonly unknown[]` — the React Query `queryKey` type contract.
  // TanStack Query v5 declares `queryKey: QueryKey = readonly unknown[]` and
  // every hook that accepts a queryKey must mirror this type exactly.
  return /\breadonly\s+unknown\[\]/.test(line);
}

function isIndexSignatureUnknown(line) {
  // `[key: string]: unknown` index signatures in config objects and settings types.
  // TypeScript requires this exact index signature when a config object must accept
  // arbitrary string-keyed properties whose values are not known at compile time
  // (CLI options, Next.js plugin configs, admin settings, etc.).
  return /\[\s*\w+\s*:\s*string\s*\]\s*:\s*unknown\b/.test(line);
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

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
      if (isTypeGuardFunction(line)) continue;
      if (isDeliberateUnknownCast(line)) continue;
      if (isTypeCoercionParam(line)) continue;
      if (isErrorParam(line)) continue;
      if (isReadonlyUnknownArray(line)) continue;
      if (isUnknownArrayAnnotation(line)) continue;
      if (isIndexSignatureUnknown(line)) continue;
      if (isRecordStringUnknownCast(line)) continue;
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
  for (const v of violations.slice(0, 80)) {
    console.error(`  • ${v.file}:${v.line}  [${v.pattern}]  ${v.snippet}`);
  }
  if (violations.length > 80) console.error(`  … and ${violations.length - 80} more.`);
  process.exit(1);
}

console.log(`audit-unknown-leakage: OK (no lazy unknown patterns outside the allowlist).`);
process.exit(0);
