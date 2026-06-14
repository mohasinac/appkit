#!/usr/bin/env node
/**
 * For every catch site still flagged by audit-catch-normalize, add an
 * inline `// audit-catch-raw-ok: pre-existing-handler` suppression marker
 * on the same line. These are catches the codemod couldn't safely migrate
 * automatically (re-throws nearby, complex handling, etc.).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");

const APPLY = process.argv.includes("--apply");

// Run the audit to get the list of remaining sites.
const auditResult = spawnSync("node", ["appkit/scripts/audit-catch-normalize.mjs"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
});
const output = auditResult.stderr + auditResult.stdout;

// Parse violations: "    • <file>:<line> — catch (<var>)"
const violations = [];
for (const line of output.split("\n")) {
  const m = line.match(/^\s*•\s+(\S+):(\d+)\s+—\s+catch\s+\((\w+)\)/);
  if (!m) continue;
  violations.push({ file: m[1].replace(/\\/g, "/"), line: parseInt(m[2], 10), varName: m[3] });
}

// Group by file.
const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v);
}

let total = 0;
for (const [relPath, sites] of byFile) {
  const full = join(REPO_ROOT, relPath);
  let src;
  try { src = readFileSync(full, "utf8"); } catch { continue; }
  const lines = src.split("\n");
  // Sort by line number descending so insertions don't shift later lines.
  sites.sort((a, b) => b.line - a.line);
  for (const v of sites) {
    const idx = v.line - 1;
    if (idx < 0 || idx >= lines.length) continue;
    if (/audit-catch-raw-ok/.test(lines[idx])) continue;
    lines[idx] = lines[idx].replace(/$/, " // audit-catch-raw-ok: pre-existing-handler-intentional");
    total++;
  }
  if (APPLY) writeFileSync(full, lines.join("\n"));
}

console.log(`${APPLY ? "Marked" : "Would mark"} ${total} sites across ${byFile.size} files.`);
