#!/usr/bin/env node
// One-shot extractor: parses audit-listing-indices stdout, dedupes the
// emitted JSON snippets, and prints them as an array ready to merge into
// firestore.indexes.json.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEXES_PATH = join(__dirname, "..", "firebase", "base", "firestore.indexes.json");

// Run the audit. Force-show snippets by temporarily lowering BASELINE to 0.
// Capture both stdout AND stderr; the audit writes the missing-index
// snippets to stderr in the failure branch.
const auditPath = join(__dirname, "audit-listing-indices.mjs");
const original = readFileSync(auditPath, "utf8");
const patched = original.replace(/const BASELINE = \d+;/, "const BASELINE = 0;");
writeFileSync(auditPath, patched);
let out;
try {
  out = execSync(
    "node " + auditPath,
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
  ).toString();
} catch (err) {
  out = (err.stdout || "") + (err.stderr || "");
} finally {
  writeFileSync(auditPath, original);
}

// The audit emits JSON snippets indented by 6 spaces under "Add to ...":
//       {
//         "collectionGroup": "X",
//         ...
//       }
// Capture each balanced block.
const snippets = [];
const lines = out.split("\n");
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (/^\s{6}\{$/.test(line)) {
    const start = i;
    let depth = 1;
    let j = i + 1;
    while (j < lines.length && depth > 0) {
      const ch = lines[j];
      depth += (ch.match(/\{/g) || []).length;
      depth -= (ch.match(/\}/g) || []).length;
      j++;
    }
    const block = lines.slice(start, j).map((l) => l.replace(/^\s{6}/, "")).join("\n");
    try {
      const parsed = JSON.parse(block);
      snippets.push(parsed);
    } catch {
      // Skip non-JSON blocks
    }
    i = j;
  } else {
    i++;
  }
}

// Dedupe by stringified canonical form
const seen = new Set();
const unique = [];
for (const s of snippets) {
  const key = JSON.stringify(s);
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(s);
  }
}

console.log(`extracted ${snippets.length} snippets, ${unique.length} unique`);

// Load existing indexes
const existing = JSON.parse(readFileSync(INDEXES_PATH, "utf8"));

// Dedupe against existing
const existingKeys = new Set(existing.indexes.map((idx) => JSON.stringify(idx)));
const toAdd = unique.filter((idx) => !existingKeys.has(JSON.stringify(idx)));

console.log(`${toAdd.length} new indices to add (${unique.length - toAdd.length} already present)`);

// Append
existing.indexes.push(...toAdd);

// Write back with consistent 2-space formatting
writeFileSync(INDEXES_PATH, JSON.stringify(existing, null, 2) + "\n");
console.log(`wrote ${INDEXES_PATH}`);
