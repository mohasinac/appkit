#!/usr/bin/env node
/**
 * THE AUDIT THAT AUDITS THE AUDITS.
 *
 * ## 🛑 Why this exists
 *
 * Owner, 2026-11-11: *"refactor them to support any subdomain or such in the
 * future and we do proper checks"*.
 *
 * Measured that day: all 30 `audit-*.mjs` scripts resolved their own scan root
 * as `join(__dirname, "..", "src")` — **appkit only**. Not one scanned a
 * subdomain app, so 271 source files across `auth`, `blogs`, `bookkeeping`,
 * `events` and `media` were unaudited by every rule in the suite. The blind
 * spot was invisible precisely because each script looked correct on its own.
 *
 * Fixing thirty call sites fixes today. This stops it coming back: a script
 * that resolves its own root, instead of asking `audit-roots.mjs`, is a
 * finding. So audit number thirty-one inherits full coverage by default, and
 * opting out has to be deliberate and annotated.
 *
 * ## The rule
 *
 * An `audit-*.mjs` must either
 *   - import from `./lib/audit-roots.mjs` (or the harness, which re-exports
 *     it), **or**
 *   - carry `// audit-scope-ok: <reason>` saying why it is genuinely
 *     appkit-only.
 *
 * ⚠ The escape hatch is a COMMENT WITH A REASON, not a config list. A reason
 * at the line is read by whoever next touches the file; an allowlist in
 * another file is not.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { auditRoots, REPO_ROOT } from "./lib/audit-roots.mjs";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));

/** Resolving your own root — the pattern that caused the blind spot. */
const SELF_ROOT_PATTERNS = [
  /join\(\s*__dirname\s*,\s*["']\.\.["']\s*,\s*["']src["']\s*\)/,
  /join\(\s*ROOT\s*,\s*["']src["']\s*\)/,
  /join\(\s*APPKIT\s*,\s*["']src["']\s*\)/,
  /new URL\(\s*["']\.\.\/src/,
];

const USES_SHARED = /from\s+["']\.\/lib\/audit-(roots|harness)\.mjs["']/;
const OPT_OUT = /audit-scope-ok:\s*\S/;

const findings = [];
let checked = 0;

for (const name of readdirSync(SCRIPTS_DIR)) {
  if (!/^audit-.*\.mjs$/.test(name)) continue;
  if (name === "audit-coverage.mjs") continue; // this file
  const full = join(SCRIPTS_DIR, name);
  let src;
  try {
    src = readFileSync(full, "utf8");
  } catch {
    continue;
  }
  checked++;

  if (USES_SHARED.test(src)) continue; // covered
  if (OPT_OUT.test(src)) continue; // deliberately appkit-only, with a reason

  const selfRooted = SELF_ROOT_PATTERNS.find((re) => re.test(src));
  findings.push({
    file: relative(REPO_ROOT, full).replace(/\\/g, "/"),
    reason: selfRooted
      ? "resolves its own scan root — the subdomain apps are invisible to it"
      : "does not use lib/audit-roots.mjs and carries no `audit-scope-ok:` reason",
  });
}

const roots = auditRoots().map((r) => r.name);

console.log("\n  audit: coverage — do the audits look at every subdomain?");
console.log(`  roots available: ${roots.join(", ")}`);
console.log(`  audit scripts checked: ${checked}`);

for (const f of findings) {
  console.log(`  • ${f.file} — ${f.reason}`);
}

console.log(`\n  uncovered: ${findings.length} of ${checked}`);

if (findings.length > 0) {
  console.log(
    "\n  Fix: import { auditRoots } from \"./lib/audit-roots.mjs\" and scan\n" +
      "  every root it returns — or add `// audit-scope-ok: <reason>` if the\n" +
      "  rule genuinely only applies to appkit's own source.\n",
  );
  process.exit(1);
}
console.log("\n  every audit covers every root.\n");
