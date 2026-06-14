#!/usr/bin/env node
/**
 * audit-schema-registry-completeness
 *
 * Structural sanity for the central schema registry at
 *   appkit/src/schemas/registry.ts
 *
 * Invariants enforced (strict zero violations):
 *   1. registry.ts exists and exports SCHEMAS with all 7 buckets present
 *      (firestore, api, forms, sieve, webhook, rtdb, storage).
 *   2. appkit/src/index.ts re-exports SCHEMAS from ./schemas/index.
 *   3. appkit/src/client.ts re-exports SCHEMAS from ./schemas/index (registry
 *      is pure Zod, isomorphic — required on both surfaces).
 *
 * W8 layers additional audits on top:
 *   - audit-firestore-schema-coverage: every CLAUDE.md collection registered.
 *   - audit-route-schema-registry:     every src/app/api/** route bound.
 *
 * This audit only checks the registry's shape. It must pass from W1 onward.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APPKIT_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

const REQUIRED_BUCKETS = ["firestore", "api", "forms", "sieve", "webhook", "rtdb", "storage"];

const failures = [];

// ---------------------------------------------------------------------------
// 1. registry.ts exists with all required buckets.
// ---------------------------------------------------------------------------
const registryPath = join(APPKIT_SRC, "schemas", "registry.ts");
if (!existsSync(registryPath)) {
  failures.push(`schemas/registry.ts is missing — W1 foundation must be in place.`);
} else {
  const src = readFileSync(registryPath, "utf8");
  if (!/export\s+const\s+SCHEMAS\s*=/.test(src)) {
    failures.push(`schemas/registry.ts must export const SCHEMAS.`);
  }
  for (const bucket of REQUIRED_BUCKETS) {
    // Each bucket appears as a local `const <bucket> = {...}` then composed into SCHEMAS.
    const declared = new RegExp(`(?:const|let|var)\\s+${bucket}\\s*=`).test(src);
    const composed = new RegExp(`SCHEMAS[\\s\\S]{0,400}\\b${bucket}\\b`).test(src);
    if (!declared || !composed) {
      failures.push(`schemas/registry.ts must declare and compose bucket "${bucket}".`);
    }
  }
  if (!/as const satisfies SchemaRegistry/.test(src)) {
    failures.push(`SCHEMAS must be \`as const satisfies SchemaRegistry\` so literal keys survive at the type level.`);
  }
}

// ---------------------------------------------------------------------------
// 2. index.ts re-exports SCHEMAS.
// 3. client.ts re-exports SCHEMAS.
// ---------------------------------------------------------------------------
function assertReexports(file) {
  const path = join(APPKIT_SRC, file);
  if (!existsSync(path)) {
    failures.push(`${file} is missing.`);
    return;
  }
  const src = readFileSync(path, "utf8");
  if (!/export\s*\{[^}]*\bSCHEMAS\b[^}]*\}\s*from\s*["']\.\/schemas\/index["']/.test(src)) {
    failures.push(`${file} must re-export SCHEMAS from "./schemas/index".`);
  }
}
assertReexports("index.ts");
assertReexports("client.ts");

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`audit-schema-registry-completeness: ${failures.length} violation(s).`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log("audit-schema-registry-completeness: OK (registry skeleton + barrels wired).");
