#!/usr/bin/env node
/**
 * Migrate raw <span> elements to <Span> primitive in feature/page
 * files (skipping ui/components/, features/forms/, og.tsx etc.).
 *
 * Span extends React.HTMLAttributes<HTMLSpanElement> so all standard
 * HTML attrs (className, style, role, etc.) pass through unchanged.
 * Drop-in swap.
 *
 * - Replaces `<span\b` → `<Span` and `</span>` → `</Span>`
 * - Adds `Span` to the file's existing appkit ui import if needed
 *   (matches imports from `../../../ui`, `../../ui`, `@mohasinac/appkit`,
 *   `@mohasinac/appkit/ui`, `@mohasinac/appkit/client`).
 * - Skips files matching the same SKIP_PATH_RE as audit-html-wrappers.
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

const SPAN_OPEN_RE = /<span(?=[\s>])/g;
const SPAN_CLOSE_RE = /<\/span>/g;
const IMPORT_LINE_RE = /^([ \t]*)import\s*\{([^}]+)\}\s*from\s*("(?:\.\.\/)+ui"|"@mohasinac\/appkit(?:\/(?:ui|client))?")\s*;?\s*$/m;

let fixed = 0;
let spansReplaced = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    if (!SPAN_OPEN_RE.test(src)) { SPAN_OPEN_RE.lastIndex = 0; continue; }
    SPAN_OPEN_RE.lastIndex = 0;
    let out = src.replace(SPAN_OPEN_RE, "<Span");
    out = out.replace(SPAN_CLOSE_RE, "</Span>");

    // Inject Span into existing appkit ui import if missing.
    if (!/\bSpan\b/.test(out.slice(0, 2000))) {
      const m = IMPORT_LINE_RE.exec(out);
      if (m) {
        const items = m[2].split(",").map((s) => s.trim()).filter(Boolean);
        if (!items.includes("Span")) {
          items.push("Span");
          items.sort();
          const newLine = `${m[1]}import { ${items.join(", ")} } from ${m[3]};`;
          out = out.replace(IMPORT_LINE_RE, newLine);
        }
      }
    }

    const count = (src.match(SPAN_OPEN_RE) || []).length;
    SPAN_OPEN_RE.lastIndex = 0;
    spansReplaced += count;
    fixed++;
    if (APPLY) writeFileSync(file, out);
  }
}
console.log(`${APPLY ? "Migrated" : "Would migrate"} ${spansReplaced} <span> → <Span> across ${fixed} files.`);
