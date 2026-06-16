#!/usr/bin/env node
/**
 * Migrate raw <table>/<thead>/<tbody>/<tfoot>/<tr>/<th>/<td> elements
 * to <Table>/<Thead>/<Tbody>/<Tfoot>/<Tr>/<Th>/<Td> primitives in
 * feature/page files. Drop-in swap — all primitives accept className,
 * style, and other HTML attrs via spread.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const ROOTS = [join(REPO_ROOT, "src"), join(REPO_ROOT, "appkit", "src")];
const APPLY = process.argv.includes("--apply");

const SKIP_PATH_RE = /[/\\]ui[/\\](?:components|forms|rich-text)[/\\]|[/\\]features[/\\]forms[/\\]|[/\\]_internal[/\\]server[/\\]features[/\\][^/\\]+[/\\]og(?:-layout)?\.tsx$|ErrorBoundary\.tsx$/;

const TAG_MAP = {
  table: "Table",
  thead: "Thead",
  tbody: "Tbody",
  tfoot: "Tfoot",
  tr: "Tr",
  th: "Th",
  td: "Td",
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
    if (!/<(?:table|thead|tbody|tfoot|tr|th|td)\b/.test(src)) continue;

    let out = src;
    const needed = new Set();
    for (const [lower, Upper] of Object.entries(TAG_MAP)) {
      const re = new RegExp(`<${lower}\\b`, "g");
      const close = new RegExp(`</${lower}>`, "g");
      const matches = out.match(re) || [];
      if (matches.length === 0) continue;
      needed.add(Upper);
      elementsReplaced += matches.length;
      out = out.replace(re, `<${Upper}`);
      out = out.replace(close, `</${Upper}>`);
    }

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
console.log(`${APPLY ? "Migrated" : "Would migrate"} ${elementsReplaced} table elements across ${fixed} files.`);
