#!/usr/bin/env node
/**
 * audit-action-confirmation.mjs — danger ActionDefs must have confirmation.
 *
 * CLAUDE.md Rule #7: every action with `kind: "danger"` or `destructive: true`
 * MUST have a `confirmation` config in action-registry.ts. Missing confirmation
 * = immediate irreversible execution with no user warning.
 *
 * Strategy: walk every ActionDef block in action-registry.ts, parse kind /
 * destructive / confirmation presence, fail if a danger/destructive action
 * has no confirmation.
 *
 * Each ActionDef is detected as a `{ ... }` block whose body contains a
 * top-level `id:` field. Block boundary detected by brace balancing.
 *
 * Exits 0 clean / 1 on any danger action missing confirmation.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REGISTRY = join(APPKIT_ROOT, "src", "_internal", "shared", "actions", "action-registry.ts");

// Baseline drift — currently 1 (admin.cancel-entry). Drive to 0 by adding a
// confirmation block to that ActionDef in action-registry.ts.
const BASELINE = 0;

const src = readFileSync(REGISTRY, "utf8");

// Find each ActionDef block by scanning for `id: "..."` and then bracket-walking
// outward to find the enclosing `{...}`.
const violations = [];
const RE_ID = /\bid\s*:\s*["']([^"']+)["']/g;

function findEnclosingBlock(text, idIdx) {
  let depth = 0, start = -1;
  for (let i = idIdx; i >= 0; i--) {
    const ch = text[i];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) { start = i; break; }
      depth--;
    }
  }
  if (start === -1) return null;
  depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") n++;
  return n;
}

const seenBlocks = new Set();
let m;
while ((m = RE_ID.exec(src)) !== null) {
  const block = findEnclosingBlock(src, m.index);
  if (!block) continue;
  // De-dupe: same block may have id seen via nested object — use block start char-index
  const blockStart = src.indexOf(block);
  if (seenBlocks.has(blockStart)) continue;
  seenBlocks.add(blockStart);
  // Only treat this as an ActionDef if it has kind: AND (label: OR description:) — heuristic
  if (!/\bkind\s*:/.test(block)) continue;
  if (!/\blabel\s*:/.test(block)) continue;
  const isDanger = /\bkind\s*:\s*["']danger["']/.test(block) || /\bdestructive\s*:\s*true/.test(block);
  if (!isDanger) continue;
  const hasConfirmation = /\bconfirmation\s*:\s*\{/.test(block);
  if (hasConfirmation) continue;
  violations.push({
    id: m[1],
    line: lineOf(src, blockStart),
  });
}

if (violations.length === 0) {
  console.log("audit-action-confirmation: clean ✓");
  process.exit(0);
}

if (violations.length <= BASELINE) {
  console.log(`audit-action-confirmation: ${violations.length} (baseline ${BASELINE}). No regression.`);
  process.exit(0);
}

const out = [`audit-action-confirmation: ${violations.length} danger ActionDef(s) without confirmation (baseline ${BASELINE} — regression of ${violations.length - BASELINE}).\n`];
out.push("Each action below has kind:'danger' or destructive:true but no `confirmation` config.");
out.push("Missing confirmation = immediate destructive execution with no user warning.\n");
out.push("Fix: add a confirmation block to the ActionDef in action-registry.ts:");
out.push("     confirmation: {");
out.push("       title: 'Delete X?',");
out.push("       body: 'This cannot be undone.',");
out.push("       confirmLabel: 'Delete',");
out.push("       confirmKind: 'danger',");
out.push("     },\n");
for (const v of violations) {
  out.push(`  action-registry.ts:${v.line}  id="${v.id}"`);
}
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
