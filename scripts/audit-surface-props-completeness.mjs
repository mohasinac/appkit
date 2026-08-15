#!/usr/bin/env node
/**
 * audit-surface-props-completeness.mjs — SurfaceProps wiring completeness check.
 *
 * For every component whose props interface `extends SurfaceProps` (the
 * shared surface/padding/rounded/border/shadow/overflow contract in
 * surface-tokens.ts), verifies its `buildSurfaceClasses({...})` call
 * destructures and forwards ALL of SurfaceProps' fields — not just the ones
 * the original author happened to wire up.
 *
 * Root cause: TypeScript accepting a prop (because the interface extends
 * SurfaceProps) says nothing about whether the component actually APPLIES
 * it. `paddingX`/`paddingY`/`roundedTop`/`roundedBottom`/`overflow` were
 * typed as accepted across a dozen components (Article, Aside, Nav,
 * BlockHeader, BlockFooter, Table, Pre, Blockquote, Figure, Dl in
 * Semantic.tsx; Container, Stack, Row, Grid in Layout.tsx) but silently
 * fell into `...rest` and were spread onto the DOM as invalid attributes
 * with zero visual effect — SHARED-BUG-08 (2026-08-15).
 *
 * Suppress per-interface with `// audit-surface-props-ok: <reason>` on the
 * line of the `interface X extends ... SurfaceProps` declaration, for a
 * component that deliberately only supports a subset (should usually be
 * `Pick<SurfaceProps, ...>` instead, which this audit does not flag).
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

const REQUIRED_KEYS = [
  "surface", "padding", "paddingX", "paddingY",
  "rounded", "roundedTop", "roundedBottom",
  "border", "shadow", "overflow",
];

const INTERFACE_RE = /(?:export\s+)?interface\s+(\w+)\s+extends\s+([^{]+)\{/g;
const SUPPRESS_RE = /\/\/\s*audit-surface-props-ok\b/;

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

function lineOf(content, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (content[i] === "\n") n++;
  return n;
}

function lineText(content, index) {
  const start = content.lastIndexOf("\n", index) + 1;
  const end = content.indexOf("\n", index);
  return content.slice(start, end === -1 ? content.length : end);
}

/** Extends clause is comma-separated identifiers/generics — only a bare
 * `SurfaceProps` token counts (not `Pick<SurfaceProps, ...>` / `Omit<...>`). */
function extendsBareSurfaceProps(extendsClause) {
  return extendsClause
    .split(",")
    .map((s) => s.trim())
    .includes("SurfaceProps");
}

/** Finds the object literal passed to the next buildSurfaceClasses({...})
 * call at or after `fromIndex`, bounded by `beforeIndex`. Returns the raw
 * object-literal text, or null if no call exists in range. */
function findBuildSurfaceClassesCall(content, fromIndex, beforeIndex) {
  const callIndex = content.indexOf("buildSurfaceClasses(", fromIndex);
  if (callIndex === -1 || callIndex >= beforeIndex) return null;
  const braceStart = content.indexOf("{", callIndex);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return { text: content.slice(braceStart + 1, i), line: lineOf(content, callIndex) };
    }
  }
  return null;
}

/** Given the index of the `{` that opens an interface body, returns the
 * body text up to (not including) the matching `}`. */
function extractInterfaceBody(content, braceStart) {
  let depth = 0;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return content.slice(braceStart + 1, i);
    }
  }
  return "";
}

/** Fields the child interface redeclares with its own type (e.g. Card's
 * `padding?: CardPadding` narrows/shadows SurfaceProps' `padding`) are the
 * component's own responsibility to apply however it sees fit — they're not
 * required to flow through buildSurfaceClasses(). */
function redeclaredKeys(interfaceBody, requiredKeys) {
  const redeclared = new Set();
  for (const key of requiredKeys) {
    const re = new RegExp(`(?:^|\\n)\\s*${key}\\??\\s*:`, "m");
    if (re.test(interfaceBody)) redeclared.add(key);
  }
  return redeclared;
}

function extractShorthandKeys(objectText) {
  return new Set(
    objectText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      // Shorthand property (`surface`) or renamed (`surface: surface`) —
      // either way the identifier before any `:` is the key.
      .map((s) => s.split(":")[0].trim()),
  );
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  if (/__tests__|\.test\.[tj]sx?$/.test(file)) continue;
  const content = readFileSync(file, "utf8");
  if (!content.includes("SurfaceProps")) continue;

  const interfaces = [];
  let m;
  INTERFACE_RE.lastIndex = 0;
  while ((m = INTERFACE_RE.exec(content)) !== null) {
    if (!extendsBareSurfaceProps(m[2])) continue;
    const braceStart = m.index + m[0].length - 1; // m[0] ends with "{"
    const body = extractInterfaceBody(content, braceStart);
    interfaces.push({ name: m[1], index: m.index, redeclared: redeclaredKeys(body, REQUIRED_KEYS) });
  }
  if (interfaces.length === 0) continue;

  const rel = relative(SRC_DIR, file).replace(/\\/g, "/");

  interfaces.forEach((iface, idx) => {
    if (SUPPRESS_RE.test(lineText(content, iface.index))) return;
    const scopeEnd = idx + 1 < interfaces.length ? interfaces[idx + 1].index : content.length;
    const call = findBuildSurfaceClassesCall(content, iface.index, scopeEnd);
    if (!call) {
      violations.push({
        file: rel,
        line: lineOf(content, iface.index),
        name: iface.name,
        issue: "extends SurfaceProps but no buildSurfaceClasses() call found for this component",
      });
      return;
    }
    const keys = extractShorthandKeys(call.text);
    const missing = REQUIRED_KEYS.filter((k) => !keys.has(k) && !iface.redeclared.has(k));
    if (missing.length > 0) {
      violations.push({
        file: rel,
        line: call.line,
        name: iface.name,
        issue: `buildSurfaceClasses() missing: ${missing.join(", ")}`,
      });
    }
  });
}

if (violations.length === 0) {
  console.log("audit-surface-props-completeness: every SurfaceProps-extending component forwards all fields ✓");
  process.exit(0);
}

const out = [
  `audit-surface-props-completeness: ${violations.length} violation(s):`,
  "",
  ...violations.map((v) => `  ${v.file}:${v.line}  ${v.name} — ${v.issue}`),
  "",
  "Fix: destructure every SurfaceProps field (surface, padding, paddingX,",
  "paddingY, rounded, roundedTop, roundedBottom, border, shadow, overflow)",
  "and pass all of them into buildSurfaceClasses({...}) — see Section/Main",
  "in Semantic.tsx for the reference implementation. If the component",
  "genuinely only supports a subset, type its props with",
  "`Pick<SurfaceProps, \"surface\" | \"padding\">` instead of `extends SurfaceProps`.",
];

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
