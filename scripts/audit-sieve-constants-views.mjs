#!/usr/bin/env node
/**
 * audit-sieve-constants-views.mjs — Sieve / sort string-literal usage in view files.
 *
 * The existing `scripts/audit-sieve-constants.mjs` covers `src/app/api/**` only.
 * This audit extends coverage to consumer view files and DataListingView configs
 * where the same anti-patterns hide:
 *
 *   - `buildFilters: (s) => `isActive==${s.isActive}`` should call sieveFilter() / sieveAnd().
 *   - `defaultSort: "-createdAt"` and `sortOptions: [{ value: "-price", ... }]`
 *     should call sortBy(FIELDS.X, SORT_DIR.DESC).
 *   - `filters: "isActive==true,..."` on direct `*Repository.list({...})` calls
 *     should use sieveAnd(sieveFilter(...)).
 *
 * Canonical helpers (import from @mohasinac/appkit):
 *   SIEVE_OP, sieveFilter, sieveAnd, sieveMultiEq    — appkit/src/utils/sieve-builder.ts
 *   SORT_DIR, sortBy                                  — appkit/src/constants/sort.ts
 *   PRODUCT_FIELDS, STORE_FIELDS, ...                 — appkit/src/constants/field-names.ts
 *
 * Suppress per-line with `// audit-sieve-views-ok`.
 * Suppress whole file with `// audit-sieve-views-ok: <reason>` anywhere in the file.
 *
 * Exits 0 clean / 1 on any unsuppressed violation.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "__tests__"]);
// Files defining the canonical constants themselves — skip
const EXCLUDE_SUFFIXES = [
  "appkit/src/utils/sieve-builder.ts",
  "appkit/src/utils/sieve-helpers.ts",
  "appkit/src/constants/sort.ts",
  "appkit/src/constants/field-names.ts",
  "appkit/src/constants/table-keys.ts",
  "appkit/src/constants/sieve-table.ts",
];
const SUPPRESS_FILE_RE = /\/\/\s*audit-sieve-views-ok\b/;
const SUPPRESS_LINE_RE = /\/\/\s*audit-sieve-views-ok\b/;

// Baseline drift — currently 345. Drive to 0 by migrating view files to
// sortBy()/sieveFilter()/sieveAnd() with FIELDS.* constants.
const BASELINE = 345;

// Rule patterns (apply to string-literal *values* on relevant lines)

// RAW_SORT_LITERAL — `defaultSort: "-createdAt"` or `value: "-price"` inside sortOptions
const RE_DEFAULT_SORT = /\bdefaultSort\s*:\s*(["'`])(-?[\w.]+(?:,[-?\w.]+)*)\1/;
// sortOptions-style { value: "-x" } literal that looks like a sort token (- or letter prefix)
const RE_SORT_OPT_VALUE = /\bvalue\s*:\s*(["'`])(-[\w.]+|createdAt|updatedAt|price|name|displayOrder|rating|stats\.[\w.]+)\1/;

// RAW_FILTERS_PROP — `filters: "isActive==true,..."` (string or template literal)
const RE_FILTERS_PROP = /\bfilters\s*:\s*[`"'][\w.]+\s*(?:==|!=|>=|<=|>|<|@=|_=)/;

// RAW_SORTS_PROP — `sorts: "-createdAt"` etc.
const RE_SORTS_PROP = /\bsorts\s*:\s*["'`]-?[\w.]+(?:,[-?\w.]+)*["'`]/;

// RAW_SIEVE_IN_BUILD_FILTERS — Sieve clause inside a string literal that's
// returned from a buildFilters arrow. Heuristic: line contains `==` inside a
// template/quote literal AND the file has `buildFilters:`. We catch it via
// a per-file gate plus a per-line literal check.
const RE_TEMPLATE_SIEVE = /[`"'][\w.]+\s*(==|!=|>=|<=|>|<|@=|_=)\s*\$\{/;

const SCAN_DIRS = [
  join(APPKIT_ROOT, "src", "features"),   // appkit features (DataListingView configs, repository-driven views)
  join(REPO_ROOT, "src"),                  // consumer pages + actions
];

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if ([".ts", ".tsx"].includes(extname(entry.name))) files.push(full);
  }
  return files;
}

function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith("//") || t.startsWith("*");
}

const violations = [];

for (const root of SCAN_DIRS) {
  for (const file of walk(root)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (EXCLUDE_SUFFIXES.some(s => rel.endsWith(s))) continue;
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    // skip repositories — covered by audit-repository-fields/audit-sieve-constants
    if (rel.includes("/repository/")) continue;
    // skip API routes — covered by existing audit-sieve-constants
    if (rel.includes("/api/")) continue;
    const src = readFileSync(file, "utf8");
    if (SUPPRESS_FILE_RE.test(src)) continue;
    const lines = src.split("\n");
    const fileHasBuildFilters = /\bbuildFilters\s*:/.test(src);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;
      if (SUPPRESS_LINE_RE.test(line)) continue;
      const push = (rule, text) => violations.push({ file: rel, line: i + 1, rule, text: text.trim().slice(0, 160) });

      if (RE_DEFAULT_SORT.test(line))   push("RAW_SORT_LITERAL", line);
      else if (RE_SORT_OPT_VALUE.test(line)) push("RAW_SORT_LITERAL", line);
      if (RE_FILTERS_PROP.test(line))   push("RAW_FILTERS_PROP", line);
      if (RE_SORTS_PROP.test(line))     push("RAW_SORTS_PROP", line);
      if (fileHasBuildFilters && RE_TEMPLATE_SIEVE.test(line)) {
        push("RAW_SIEVE_IN_BUILD_FILTERS", line);
      }
    }
  }
}

if (violations.length === 0) {
  console.log("audit-sieve-constants-views: clean ✓");
  process.exit(0);
}

const byRule = {};
for (const v of violations) (byRule[v.rule] ||= []).push(v);

const RULE_FIXES = {
  RAW_SORT_LITERAL: 'sortBy(PRODUCT_FIELDS.CREATED_AT, SORT_DIR.DESC)  (from @mohasinac/appkit)',
  RAW_FILTERS_PROP: 'sieveAnd(sieveFilter(FIELDS.X, SIEVE_OP.EQ, val), ...)  (from @mohasinac/appkit)',
  RAW_SORTS_PROP:   'sortBy(PRODUCT_FIELDS.X, SORT_DIR.DESC)',
  RAW_SIEVE_IN_BUILD_FILTERS:
    'sieveFilter(FIELDS.X, SIEVE_OP.EQ, state.X) — build with sieveAnd() when multiple clauses',
};

const out = [`audit-sieve-constants-views: ${violations.length} hardcoded Sieve/sort literal(s) in view/config files.\n`];
out.push("Replace string literals with the canonical helpers:");
out.push("  sortBy(FIELDS.X, SORT_DIR.DESC)            from @mohasinac/appkit");
out.push("  sieveFilter(FIELDS.X, SIEVE_OP.EQ, value)");
out.push("  sieveAnd(...) / sieveMultiEq(...)");
out.push("Suppress with `// audit-sieve-views-ok` per-line or in a file comment.\n");

for (const [rule, list] of Object.entries(byRule)) {
  out.push(`[${rule}] ${list.length} instance(s) — fix: ${RULE_FIXES[rule]}`);
  for (const v of list.slice(0, 60)) {
    out.push(`  ${v.file}:${v.line}  ${v.text}`);
  }
  if (list.length > 60) out.push(`  ... (+${list.length - 60} more)`);
  out.push("");
}

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
