#!/usr/bin/env node
// Codemod: convert RAW_FILTERS_PROP and RAW_SIEVE_IN_BUILD_FILTERS to sieveFilter/sieveAnd helpers.
//
// Handles:
//   filters: "x==y"                     → filters: sieveFilter("x", SIEVE_OP.EQ, "y")
//   filters: "x==y,a==b"                → filters: sieveAnd(sieveFilter("x", SIEVE_OP.EQ, "y"), sieveFilter("a", SIEVE_OP.EQ, "b"))
//   `field==${var}`                     → sieveFilter("field", SIEVE_OP.EQ, var)
//   `field==value,other==${var}`        → sieveAnd(sieveFilter("field", SIEVE_OP.EQ, "value"), sieveFilter("other", SIEVE_OP.EQ, var))
//
// Inserts `import { sieveFilter, sieveAnd, SIEVE_OP } from "@mohasinac/appkit"` if needed.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "__tests__", "scripts"]);

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if ([".ts", ".tsx"].includes(extname(e.name))) files.push(full);
  }
  return files;
}

const SCAN_DIRS = [
  join(APPKIT_ROOT, "src", "features"),
  join(REPO_ROOT, "src"),
];

const OP_MAP = {
  "==": "SIEVE_OP.EQ",
  "!=": "SIEVE_OP.NEQ",
  ">=": "SIEVE_OP.GTE",
  "<=": "SIEVE_OP.LTE",
  ">":  "SIEVE_OP.GT",
  "<":  "SIEVE_OP.LT",
  "@=": "SIEVE_OP.CONTAINS",
};

// Parse one clause like `field==value` from a literal string segment.
// Returns { field, op, value, valueIsLiteral } or null.
function parseClause(text) {
  const m = text.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<|@=)\s*(.*)$/);
  if (!m) return null;
  return { field: m[1], op: m[2], value: m[3], valueIsLiteral: true };
}

// Convert a static-only literal string like "a==b,c==d" to sieveFilter / sieveAnd.
function staticLiteralToCalls(literal) {
  const clauses = literal.split(",").map((c) => c.trim()).filter(Boolean);
  const parsed = clauses.map(parseClause);
  if (parsed.some((p) => !p || !OP_MAP[p.op])) return null;
  const calls = parsed.map(
    (p) => `sieveFilter("${p.field}", ${OP_MAP[p.op]}, "${p.value}")`
  );
  if (calls.length === 1) return calls[0];
  return `sieveAnd(${calls.join(", ")})`;
}

// Convert a template-literal body like "field==value,other==${var}" to a call expression.
// Returns the expression string or null on unsupported pattern.
function templateLiteralToCalls(body) {
  // Split on commas at the top level (templates here don't have nested commas).
  const segments = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{" || ch === "(") depth++;
    if (ch === "}" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      segments.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) segments.push(current);

  const calls = [];
  for (const segRaw of segments) {
    const seg = segRaw.trim();
    // Try `field==${var}` (single interpolation at the end)
    const m1 = seg.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<|@=)\s*\$\{([^}]+)\}$/);
    if (m1) {
      const [, field, op, expr] = m1;
      if (!OP_MAP[op]) return null;
      calls.push(`sieveFilter("${field}", ${OP_MAP[op]}, ${expr.trim()})`);
      continue;
    }
    // Try `field==literal` (no interpolation)
    const m2 = seg.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<|@=)\s*([^${}]+)$/);
    if (m2) {
      const [, field, op, value] = m2;
      if (!OP_MAP[op]) return null;
      calls.push(`sieveFilter("${field}", ${OP_MAP[op]}, "${value.trim()}")`);
      continue;
    }
    // Try template with leading/trailing interpolation (e.g. `${prefix}field==value`) — skip
    return null;
  }
  if (calls.length === 0) return null;
  if (calls.length === 1) return calls[0];
  return `sieveAnd(${calls.join(", ")})`;
}

let totalChanged = 0;
let totalSubs = 0;
const filesChanged = [];

for (const root of SCAN_DIRS) {
  for (const file of walk(root)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (rel.includes("/repository/")) continue;
    if (rel.includes("/api/")) continue;
    if (rel.includes("/constants/sort.ts")) continue;
    if (rel.includes("/utils/sieve-builder.ts")) continue;
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    if (/\/\/\s*audit-sieve-views-ok/.test(src)) continue;

    let subs = 0;
    let modified = src;

    // 1. Static `filters: "x==y,z==w"` literals
    modified = modified.replace(
      /(\bfilters\s*:\s*)(["'])([\w.]+\s*(?:==|!=|>=|<=|>|<|@=)\s*[^"']+?)\2/g,
      (m, prefix, q, body) => {
        const replacement = staticLiteralToCalls(body);
        if (!replacement) return m;
        subs++;
        return `${prefix}${replacement}`;
      }
    );

    // 2. Template-literal filters: `\`x==y,a==${state.a}\``
    modified = modified.replace(
      /`([\w.]+\s*(?:==|!=|>=|<=|>|<|@=)[^`]+)`/g,
      (m, body) => {
        // Only when body looks like a sieve filter expression (contains a sieve operator)
        const replacement = templateLiteralToCalls(body);
        if (!replacement) return m;
        subs++;
        return replacement;
      }
    );

    if (subs === 0) continue;

    // Add imports if any new helper appears in the file
    const needsSieveFilter = /\bsieveFilter\b\s*\(/.test(modified) && !/\bsieveFilter\b[^(]*from/.test(src.split("\n").slice(0, 60).join("\n"));
    const needsSieveAnd = /\bsieveAnd\b\s*\(/.test(modified) && !/\bsieveAnd\b[^(]*from/.test(src.split("\n").slice(0, 60).join("\n"));
    const needsSieveOp = /\bSIEVE_OP\./.test(modified) && !/SIEVE_OP[^(]*from/.test(src.split("\n").slice(0, 60).join("\n"));

    if (needsSieveFilter || needsSieveAnd || needsSieveOp) {
      const names = [];
      if (needsSieveFilter) names.push("sieveFilter");
      if (needsSieveAnd) names.push("sieveAnd");
      if (needsSieveOp) names.push("SIEVE_OP");
      const importLine = `import { ${names.join(", ")} } from "@mohasinac/appkit";`;
      const lines = modified.split("\n");
      const idx = lines.findIndex((l) => /^import\s/.test(l));
      if (idx === -1) modified = `${importLine}\n${modified}`;
      else { lines.splice(idx, 0, importLine); modified = lines.join("\n"); }
    }

    writeFileSync(file, modified);
    totalChanged++;
    totalSubs += subs;
    filesChanged.push(`${rel} (${subs})`);
  }
}

console.log(`Files changed: ${totalChanged}`);
console.log(`Total substitutions: ${totalSubs}`);
for (const f of filesChanged.slice(0, 30)) console.log(`  ${f}`);
if (filesChanged.length > 30) console.log(`  ... and ${filesChanged.length - 30} more`);
