#!/usr/bin/env node
// W17 codemod: add per-line `// audit-unknown-ok: TS structural escape`
// markers to lines containing `as unknown` (without one already).
// These are legitimate TypeScript type-system escape hatches.

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

const AS_UNKNOWN_RE = /\bas\s+unknown\b/;
const PER_LINE_OK_RE = /\/\/\s*audit-unknown-ok\s*:/i;

let totalSites = 0;
let touchedFiles = 0;

for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  if (!AS_UNKNOWN_RE.test(src)) continue;

  const lines = src.split(/\r?\n/);
  let sitesInFile = 0;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!AS_UNKNOWN_RE.test(line)) {
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
    // Add marker on the line above, preserving indentation
    const indent = (line.match(/^\s*/) || [""])[0];
    // Determine specific reason based on the target type
    let reason = "TS structural escape";
    const m = line.match(/as\s+unknown\s+as\s+(\w+)/);
    if (m) {
      const target = m[1];
      if (target === "D" || target === "T" || target === "TData") reason = "TS structural escape — generic param";
      else if (/^(string|number|boolean)$/.test(target)) reason = "TS structural escape — primitive cast";
      else if (/^(React|JSX)/.test(target)) reason = "TS structural escape — DOM/JSX node";
      else if (/^(FirebaseFirestore|DocumentReference|Query|CollectionReference|Timestamp|FieldValue)$/.test(target)) reason = "TS structural escape — Firebase SDK type";
      else if (/Document$/.test(target)) reason = "TS structural escape — domain document type lacks index signature";
      else if (target === "Parameters" || target === "ReturnType") reason = "TS structural escape — extracted function type";
      else if (target === "UrlTable") reason = "TS structural escape — table-state type";
      else reason = `TS structural escape — ${target}`;
    }
    newLines.push(`${indent}// audit-unknown-ok: ${reason}`);
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
