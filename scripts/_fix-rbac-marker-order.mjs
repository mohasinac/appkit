#!/usr/bin/env node
/**
 * Swap rbac markers and audit-route-schema-ok markers when they appear
 * in the wrong order above a verb export. The audit-route-rbac script
 * only inspects the FIRST non-empty line above the export; if that line
 * is `// audit-route-schema-ok:` (and the `// rbac-*:` marker is on the
 * line above that), the rbac marker is invisible to the audit.
 *
 * This codemod walks every `src/app/api/**\/route.ts`, finds the pattern
 *
 *   // rbac-(public|scope-enforced-in-handler): ...
 *   // audit-route-schema-ok: ...
 *   export (async function|const) VERB
 *
 * and swaps the two comment lines so the rbac marker sits immediately
 * above the export. Pure ordering change — no semantic shift.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const API_ROOT = join(REPO_ROOT, "src", "app", "api");
const APPLY = process.argv.includes("--apply");
const VERB_RE = /^\s*export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE)\b/;
const RBAC_RE = /^\s*\/\/\s*rbac-(?:public|scope-enforced-in-handler):/;
const SCHEMA_RE = /^\s*\/\/\s*audit-route-schema-ok:/;

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "__tests__") continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && (e.name === "route.ts" || e.name === "route.tsx")) yield full;
  }
}

let fixed = 0;
for (const file of walk(API_ROOT)) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  let changed = false;
  for (let i = 2; i < lines.length; i++) {
    if (!VERB_RE.test(lines[i])) continue;
    // i-1 should be the line immediately above the export; i-2 the line above that.
    if (SCHEMA_RE.test(lines[i - 1]) && RBAC_RE.test(lines[i - 2])) {
      // Swap so rbac is the LAST non-empty line above the export.
      const tmp = lines[i - 1];
      lines[i - 1] = lines[i - 2];
      lines[i - 2] = tmp;
      changed = true;
      fixed++;
    }
  }
  if (changed && APPLY) writeFileSync(file, lines.join("\n"));
}

console.log(`${APPLY ? "Swapped" : "Would swap"} ${fixed} marker pairs.`);
