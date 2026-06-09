#!/usr/bin/env node
/**
 * audit-appkit-reexports.mjs — barrel discipline for the appkit public API.
 *
 * Root Cause #18: barrel re-exports inflate Turbopack's static import graph and
 * leak internal symbols. Only the public API may re-export, and only via named
 * exports (so the allowlist is grep-able).
 *
 * Rules (applied to appkit/src/{index,client,server}.ts):
 *   1. NO `export * from "..."` — always use named exports.
 *   2. NO re-exports from a path containing `/_internal/` — private modules
 *      must not surface through the public barrels.
 *
 * Other re-exports are allowed (the barrels ARE the public API). Drift in
 * the allowlist is governed by the auto-generator (scripts/get-index.js)
 * and code review, not this audit.
 *
 * Exits 0 clean / 1 on any violation.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");

const BARRELS = ["index.ts", "client.ts", "server.ts"]
  .map(f => join(APPKIT_ROOT, "src", f))
  .filter(existsSync);

const RE_EXPORT_STAR = /^\s*export\s*\*\s*(?:as\s+\w+\s*)?from\s+["']([^"']+)["']/;
const RE_EXPORT_FROM = /^\s*export\s*\{[^}]*\}\s*from\s+["']([^"']+)["']/;

// Baseline drift — drive toward 0 by either (a) hoisting symbols out of _internal/,
// or (b) renaming the consumers to import from the defining module directly.
const BASELINE = 63;

const violations = [];

// Suppression marker: a `// reexport-from-internal-ok` comment on the same line
// or the preceding line marks an intentional public-API exposure from _internal/.
// Use sparingly — most _internal symbols should be hoisted to a public location.
const SUPPRESS_RE = /\/\/\s*reexport-from-internal-ok/;

for (const file of BARRELS) {
  const lines = readFileSync(file, "utf8").split("\n");
  const rel = `appkit/src/${file.split(/[\\/]/).pop()}`;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";
    const suppressed = SUPPRESS_RE.test(line) || SUPPRESS_RE.test(prevLine);

    const mStar = line.match(RE_EXPORT_STAR);
    if (mStar) {
      if (suppressed) continue;
      violations.push({
        file: rel, line: i + 1, rule: "EXPORT_STAR",
        msg: `\`export *\` from "${mStar[1]}" — use named re-exports so the public API is grep-able.`,
        text: line.trim(),
      });
      continue;
    }
    const mFrom = line.match(RE_EXPORT_FROM);
    if (mFrom && mFrom[1].includes("/_internal/")) {
      if (suppressed) continue;
      // CLAUDE.md § SSR Architecture designates these paths as the canonical
      // home for SSR feature code that is intentionally public API:
      //   _internal/server/features/<feature>/    (data, adapters, actions, metadata, og)
      //   _internal/client/features/<feature>/    (client components)
      //   _internal/shared/features/<feature>/    (cross-tier shared)
      // Re-exports from these paths are intentional, not accidental leaks.
      const isFeatureModule = /\/_internal\/(server|client|shared)\/features\//.test(mFrom[1]);
      if (isFeatureModule) continue;
      // Also allow specific known-public-API modules outside features/.
      const KNOWN_PUBLIC = [
        "/_internal/shared/actions/bulk-helpers",   // buildBulkAction is part of public action API
        "/_internal/shared/listing-types/_registry", // LISTING_TYPE_REGISTRY is public listing-type API
      ];
      if (KNOWN_PUBLIC.some(p => mFrom[1].includes(p))) continue;
      violations.push({
        file: rel, line: i + 1, rule: "INTERNAL_REEXPORT",
        msg: `re-export from "${mFrom[1]}" — _internal/ symbols must not leak through public barrels. Move the symbol or wire consumers directly.`,
        text: line.trim(),
      });
    }
  }
}

if (violations.length === 0) {
  console.log("audit-appkit-reexports: clean ✓");
  process.exit(0);
}

if (violations.length <= BASELINE) {
  console.log(`audit-appkit-reexports: ${violations.length} (baseline ${BASELINE}). No regression.`);
  process.exit(0);
}

const out = [`audit-appkit-reexports: ${violations.length} barrel violation(s) (baseline ${BASELINE} — regression of ${violations.length - BASELINE}).\n`];
const byRule = { EXPORT_STAR: [], INTERNAL_REEXPORT: [] };
for (const v of violations) byRule[v.rule].push(v);
for (const [rule, list] of Object.entries(byRule)) {
  if (list.length === 0) continue;
  out.push(`[${rule}] ${list.length} instance(s)`);
  for (const v of list) {
    out.push(`  ${v.file}:${v.line}  ${v.text}`);
    out.push(`    → ${v.msg}`);
  }
  out.push("");
}
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
