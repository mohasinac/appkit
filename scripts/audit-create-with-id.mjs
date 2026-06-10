#!/usr/bin/env node
/**
 * audit-create-with-id.mjs — PII-encrypting repos must override `createWithId`.
 *
 * Root Cause #9: `createWithId` is a BaseRepository entry point that bypasses
 * the subclass write hooks (encryptOnWrite / etc.). If a repo handles PII via
 * encryptPii / blindIndex / encryptUserData but does NOT override createWithId,
 * any caller that hits createWithId writes plaintext PII to Firestore.
 *
 * Rule:
 *   IF file contains one of [encryptPii, blindIndex, encryptUserData,
 *                            encryptOnWrite, hmacBlindIndex]
 *   AND file is a repository (path includes /repository/)
 *   THEN file must define `createWithId(`.
 *
 * Suppress per-file with: `// audit-create-with-id-ok: <reason>` on any line.
 *
 * Exits 0 clean / 1 on any violation.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "__tests__"]);
const PII_MARKERS = [
  /\bencryptPii\b/,
  /\bblindIndex\b/,
  /\bencryptUserData\b/,
  /\bencryptOnWrite\b/,
  /\bhmacBlindIndex\b/,
];
const SUPPRESS_RE = /\/\/\s*audit-create-with-id-ok\b/;
const HAS_OVERRIDE_RE = /\b(?:async\s+)?createWithId\s*[(<]/;

// Baseline drift — keep at 0 (currently clean).

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (extname(entry.name) === ".ts") files.push(full);
  }
  return files;
}

const violations = [];

for (const file of walk(join(APPKIT_ROOT, "src", "features"))) {
  const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
  if (!rel.includes("/repository/")) continue;
  if (rel.endsWith(".test.ts")) continue;
  const src = readFileSync(file, "utf8");
  if (SUPPRESS_RE.test(src)) continue;
  const hasPii = PII_MARKERS.some(re => re.test(src));
  if (!hasPii) continue;
  if (HAS_OVERRIDE_RE.test(src)) continue;
  violations.push(rel);
}

if (violations.length === 0) {
  console.log("audit-create-with-id: clean ✓");
  process.exit(0);
}

if (violations.length <= BASELINE) {
  console.log(`audit-create-with-id: ${violations.length} (baseline ${BASELINE}). No regression.`);
  process.exit(0);
}

const out = [`audit-create-with-id: ${violations.length} PII repo(s) missing createWithId override .\n`];
out.push("Each repo handles PII (encryptPii / blindIndex / encryptUserData) but does NOT");
out.push("override createWithId — direct callers will bypass encryption and write plaintext.");
out.push("Fix: add `async createWithId(id, data, ...): ...` that applies the same encrypt step");
out.push("     as the create() override before delegating to super.createWithId().\n");
for (const v of violations) out.push(`  ${v}`);
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
