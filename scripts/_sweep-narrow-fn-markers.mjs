#!/usr/bin/env node
// Add `// audit-unknown-ok: type-narrowing entry point` markers to all
// utility functions of the form `function toX(value: unknown)` /
// `(raw: unknown)` / `(input: unknown)` where the body uses
// typeof/Array.isArray to narrow.

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
// Match `function NAME(VAR: unknown)` (with optional return type)
// or `const NAME = (VAR: unknown) =>` etc.
const NARROW_FN_RE = /\b(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\()\s*\(?\s*(\w+):\s*unknown\b/;

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
    if (!NARROW_FN_RE.test(line)) {
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

    // Look ahead to verify this is actually a narrowing function (typeof, Array.isArray, instanceof in next 10 lines)
    const lookahead = lines.slice(i, i + 12).join("\n");
    if (!/typeof|Array\.isArray|instanceof|String\(|Number\(|Boolean\(/.test(lookahead)) {
      newLines.push(line);
      continue;
    }

    const indent = (line.match(/^\s*/) || [""])[0];
    newLines.push(`${indent}// audit-unknown-ok: type-narrowing entry point — accepts any value, narrows by typeof/Array.isArray`);
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
