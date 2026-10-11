/*
 * Shared module-graph primitives for appkit/src.
 *
 * One definition of "what does this file import" and "where is this symbol
 * actually defined", used by the import-hygiene codemod and by the audits that
 * measure its effect. Two copies of a resolver would disagree the first time
 * one learned about a new re-export form.
 *
 * @tag domain:build
 * @tag layer:lib
 * @tag access:node-only
 * @tag sideEffects:none — pure reads
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/** Blank comments while preserving every index — see lib/mask-comments.mjs. */
export { maskComments } from "./mask-comments.mjs";
import { maskComments } from "./mask-comments.mjs";

/** Resolve a relative specifier the way tsc does: sibling file beats directory. */
export function resolveSpec(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), spec);
  for (const c of [`${base}.ts`, `${base}.tsx`, `${base}.d.ts`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(c)) return c;
  }
  return null;
}

/** Every .ts/.tsx file under a root. */
export function sourceFiles(root) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) out.push(resolve(p));
    }
  })(root);
  return out;
}

const srcCache = new Map();
export function readMasked(file) {
  if (!srcCache.has(file)) {
    let t = "";
    try {
      t = maskComments(readFileSync(file, "utf8"));
    } catch {
      /* unreadable file contributes nothing */
    }
    srcCache.set(file, t);
  }
  return srcCache.get(file);
}

/** Transitive relative-import closure, memoised. */
const graphCache = new Map();
export function graphSize(entry) {
  const k = resolve(entry);
  if (graphCache.has(k)) return graphCache.get(k);
  const seen = new Set([k]);
  const q = [k];
  while (q.length) {
    const f = q.shift();
    for (const m of readMasked(f).matchAll(/(?:from|import)\s*"([^"]+)"/g)) {
      const r = resolveSpec(f, m[1]);
      if (r && !seen.has(r)) {
        seen.add(r);
        q.push(r);
      }
    }
  }
  graphCache.set(k, seen);
  return seen;
}

/**
 * Does this module DECLARE the symbol itself (as opposed to re-exporting it)?
 *
 * Covers the declaration forms tsc emits an export for. `export default` is
 * deliberately excluded — a default has no stable name to re-import by.
 */
export function declares(file, name) {
  const s = readMasked(file);
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `export\\s+(?:declare\\s+)?(?:async\\s+)?(?:abstract\\s+)?` +
      `(?:const|let|var|function|class|type|interface|enum)\\s+${esc}\\b`,
  ).test(s);
}

/** `{ exposedName -> { mod, originalName } }` plus `export * from` targets. */
const tableCache = new Map();
export function reexportTable(file) {
  if (tableCache.has(file)) return tableCache.get(file);
  const s = readMasked(file);
  const named = new Map();
  const stars = [];

  for (const m of s.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
    const next = resolveSpec(file, m[3]);
    if (!next) continue;
    const typeOnlyClause = Boolean(m[1]);
    for (let piece of m[2].split(",")) {
      piece = piece.trim();
      if (!piece) continue;
      const isType = typeOnlyClause || /^type\s+/.test(piece);
      piece = piece.replace(/^type\s+/, "");
      const [orig, exposed] = piece.split(/\s+as\s+/).map((x) => x.trim());
      named.set(exposed || orig, { mod: next, orig, isType });
    }
  }
  for (const m of s.matchAll(/export\s*\*\s*from\s*"([^"]+)"/g)) {
    const next = resolveSpec(file, m[1]);
    if (next) stars.push(next);
  }

  const t = { named, stars };
  tableCache.set(file, t);
  return t;
}

/**
 * Walk re-export hops to the module that actually declares `name`.
 *
 * Returns `{ file, isType, localName }` or null when the chain cannot be
 * resolved — null means LEAVE THE IMPORT ALONE, never guess.
 *
 * 🛑 `localName` IS NOT OPTIONAL INFORMATION. A barrel may RENAME on re-export
 * (`export { createRouteHandler as createApiHandler } from "./x"`), in which
 * case the defining module exports `createRouteHandler` and knows nothing
 * about `createApiHandler`. A codemod that emits the EXPOSED name produces
 *     import { createApiHandler } from ".../next/api/routeHandler"
 * and tsc answers "has no exported member" — which is exactly what the first
 * run of the consumer migration did, across every renamed symbol. The caller
 * must emit `import { localName as exposedName }` whenever the two differ.
 */
export function definingModule(startFile, name, depth = 0, sawType = false) {
  if (depth > 12) return null;
  if (declares(startFile, name)) return { file: startFile, isType: sawType, localName: name };

  const { named, stars } = reexportTable(startFile);
  const hit = named.get(name);
  if (hit) return definingModule(hit.mod, hit.orig, depth + 1, sawType || hit.isType);

  for (const star of stars) {
    const r = definingModule(star, name, depth + 1, sawType);
    if (r) return r;
  }
  return null;
}

/** POSIX-style relative specifier from one file to another, no extension. */
export function specifierFrom(fromFile, toFile) {
  let rel = relative(dirname(fromFile), toFile).replace(/\\/g, "/");
  rel = rel.replace(/\.tsx?$/, "").replace(/\/index$/, "");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/** True when the path is a barrel (an index file). */
export function isBarrel(file) {
  return /[\\/]index\.tsx?$/.test(file);
}

export function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
