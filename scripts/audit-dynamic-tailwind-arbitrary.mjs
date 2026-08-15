#!/usr/bin/env node
/**
 * audit-dynamic-tailwind-arbitrary.mjs — dynamic Tailwind arbitrary-value detector.
 *
 * Flags template-literal interpolation inside Tailwind's arbitrary-value
 * bracket syntax, e.g. `` `top-[${offset}px]` `` or `` `aspect-[${aspect}]` ``.
 *
 * Root cause (CLAUDE.md Recurrent Root Cause Pattern #3 — Tailwind class
 * purging): Tailwind's JIT scanner extracts candidate class names by
 * statically matching literal text in source files. A template literal like
 * `` `top-[${offset}px]` `` never appears as that literal string anywhere in
 * source — the scanner can never generate a matching CSS rule for it, so the
 * element gets the raw utility class in the DOM with zero effect (e.g.
 * `position: sticky` with no actual `top` value).
 *
 * Found twice in one bug-hunt session (2026-08-15): BaseListingCard.tsx's
 * `aspect` prop and StickyToolbar.tsx's numeric `offset` prop (SHARED-BUG-19,
 * SHARED-BUG-30) — both fixed by switching to a static class-name Record
 * lookup or an inline `style={}` instead.
 *
 * Suppress per-line with `// audit-dynamic-tailwind-ok: <reason>` for a
 * genuinely irreducible case (none known at time of writing).
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

// Matches a hyphen immediately followed by an arbitrary-value bracket that
// opens with a template interpolation: `-[${`. This exact character
// sequence only ever occurs inside a template literal building a Tailwind
// arbitrary-value utility dynamically — no legitimate non-Tailwind use of
// this sequence exists in TS/TSX source.
const DYNAMIC_ARBITRARY_RE = /-\[\$\{/;
const SUPPRESS_RE = /\/\/\s*audit-dynamic-tailwind-ok\b/;

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
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (SUPPRESS_RE.test(lines[i])) continue;
    // Skip comment lines (//, JSDoc continuation *, block-comment open /**)
    // — this pattern is exactly what a comment explaining/warning about the
    // anti-pattern would quote, not an actual occurrence of it.
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
    if (DYNAMIC_ARBITRARY_RE.test(lines[i])) {
      violations.push({
        file: relative(SRC_DIR, file),
        line: i + 1,
        text: lines[i].trim().slice(0, 140),
      });
    }
  }
}

if (violations.length === 0) {
  console.log("audit-dynamic-tailwind-arbitrary: no dynamic Tailwind arbitrary-value interpolation found ✓");
  process.exit(0);
}

const out = [
  `audit-dynamic-tailwind-arbitrary: ${violations.length} violation(s) — Tailwind arbitrary-value class built from a template-literal interpolation:`,
  "",
  ...violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`),
  "",
  "Fix: Tailwind's static scanner can never see an interpolated arbitrary",
  "value, so no CSS rule is ever generated for it — the class renders in the",
  "DOM but does nothing. Use a fixed Record<Key, string> lookup of literal",
  "class names (e.g. { square: \"aspect-square\", ... }), or fall back to an",
  "inline style={} for genuinely runtime-computed values (e.g. numeric px",
  "offsets). Suppress with // audit-dynamic-tailwind-ok: <reason> only for a",
  "provably irreducible case.",
];

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
