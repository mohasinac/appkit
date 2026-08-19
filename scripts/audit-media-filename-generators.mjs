#!/usr/bin/env node
/**
 * audit-media-filename-generators
 *
 * Guards against the W1-51 bug class (2026-08-15): `validateMediaFilename()`
 * in `appkit/src/utils/id-generators.ts` is a hand-maintained regex table
 * (`MEDIA_FILENAME_PATTERNS`) that must stay in sync with the dispatcher
 * (`generateMediaFilename()`'s `switch (ctx.type)` cases). When they drift —
 * a new context type added to the dispatcher without a matching pattern, or
 * a pattern renamed without updating the dispatcher — uploads for that
 * context silently 500 at `/api/media/sign` in production.
 *
 * This is a static coverage check (dispatcher case ⇄ validator pattern),
 * not a full execute-and-diff of generator output — id-generators.ts is
 * TypeScript with no build step available to plain `node`. Every dispatcher
 * case must resolve to a validator pattern of the same name UNLESS it's a
 * documented shared-family case (several context types intentionally
 * dispatch to one shape-generator and validate against one shared pattern —
 * see SHARED_FAMILY below, mirroring the file's own docstring).
 *
 * Run: node appkit/scripts/audit-media-filename-generators.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const TARGET = join(REPO_ROOT, "appkit", "src", "utils", "id-generators.ts");

// Context types that intentionally share one generator + one validator
// pattern (documented in id-generators.ts's own validateMediaFilename
// docstring) — the pattern name on the right is what must exist in
// MEDIA_FILENAME_PATTERNS.
const SHARED_FAMILY = {
  "blog-cover": "blog-image",
  "blog-content-image": "blog-image",
  "blog-additional-image": "blog-image",
  "event-cover": "event-image",
  "event-winner-image": "event-image",
  "event-additional-image": "event-image",
};

function extractDispatcherCases(source) {
  const fnMatch = source.match(
    /export function generateMediaFilename\(ctx: MediaFilenameContext\): string \{([\s\S]*?)\n\}/,
  );
  if (!fnMatch) return null;
  const body = fnMatch[1];
  return [...body.matchAll(/case\s+"([a-z0-9-]+)"\s*:/g)].map((m) => m[1]);
}

function extractValidatorPatterns(source) {
  const arrMatch = source.match(
    /const MEDIA_FILENAME_PATTERNS[\s\S]*?=\s*\[([\s\S]*?)\n\];/,
  );
  if (!arrMatch) return null;
  const body = arrMatch[1];
  return [...body.matchAll(/context:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
}

function main() {
  let source;
  try {
    source = readFileSync(TARGET, "utf8");
  } catch (err) {
    console.error(`audit-media-filename-generators: could not read ${TARGET}: ${err.message}`);
    process.exit(1);
  }

  const dispatcherCases = extractDispatcherCases(source);
  const validatorPatterns = extractValidatorPatterns(source);

  if (!dispatcherCases || !validatorPatterns) {
    console.error(
      "audit-media-filename-generators: could not locate generateMediaFilename() or MEDIA_FILENAME_PATTERNS " +
        "in id-generators.ts — the file shape has changed enough that this audit needs updating.",
    );
    process.exit(1);
  }

  const patternSet = new Set(validatorPatterns);
  const violations = [];

  // Every dispatcher case must resolve to a validator pattern, directly or
  // via the documented shared-family mapping.
  for (const dispatcherCase of dispatcherCases) {
    const expectedPattern = SHARED_FAMILY[dispatcherCase] ?? dispatcherCase;
    if (!patternSet.has(expectedPattern)) {
      violations.push(
        `dispatcher case "${dispatcherCase}" has no validator pattern ` +
          `(expected MEDIA_FILENAME_PATTERNS to contain context "${expectedPattern}")`,
      );
    }
  }

  // Every validator pattern should correspond to at least one dispatcher
  // case (directly, or as a shared-family target) — an orphan pattern is
  // usually a stale leftover from a renamed/removed context type.
  const reachableFromDispatcher = new Set(
    dispatcherCases.map((c) => SHARED_FAMILY[c] ?? c),
  );
  for (const pattern of validatorPatterns) {
    if (!reachableFromDispatcher.has(pattern)) {
      violations.push(
        `validator pattern "${pattern}" has no matching dispatcher case (orphaned — ` +
          `check for a renamed/removed MediaFilenameContext type)`,
      );
    }
  }

  if (violations.length > 0) {
    console.error("audit-media-filename-generators: FAILED\n");
    for (const v of violations) console.error(`  - ${v}`);
    console.error(
      "\nEvery generator dispatched by generateMediaFilename() must have a matching entry in " +
        "MEDIA_FILENAME_PATTERNS (or be added to SHARED_FAMILY in this audit if it intentionally " +
        "shares a pattern with another context type) — see id-generators.ts:757-778 for the incident " +
        "this audit prevents from recurring.",
    );
    process.exit(1);
  }

  console.log(
    `audit-media-filename-generators: OK (${dispatcherCases.length} dispatcher cases, ` +
      `${validatorPatterns.length} validator patterns, all covered)`,
  );
}

main();
