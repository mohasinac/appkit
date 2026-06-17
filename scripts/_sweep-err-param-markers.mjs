#!/usr/bin/env node
// Add `// audit-unknown-ok: error-handler entry point` markers to
// `(err: unknown)` and `(error: unknown)` callback params.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const EXCLUDED = new Set(["node_modules", "dist", "__tests__", "__mocks__"]);

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

const PER_LINE_OK_RE = /\/\/\s*audit-unknown-ok\s*:/i;
const ERR_PARAM_RE = /\b(?:err|error|reason|cause|thrown|caught)\s*:\s*unknown\b/;

let totalSites = 0;
let touchedFiles = 0;

for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  if (!/\bunknown\b/.test(src)) continue;

  const lines = src.split(/\r?\n/);
  let sitesInFile = 0;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!ERR_PARAM_RE.test(line)) {
      newLines.push(line);
      continue;
    }
    if (PER_LINE_OK_RE.test(line)) {
      newLines.push(line);
      continue;
    }
    if (i > 0 && PER_LINE_OK_RE.test(lines[i - 1])) {
      newLines.push(line);
      continue;
    }
    const indent = (line.match(/^\s*/) || [""])[0];
    newLines.push(`${indent}// audit-unknown-ok: error-handler entry point — accepts thrown values of any shape`);
    newLines.push(line);
    sitesInFile++;
  }

  if (sitesInFile === 0) continue;
  writeFileSync(file, newLines.join("\n"));
  touchedFiles++;
  totalSites += sitesInFile;
  console.log(`${file}: +${sitesInFile} markers`);
}

console.log(`\nTotal: ${touchedFiles} files, +${totalSites} markers`);
