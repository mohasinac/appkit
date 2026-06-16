#!/usr/bin/env node
/**
 * Migrate raw <code>/<pre>/<blockquote>/<kbd>/<q> elements to
 * <Code>/<Pre>/<Blockquote>/<Kbd>/<Quote> primitives in feature/page files.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const ROOTS = [join(REPO_ROOT, "src"), join(REPO_ROOT, "appkit", "src")];
const APPLY = process.argv.includes("--apply");

const SKIP_PATH_RE = /[/\\]ui[/\\](?:components|forms|rich-text)[/\\]|[/\\]ui[/\\]DataTable\.tsx$|[/\\]features[/\\]forms[/\\]|[/\\]features[/\\]email[/\\]|[/\\]_internal[/\\]server[/\\]features[/\\][^/\\]+[/\\]og(?:-layout)?\.tsx$|ErrorBoundary\.tsx$/;

const TAG_MAP = {
  code: "Code",
  pre: "Pre",
  blockquote: "Blockquote",
  kbd: "Kbd",
  q: "Quote",
};

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
    if (!/<(?:code|pre|blockquote|kbd|q)\s/.test(src)) continue;

    let out = src;
    const needed = new Set();
    for (const [lower, Upper] of Object.entries(TAG_MAP)) {
      const openRe = new RegExp(`<${lower}(\\s)`, "g");
      const closeRe = new RegExp(`</${lower}>`, "g");
      const matches = out.match(openRe) || [];
      if (matches.length === 0) continue;
      needed.add(Upper);
      elementsReplaced += matches.length;
      out = out.replace(openRe, `<${Upper}$1`);
      out = out.replace(closeRe, `</${Upper}>`);
    }

    // Inject the needed primitives into the existing appkit ui import.
    const head = out.slice(0, 2500);
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
console.log(`${APPLY ? "Migrated" : "Would migrate"} ${elementsReplaced} inline-text elements across ${fixed} files.`);
