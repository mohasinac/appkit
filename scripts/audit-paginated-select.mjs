#!/usr/bin/env node
/**
 * audit-paginated-select.mjs — >5-option Selects must use PaginatedSelect.
 *
 * CLAUDE.md UI Primitive Rules: any selection input with MORE THAN 5 options
 * MUST use <PaginatedSelect>. A long native <select> (or static options array)
 * is unreadable. PaginatedSelect handles search, virtualization, and inline
 * create flows.
 *
 * Heuristic — flag these literal patterns inside `*.tsx` files:
 *   1) <Select>...<option>...<option>...</Select>   with >5 <option> children
 *   2) <Select options={[ {...}, {...}, ... ]}>     with >5 entries
 *      (same for <FieldSelect>; native <select> NOT flagged — JSX layer only)
 *
 * Dynamic-length arrays (options={someVar}) are NOT flagged.
 *
 * Suppress per-line with `// audit-paginated-select-ok`.
 *
 * Exits 0 clean / 1 on any flagged inline >5-option case.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "__tests__"]);
const SUPPRESS_RE = /\/\/\s*audit-paginated-select-ok\b/;

// Baseline drift — keep at 0 (currently clean).

// JSX element opener (<Select ...>) capturing tag + props blob
const RE_OPEN = /<(Select|FieldSelect)\b([^>]*?)>/g;
// <option> count helper
const RE_OPTION = /<option\b/g;
// options={[ ... ]} array literal extractor
const RE_OPTIONS_ARRAY = /\boptions\s*=\s*\{\s*\[([\s\S]*?)\]\s*\}/;

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (extname(entry.name) === ".tsx") files.push(full);
  }
  return files;
}

function countTopLevelEntries(arrayInner) {
  // Cheap: count "{" or "[" at top level (depth 0 of brackets)
  let depth = 0, count = 0, started = false;
  for (let i = 0; i < arrayInner.length; i++) {
    const ch = arrayInner[i];
    if (ch === "{" || ch === "[" || ch === "(") {
      if (depth === 0 && (ch === "{" || ch === "[")) { count++; started = true; }
      depth++;
    } else if (ch === "}" || ch === "]" || ch === ")") {
      depth--;
    }
  }
  if (!started) {
    // maybe primitive entries — count commas+1
    const stripped = arrayInner.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!stripped) return 0;
    return stripped.split(",").map(s => s.trim()).filter(Boolean).length;
  }
  return count;
}

function lineOf(src, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (src[i] === "\n") n++;
  return n;
}

function findElementInner(src, openMatchEnd) {
  // returns inner text between > and the matching close tag, or null
  const close = src.indexOf("</Select>", openMatchEnd);
  const close2 = src.indexOf("</FieldSelect>", openMatchEnd);
  const next = close === -1 ? close2 : (close2 === -1 ? close : Math.min(close, close2));
  if (next === -1) return null;
  return src.slice(openMatchEnd, next);
}

const violations = [];
for (const root of [join(APPKIT_ROOT, "src"), join(REPO_ROOT, "src")]) {
  for (const file of walk(root)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (rel.endsWith(".test.tsx")) continue;
    if (rel.endsWith("PaginatedSelect.tsx") || rel.endsWith("Select.tsx") || rel.endsWith("FieldSelect.tsx")) continue;
    const src = readFileSync(file, "utf8");
    if (!/<(?:Select|FieldSelect)\b/.test(src)) continue;
    RE_OPEN.lastIndex = 0;
    let m;
    while ((m = RE_OPEN.exec(src)) !== null) {
      const tag = m[1];
      const props = m[2] || "";
      const openEnd = m.index + m[0].length;
      const lineNum = lineOf(src, m.index);
      const lineText = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index));
      if (SUPPRESS_RE.test(lineText)) continue;
      // 1) inline options={[ ... ]}
      const arr = props.match(RE_OPTIONS_ARRAY);
      if (arr) {
        const count = countTopLevelEntries(arr[1]);
        if (count > 5) {
          violations.push({ file: rel, line: lineNum, kind: "OPTIONS_ARRAY", count, tag });
        }
        continue;
      }
      // 2) <option> children
      const inner = findElementInner(src, openEnd);
      if (inner) {
        const optCount = (inner.match(RE_OPTION) || []).length;
        if (optCount > 5) {
          violations.push({ file: rel, line: lineNum, kind: "OPTION_CHILDREN", count: optCount, tag });
        }
      }
    }
  }
}

if (violations.length === 0) {
  console.log("audit-paginated-select: clean ✓");
  process.exit(0);
}

if (violations.length <= BASELINE) {
  console.log(`audit-paginated-select: ${violations.length} (baseline ${BASELINE}). No regression.`);
  process.exit(0);
}

const out = [`audit-paginated-select: ${violations.length} <Select> with >5 inline options .\n`];
out.push("Replace with <PaginatedSelect from '@mohasinac/appkit'> — handles search, virtualization,");
out.push("and optional inline-create flow. See CLAUDE.md → UI Primitive Rules.\n");
for (const v of violations) {
  out.push(`  ${v.file}:${v.line}  <${v.tag}> with ${v.count} ${v.kind === "OPTIONS_ARRAY" ? "options array entries" : "<option> children"}`);
}
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
