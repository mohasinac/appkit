#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const ROOTS = [join(REPO_ROOT, "src"), join(REPO_ROOT, "appkit", "src")];
const SKIP_PATH_RE = /[/\\]ui[/\\](?:components|forms|rich-text)[/\\]|[/\\]ui[/\\]DataTable\.tsx$|[/\\]features[/\\]forms[/\\]|[/\\]features[/\\]email[/\\]|[/\\]_internal[/\\]server[/\\]features[/\\][^/\\]+[/\\]og(?:-layout)?\.tsx$|ErrorBoundary\.tsx$/;
const SKIP_DIRS = new Set(["node_modules", ".next", "seed", "repositories", "scripts", "__tests__", "__mocks__", "configs", "contracts", "validators"]);
const RE = /\b(?:bg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)|from-[a-z]+-\d+|to-[a-z]+-\d+|via-[a-z]+-\d+)\b/;

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (full.endsWith(".tsx") && !SKIP_PATH_RE.test(full)) yield full;
  }
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
      if (RE.test(lines[i])) {
        console.log(`${relative(REPO_ROOT, file).replace(/\\/g, "/")}:${i + 1}`);
        console.log(`  ${lines[i].trim().slice(0, 130)}`);
      }
    }
  }
}
