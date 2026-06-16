#!/usr/bin/env node
/**
 * Migrate raw <ul>/<ol>/<li> elements to <Ul>/<Ol>/<Li> primitives in
 * feature/page files (skipping ui/components/, features/forms/, og.tsx etc.).
 * All three extend React.HTMLAttributes so attrs pass through unchanged.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const ROOTS = [join(REPO_ROOT, "src"), join(REPO_ROOT, "appkit", "src")];
const APPLY = process.argv.includes("--apply");

const SKIP_PATH_RE = /[/\\]ui[/\\](?:components|forms|rich-text)[/\\]|[/\\]features[/\\]forms[/\\]|[/\\]_internal[/\\]server[/\\]features[/\\][^/\\]+[/\\]og(?:-layout)?\.tsx$|ErrorBoundary\.tsx$/;

function* walk(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "__tests__") continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.name.endsWith(".tsx") && !SKIP_PATH_RE.test(full)) yield full;
  }
}

const IMPORT_LINE_RE = /^([ \t]*)import\s*\{([^}]+)\}\s*from\s*("(?:\.\.\/)+ui"|"@mohasinac\/appkit(?:\/(?:ui|client))?")\s*;?\s*$/m;

let fixed = 0;
let elementsReplaced = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    if (!/<(?:ul|ol|li)\b/.test(src)) continue;

    let out = src;
    const needed = new Set();
    if (/<ul\b/.test(out)) needed.add("Ul");
    if (/<ol\b/.test(out)) needed.add("Ol");
    if (/<li\b/.test(out)) needed.add("Li");

    const ulCount = (src.match(/<ul\b/g) || []).length;
    const olCount = (src.match(/<ol\b/g) || []).length;
    const liCount = (src.match(/<li\b/g) || []).length;
    elementsReplaced += ulCount + olCount + liCount;

    out = out.replace(/<ul\b/g, "<Ul");
    out = out.replace(/<\/ul>/g, "</Ul>");
    out = out.replace(/<ol\b/g, "<Ol");
    out = out.replace(/<\/ol>/g, "</Ol>");
    out = out.replace(/<li\b/g, "<Li");
    out = out.replace(/<\/li>/g, "</Li>");

    // Inject the needed primitives into the existing appkit ui import.
    const head = out.slice(0, 2000);
    const missing = [...needed].filter(
      (sym) => !new RegExp(`import\\s*\\{[^}]*\\b${sym}\\b[^}]*\\}`).test(head),
    );
    if (missing.length > 0) {
      const m = IMPORT_LINE_RE.exec(out);
      if (m) {
        const items = m[2].split(",").map((s) => s.trim()).filter(Boolean);
        let changed = false;
        for (const sym of missing) {
          if (!items.includes(sym)) {
            items.push(sym);
            changed = true;
          }
        }
        if (changed) {
          items.sort();
          const newLine = `${m[1]}import { ${items.join(", ")} } from ${m[3]};`;
          out = out.replace(IMPORT_LINE_RE, newLine);
        }
      }
    }

    if (APPLY) writeFileSync(file, out);
    fixed++;
  }
}
console.log(`${APPLY ? "Migrated" : "Would migrate"} ${elementsReplaced} list elements across ${fixed} files.`);
