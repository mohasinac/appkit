#!/usr/bin/env node
/**
 * audit-double-navigation.mjs — double router.replace anti-pattern detector.
 *
 * Detects cases where an event handler calls both table.set(key, v) AND
 * table.setPage(N) in the same expression. The second call reads stale
 * useSearchParams() output and issues a second router.replace() that silently
 * OVERWRITES the first, losing the sort/filter change.
 *
 * Root cause:
 *   useUrlTable.set() calls router.replace() immediately. useSearchParams()
 *   is reactive but does not update synchronously within the same JS tick.
 *   A subsequent table.setPage(1) therefore reads the OLD searchParams,
 *   builds a URL without the new sort/filter, and replaces the URL again —
 *   the toolbar appears to do nothing when the user changes the sort.
 *
 * Correct:   onSortChange={(v) => table.set("sort", v)}
 *   (table.set already resets page for any key not in NON_RESETTING_KEYS)
 *
 * Wrong:     onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
 *   (second call overwrites the sort change)
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

// Matches any inline callback where table.set(...) is immediately followed
// by table.setPage(...) on the same source line.
// This covers the JSX prop pattern: onXxx={(v) => { table.set(k, v); table.setPage(1); }}
const DOUBLE_NAV_INLINE_RE = /table\.set\s*\([^)]+\)\s*;\s*table\.setPage\s*\(/;

// Matches table.set(...); at end of a line (the first half of a multi-line violation)
const SET_LINE_RE = /table\.set\s*\([^)]+\)\s*;/;
// Matches table.setPage( at the start of the next non-empty line (the second half)
const SETPAGE_LINE_RE = /^\s*table\.setPage\s*\(/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(join(dir, entry.name), files);
    } else {
      const ext = extname(entry.name);
      if (ext === ".tsx" || ext === ".ts") {
        files.push(join(dir, entry.name));
      }
    }
  }
  return files;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    // Same-line pattern
    if (DOUBLE_NAV_INLINE_RE.test(lines[i])) {
      violations.push({
        file: relative(SRC_DIR, file),
        line: i + 1,
        text: lines[i].trim().slice(0, 120),
      });
      continue;
    }
    // Multi-line pattern: table.set() on line N, table.setPage() on line N+1
    if (SET_LINE_RE.test(lines[i]) && i + 1 < lines.length && SETPAGE_LINE_RE.test(lines[i + 1])) {
      violations.push({
        file: relative(SRC_DIR, file),
        line: i + 1,
        text: (lines[i].trim() + " " + lines[i + 1].trim()).slice(0, 120),
      });
    }
  }
}

if (violations.length === 0) {
  console.log("audit-double-navigation: no double-navigation anti-patterns found ✓");
  process.exit(0);
}

const out = [
  `audit-double-navigation: ${violations.length} violation(s) — table.set() followed by table.setPage() in the same handler:`,
  "",
  ...violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`),
  "",
  "Fix: remove the table.setPage(1) call.",
  "  table.set(key, v) already resets page to '1' for any key that is not",
  "  'page', 'pageSize', or 'view' (the NON_RESETTING_KEYS list).",
  "  Calling setPage(1) immediately after reads stale searchParams and",
  "  issues a second router.replace() that overwrites the first URL update.",
];

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
