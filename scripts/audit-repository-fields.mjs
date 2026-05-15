#!/usr/bin/env node
/**
 * audit-repository-fields.mjs — repository Sieve field correctness checker.
 *
 * Detects two classes of bug in appkit/src/features/<feature>/repository files:
 *
 * 1. DEPRECATED J13 FIELD NAMES (SB1-G Phase 4, 2026-05-12)
 *    The legacy product boolean fields `isPreorder`, `isAuction`, and `isFeatured`
 *    were removed from ProductDocument. Queries that still use them return 0 results
 *    silently — Firestore does not error on an unknown field in a where() clause.
 *    Replacements:
 *      isPreorder==true  → listingType==pre-order
 *      isAuction==true   → listingType==auction
 *      isFeatured==true  → featured==true
 *      active==true      → status==published  (product context)
 *
 * 2. ROOT-LEVEL SORT PATHS THAT SHOULD BE NESTED UNDER stats.*
 *    The StoreDocument nests its counters inside a `stats` object.
 *    Sorting by `-itemsSold` or `-averageRating` at root level matches nothing.
 *    Correct paths: -stats.itemsSold, -stats.averageRating
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = join(__dirname, "..", "src", "features");

// ─── Rule 1: deprecated J13 field names in Sieve filter strings ──────────────
// Match the string value of a `filters:` or filters property assignment.
const FILTER_VALUE_RE = /filters\s*[:=]\s*["'`]([^"'`]+)["'`]/g;

const DEPRECATED_SIEVE_FIELDS = [
  {
    pattern: /\bisPreorder==/,
    message: "isPreorder== is removed (J13). Use listingType==pre-order",
  },
  {
    pattern: /\bisAuction==/,
    message: "isAuction== is removed (J13). Use listingType==auction",
  },
  {
    pattern: /\bisFeatured==/,
    message: "isFeatured== is removed (J13). Use featured==true",
  },
];

// ─── Rule 2: root-level sort paths that should be stats.* ───────────────────
// Match `sort: "-itemsSold"` or `sort: "itemsSold"` etc.
const ROOT_SORT_PATHS = [
  {
    pattern: /sort\s*[:=]\s*["'`]-?itemsSold["'`]/,
    message: 'sort on root "itemsSold" — use "stats.itemsSold" (nested field)',
  },
  {
    pattern: /sort\s*[:=]\s*["'`]-?averageRating["'`]/,
    message: 'sort on root "averageRating" — use "stats.averageRating" (nested field)',
  },
];

// ─── Walker (only scan repository files) ─────────────────────────────────────

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (
      (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx") &&
      // Only look at repository files, not seeds, schemas, types, or components
      (entry.name.endsWith(".repository.ts") || full.includes(`${entry.sep ?? "/"}repository${entry.sep ?? "/"}`))
    ) {
      files.push(full);
    }
  }
  return files;
}

// ─── Collect violations ───────────────────────────────────────────────────────

const violations = [];

for (const file of walk(REPO_DIR)) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  const rel = relative(join(__dirname, ".."), file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Rule 1: scan filter string values
    let m;
    const filterRe = /filters\s*[:=]\s*["'`]([^"'`]+)["'`]/g;
    while ((m = filterRe.exec(line)) !== null) {
      const filterValue = m[1];
      for (const { pattern, message } of DEPRECATED_SIEVE_FIELDS) {
        if (pattern.test(filterValue)) {
          violations.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120), message });
        }
      }
    }

    // Rule 2: scan sort values on any line
    for (const { pattern, message } of ROOT_SORT_PATHS) {
      if (pattern.test(line)) {
        violations.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120), message });
      }
    }
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log("audit-repository-fields: no deprecated field names or root-level sort paths found ✓");
  process.exit(0);
}

const byRule = { j13: [], sort: [] };
for (const v of violations) {
  if (v.message.includes("sort on root")) byRule.sort.push(v);
  else byRule.j13.push(v);
}

const out = [`audit-repository-fields: ${violations.length} violation(s) found.\n`];

if (byRule.j13.length > 0) {
  out.push(`[J13_DEPRECATED_FIELDS] Sieve filters using removed product boolean fields (${byRule.j13.length} instances)`);
  out.push("  Fix: replace with listingType== or featured== or status== equivalents");
  for (const v of byRule.j13) {
    out.push(`  ${v.file}:${v.line}  ${v.text}`);
    out.push(`    → ${v.message}`);
  }
  out.push("");
}

if (byRule.sort.length > 0) {
  out.push(`[ROOT_SORT_PATH] sort() using root-level field that lives under stats.* (${byRule.sort.length} instances)`);
  out.push("  Fix: prefix with stats. — e.g. -stats.itemsSold");
  for (const v of byRule.sort) {
    out.push(`  ${v.file}:${v.line}  ${v.text}`);
    out.push(`    → ${v.message}`);
  }
  out.push("");
}

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
