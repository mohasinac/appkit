#!/usr/bin/env node
/**
 * audit-route-strings.mjs — hardcoded dashboard route strings.
 *
 * Anti-pattern from CLAUDE.md: passing `"/admin/products"` / `"/store/orders"` /
 * `"/user/wishlist"` directly to `router.push`, `router.replace`, `<Link href>`,
 * `redirect`, or `permanentRedirect` instead of `ROUTES.ADMIN.PRODUCTS` etc.
 *
 * Public marketing paths (`/auctions`, `/products`, `/blog`, etc.) are NOT
 * flagged — they often appear inline as Link href and the cost of churning
 * them all is high. Dashboard segments are the higher-leverage target.
 *
 * Suppress per-line with `// audit-route-strings-ok`.
 *
 * Exits 0 clean / 1 on any match.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "__tests__"]);
const EXTS = [".ts", ".tsx"];
// route-map.ts itself is the source of truth — exclude
const EXCLUDE_FILE_SUFFIXES = [
  "appkit/src/next/routing/route-map.ts",
];
const SUPPRESS_RE = /\/\/\s*audit-route-strings-ok\b/;

// Dashboard segments where ROUTES.* must be used
const DASH_RE = /(\/(?:admin|store|user)\/[a-z0-9][a-z0-9\-\/]*)/;

// Baseline drift — currently 5. Drive to 0 by replacing literals with ROUTES.*.

const RE_NAV = /\b(?:router\.(?:push|replace|prefetch)|redirect|permanentRedirect)\s*\(\s*["'`]([^"'`]+)["'`]/g;
const RE_HREF = /\bhref\s*=\s*["'`]([^"'`]+)["'`]/g;

function walk(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXTS.includes(extname(entry.name))) files.push(full);
  }
  return files;
}

const violations = [];
for (const root of [join(APPKIT_ROOT, "src"), join(REPO_ROOT, "src")]) {
  for (const file of walk(root)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (EXCLUDE_FILE_SUFFIXES.some(s => rel.endsWith(s))) continue;
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (SUPPRESS_RE.test(line)) continue;
      if (line.trimStart().startsWith("//")) continue;
      // both nav-fn calls and href props
      for (const re of [RE_NAV, RE_HREF]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line)) !== null) {
          const path = m[1];
          if (!DASH_RE.test(path)) continue;
          // skip if route uses dynamic template like /admin/products/${id}
          if (path.includes("${")) continue;
          violations.push({ file: rel, line: i + 1, path, text: line.trim().slice(0, 140) });
        }
      }
    }
  }
}

if (violations.length === 0) {
  console.log("audit-route-strings: clean ✓");
  process.exit(0);
}

if (violations.length <= BASELINE) {
  console.log(`audit-route-strings: ${violations.length} (baseline ${BASELINE}). No regression.`);
  process.exit(0);
}

const out = [`audit-route-strings: ${violations.length} hardcoded dashboard route(s) .\n`];
out.push("Use ROUTES.{ADMIN,STORE,USER}.* from @mohasinac/appkit (appkit/src/next/routing/route-map.ts).");
out.push("Suppress with `// audit-route-strings-ok` on the same line if intentional.\n");
for (const v of violations) {
  out.push(`  ${v.file}:${v.line}  → "${v.path}"`);
  out.push(`    ${v.text}`);
}
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
