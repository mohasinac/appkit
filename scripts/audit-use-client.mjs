#!/usr/bin/env node
/**
 * audit-use-client.mjs — missing "use client" detector.
 *
 * Scans appkit/src for files that import client-only APIs (React state hooks,
 * next-intl's useTranslations, next/navigation hooks) but are missing the
 * "use client" directive.
 *
 * Root cause this prevents:
 *   Components that use useTranslations / useState / useRouter without
 *   "use client" are treated as Server Components by Next.js/React. When the
 *   server render fails, React attempts a client-side recovery render where
 *   NextIntlClientProvider context is absent → "context not found" crash.
 *
 * Rule: any file that IMPORTS a client-only hook must have "use client" as
 * its first non-comment, non-blank line.
 *
 * Exits 0 on clean, 1 on violations (non-blocking outside the stop hook),
 * 2 when called from the stop hook (blocking).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

// Client-only named imports keyed by package.
// If a file imports ANY of these names from the listed package it MUST have "use client".
const CLIENT_HOOK_IMPORTS = {
  "next-intl": [
    "useTranslations",
    "useFormatter",
    "useLocale",
    "useNow",
    "useTimeZone",
    "useMessages",
  ],
  "next/navigation": [
    "useRouter",
    "useSearchParams",
    "usePathname",
    "useParams",
    "useSelectedLayoutSegment",
    "useSelectedLayoutSegments",
  ],
  "react": [
    "useState",
    "useEffect",
    "useCallback",
    "useMemo",
    "useRef",
    "useReducer",
    "useContext",
    "useId",
    "useLayoutEffect",
    "useImperativeHandle",
    "useDebugValue",
    "useDeferredValue",
    "useTransition",
    "useOptimistic",
    "useActionState",
  ],
};

// Build a flat map: hookName → package (for fast lookup)
const hookToPackage = new Map();
for (const [pkg, hooks] of Object.entries(CLIENT_HOOK_IMPORTS)) {
  for (const hook of hooks) hookToPackage.set(hook, pkg);
}

// Directories / patterns to skip entirely (these are not React component files).
const SKIP_DIRS = new Set([
  "configs",
  "seed",
  "validators",
  "contracts",
  "repositories",
  "scripts",
  "__tests__",
  "__mocks__",
]);

// File name patterns to skip.
const SKIP_FILE_RE = /\.(d\.ts|test\.ts|test\.tsx|spec\.ts|spec\.tsx)$/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), files);
    } else {
      const ext = extname(entry.name);
      if ((ext === ".ts" || ext === ".tsx") && !SKIP_FILE_RE.test(entry.name)) {
        files.push(join(dir, entry.name));
      }
    }
  }
  return files;
}

/** Returns true if "use client" is the first non-comment, non-blank line. */
function hasUseClient(content) {
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    // Skip block-comment lines and single-line comments at the very top.
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;
    // Accept with or without trailing semicolon: "use client" | "use client";
    return /^["']use client["'];?$/.test(line);
  }
  return false;
}

/**
 * Returns the client hooks imported (if any) and which packages they come from.
 * We parse import statements literally rather than using AST for speed.
 */
function findClientImports(content) {
  const found = [];
  // Match: import { ... } from "pkg"  or  import { ... } from 'pkg'
  const importRE = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRE.exec(content)) !== null) {
    const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
    const pkg = m[2];
    for (const name of names) {
      if (hookToPackage.get(name) === pkg) {
        found.push({ hook: name, pkg });
      }
    }
  }
  return found;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  const content = readFileSync(file, "utf8");
  if (hasUseClient(content)) continue; // already correctly marked
  const clientImports = findClientImports(content);
  if (clientImports.length > 0) {
    violations.push({
      file: relative(SRC_DIR, file),
      hooks: clientImports.map((i) => `${i.hook} (from "${i.pkg}")`),
    });
  }
}

if (violations.length === 0) {
  console.log('audit-use-client: all client-hook files have "use client" ✓');
  process.exit(0);
}

const lines = [
  `audit-use-client: ${violations.length} file(s) import client-only hooks but are missing "use client":`,
  "",
  ...violations.flatMap((v) => [
    `  ${v.file}`,
    `    hooks: ${v.hooks.join(", ")}`,
  ]),
  "",
  'Fix: add   "use client";   as the very first line of each file above.',
  "Why: without it Next.js treats the file as a Server Component. If the server",
  "render fails, React recovers on the client but without NextIntlClientProvider",
  'context → "context not found" crash for useTranslations and friends.',
];

process.stderr.write(lines.join("\n") + "\n");
process.exit(1);
