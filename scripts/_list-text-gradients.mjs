#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const ROOTS = [join(REPO_ROOT, "src"), join(REPO_ROOT, "appkit", "src")];
const SKIP_PATH_RE = /[/\\]ui[/\\](?:components|forms|rich-text)[/\\]|[/\\]ui[/\\]DataTable\.tsx$|[/\\]features[/\\]forms[/\\]|[/\\]features[/\\]email[/\\]|[/\\]_internal[/\\]server[/\\]features[/\\][^/\\]+[/\\]og(?:-layout)?\.tsx$|ErrorBoundary\.tsx$/;

function* walk(p) {
  if (!existsSync(p)) return;
  for (const e of readdirSync(p, { withFileTypes: true })) {
    if (["node_modules", ".next", "seed", "repositories", "scripts", "__tests__", "__mocks__", "configs", "contracts", "validators"].includes(e.name)) continue;
    const full = join(p, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (full.endsWith(".tsx") && !SKIP_PATH_RE.test(full)) yield full;
  }
}

const RE_GRADIENT = /\b(?:bg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)|from-[a-z]+-\d+|to-[a-z]+-\d+|via-[a-z]+-\d+)\b/;
const RE_CLIP_TEXT = /bg-clip-text/;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (RE_GRADIENT.test(lines[i]) && RE_CLIP_TEXT.test(lines[i])) {
        console.log(`${file}:${i + 1}`);
        console.log(`  ${lines[i].trim().slice(0, 140)}`);
      }
    }
  }
}
