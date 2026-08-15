#!/usr/bin/env node
/**
 * audit-innerhtml-sanitization.mjs — unreviewed .innerHTML assignment detector.
 *
 * Flags `element.innerHTML = <expr>` where `<expr>` is not a string literal,
 * outside a small explicit allowlist of files already known to sanitize
 * before assigning. Every new site must either route through an existing
 * sanitizer or be added to the allowlist with a one-line reason — this is a
 * gate on the *pattern*, not proof that any given assignment is unsafe.
 *
 * Root cause: RichTextEditor.tsx used to set `editor.innerHTML = value` (on
 * every prop update) and forward `editor.innerHTML` verbatim via `onChange`
 * on every input/paste, with zero sanitization anywhere in the file —
 * SHARED-BUG-27 (2026-08-15). A previously-stored `<img onerror=…>` would
 * fire immediately on re-render (stored XSS), and pasted markup carried
 * event-handler attributes straight through to whatever persisted the
 * `onChange` value.
 *
 * Suppress per-line with `// audit-innerhtml-ok: <reason>` for a genuine new
 * sanitized site outside the allowlist below.
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

// Files already audited and confirmed to sanitize before every .innerHTML
// assignment (RichTextEditor.tsx: sanitizeRichTextHtml(); RichText.tsx:
// sanitiseHtml()). Adding a file here is a manual, reviewed decision — not
// something this script infers automatically.
const ALLOWLIST = new Set([
  "ui/components/RichTextEditor.tsx",
  "ui/rich-text/RichText.tsx",
]);

const SUPPRESS_RE = /\/\/\s*audit-innerhtml-ok\b/;
// `.innerHTML = <not a string literal>` — i.e. assigned from a variable or
// expression rather than a fixed string the author wrote directly.
const INNERHTML_ASSIGN_RE = /\.innerHTML\s*=\s*(?!["'`])[^=]/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(join(dir, entry.name), files);
    } else {
      const ext = extname(entry.name);
      if (ext === ".tsx" || ext === ".ts") files.push(join(dir, entry.name));
    }
  }
  return files;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  if (/__tests__|\.test\.[tj]sx?$/.test(file)) continue;
  const rel = relative(SRC_DIR, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (SUPPRESS_RE.test(lines[i])) continue;
    if (INNERHTML_ASSIGN_RE.test(lines[i])) {
      violations.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 140) });
    }
  }
}

if (violations.length === 0) {
  console.log("audit-innerhtml-sanitization: no unreviewed .innerHTML assignments found ✓");
  process.exit(0);
}

const out = [
  `audit-innerhtml-sanitization: ${violations.length} unreviewed .innerHTML assignment(s):`,
  "",
  ...violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`),
  "",
  "Fix: sanitize the value before assigning (see sanitizeRichTextHtml() in",
  "RichTextEditor.tsx or sanitiseHtml() in RichText.tsx for the established",
  "allowlist-based pattern), then add the file to ALLOWLIST in this script —",
  "or suppress a single confirmed-safe line with // audit-innerhtml-ok: <reason>.",
];

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
