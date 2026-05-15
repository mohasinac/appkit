#!/usr/bin/env node
/**
 * audit-query-provider — detects components that both provide QueryClientProvider
 * AND call react-query hooks in the same file.
 *
 * Anti-pattern: React hooks run in the function body before the return statement.
 * A component that renders <QueryClientProvider> in its return JSX but also calls
 * useQuery/useSiteSettings/etc. in its own body has no provider in its ancestor
 * tree — the hooks fail with "No QueryClient set". This was the root cause of the
 * 2026-05-16 prod outage (AppLayoutShell.useSiteSettings + its own QueryClientProvider).
 *
 * Rule: if a file imports QueryClientProvider, it must NOT also call any of the
 * known react-query consumer hooks in the same file.
 *
 * Exit 0 — no violations.
 * Exit 1 — violations found (blocks in check-on-stop).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SCAN_DIRS = [join(ROOT, "src"), join(ROOT, "../src")];

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "scripts", "__tests__", "__mocks__"]);
const SKIP_FILE_RE = /\.(d\.ts|test\.tsx?|spec\.tsx?)$/;

// Hooks that require a QueryClientProvider ancestor.
// Each entry is a string prefix — matches both `hook(` and `hook<T>(` forms.
const CONSUMER_HOOKS = [
  "useQuery(",
  "useQuery<",
  "useQueryClient(",
  "useMutation(",
  "useMutation<",
  "useInfiniteQuery(",
  "useInfiniteQuery<",
  "useSiteSettings(",
  "useSiteSettings<",
  "useSuspenseQuery(",
  "useSuspenseQuery<",
];

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      const ext = extname(entry.name);
      if ((ext === ".ts" || ext === ".tsx") && !SKIP_FILE_RE.test(entry.name)) {
        files.push(full);
      }
    }
  }
  return files;
}

const files = SCAN_DIRS.flatMap((d) => walk(d));
const violations = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");

  // Must import QueryClientProvider to be in scope as a provider
  if (!src.includes("QueryClientProvider")) continue;

  const hitHooks = CONSUMER_HOOKS.filter((h) => src.includes(h));
  if (hitHooks.length === 0) continue;

  violations.push({ file: relative(ROOT, file), hooks: hitHooks });
}

if (violations.length === 0) {
  console.log("audit-query-provider: no provider+consumer conflicts ✓");
  process.exit(0);
}

console.error("audit-query-provider: FAIL — component(s) both provide QueryClientProvider and call react-query hooks:");
for (const v of violations) {
  console.error(`  ${v.file}`);
  for (const h of v.hooks) {
    console.error(`    calls: ${h.replace("(", "")}`);
  }
}
console.error("");
console.error("Fix: extract the hook call into a child component rendered INSIDE the <QueryClientProvider> return.");
process.exit(1);
