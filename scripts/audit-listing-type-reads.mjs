#!/usr/bin/env node
/**
 * audit-listing-type-reads.mjs — consumer property-access for removed booleans.
 *
 * SB1-G Phase 4 (2026-05-12) removed the `isAuction` / `isPreOrder` / `isPreorder`
 * boolean fields from ProductDocument. The existing `audit-repository-fields.mjs`
 * scans Sieve filter strings inside repositories; this audit closes the consumer
 * gap — view / action / component code that reads `product.isAuction` etc. now
 * silently evaluates `undefined`.
 *
 * Fix: use `isAuctionListing(p)` / `isPreOrderListing(p)` / `normalizeListingType(p)`
 * from `@mohasinac/appkit`.
 *
 * Exits 0 clean / 1 on any unwhitelisted match.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "__tests__", "__mocks__"]);
const EXTS = [".ts", ".tsx"];

// Allow the schema file itself + the helper file that explicitly handles legacy field migration
const ALLOW = [
  "appkit/src/features/products/schemas/firestore.ts",
  "appkit/src/features/products/utils/listing-type.ts",
  // any file with a top-line `// audit-listing-type-reads-ok: <reason>` directive
];
const SUPPRESS_RE = /\/\/\s*audit-listing-type-reads-ok\b/;

// Baseline drift — keep at 0 (currently clean).

const RE = /\.(isAuction|isPreOrder|isPreorder)\b/g;

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXTS.includes(extname(entry.name))) files.push(full);
  }
  return files;
}

const violations = [];
const dirs = [
  join(APPKIT_ROOT, "src"),
  join(REPO_ROOT, "src"),
];
for (const root of dirs) {
  for (const file of walk(root)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (ALLOW.includes(rel)) continue;
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    const src = readFileSync(file, "utf8");
    if (SUPPRESS_RE.test(src)) continue;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;
      RE.lastIndex = 0;
      let m;
      while ((m = RE.exec(line)) !== null) {
        violations.push({ file: rel, line: i + 1, field: m[1], text: line.trim().slice(0, 140) });
      }
    }
  }
}

if (violations.length === 0) {
  console.log("audit-listing-type-reads: clean ✓");
  process.exit(0);
}

if (violations.length <= BASELINE) {
  console.log(`audit-listing-type-reads: ${violations.length} (baseline ${BASELINE}). No regression.`);
  process.exit(0);
}

const out = [`audit-listing-type-reads: ${violations.length} consumer read(s) of removed boolean fields .\n`];
out.push("Fix: import { isAuctionListing, isPreOrderListing, normalizeListingType } from '@mohasinac/appkit'");
out.push("       const auction = isAuctionListing(product);   // replaces product.isAuction\n");
for (const v of violations) {
  out.push(`  ${v.file}:${v.line}  .${v.field}`);
  out.push(`    ${v.text}`);
}
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
