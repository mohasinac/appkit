#!/usr/bin/env node
// Swap inline `(X as { foo?: unknown })` → `(X as { foo?: JsonValue })`.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const EXCLUDED = new Set(["node_modules", "dist", "__tests__", "__mocks__"]);
const ALLOWLISTED_FILES = new Set([
  "src/utils/object.helper.ts",
  "src/schemas/types.ts",
]);

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

const IMPORT_RE = /^import\s+(?:type\s+)?\{[\s\S]+?\}\s+from\s+["'][^"']+["'];?$/gm;
const PER_LINE_OK_RE = /\/\/\s*audit-unknown-ok\s*:/i;
// Match `(\w+\??:\s*unknown)` inside `as {...}`
const FIELD_UNKNOWN_RE = /(\bas\s+\{[^}]*?\w+\??\s*:\s*)unknown\b/g;
// Match `unknown[]` inside `as {...}`
const FIELD_UNKNOWN_ARR_RE = /(\bas\s+\{[^}]*?\w+\??\s*:\s*)unknown\[\]/g;

let totalSites = 0;
let touchedFiles = 0;

for (const file of walk(ROOT)) {
  const relPath = file.replace(/\\/g, "/");
  if (ALLOWLISTED_FILES.has(relPath)) continue;
  const src = readFileSync(file, "utf8");
  if (!/\bunknown\b/.test(src)) continue;

  const lines = src.split(/\r?\n/);
  let sitesInFile = 0;
  let needsJsonValue = false;
  let needsJsonArray = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (PER_LINE_OK_RE.test(line)) continue;
    if (i > 0 && PER_LINE_OK_RE.test(lines[i - 1])) continue;

    let newLine = line.replace(FIELD_UNKNOWN_ARR_RE, (_, prefix) => {
      sitesInFile++; needsJsonArray = true;
      return `${prefix}JsonArray`;
    });
    newLine = newLine.replace(FIELD_UNKNOWN_RE, (_, prefix) => {
      sitesInFile++; needsJsonValue = true;
      return `${prefix}JsonValue`;
    });
    if (newLine !== line) lines[i] = newLine;
  }

  if (sitesInFile === 0) continue;

  let newSrc = lines.join("\n");
  const imports = [...newSrc.matchAll(IMPORT_RE)].map((m) => m[0]);
  const has = (name) => imports.some((i) => new RegExp(`\\b${name}\\b`).test(i));
  const missing = [];
  if (needsJsonValue && !has("JsonValue")) missing.push("JsonValue");
  if (needsJsonArray && !has("JsonArray")) missing.push("JsonArray");

  if (missing.length > 0) {
    const target = imports.find((i) =>
      /from\s+["']@mohasinac\/appkit(?:\/client)?["']/.test(i) ||
      /from\s+["'](?:\.\.\/)+schemas\/types["']/.test(i),
    );
    if (target) {
      const updated = target.replace(/\{([^}]+)\}/, (_, inner) => {
        const trimmed = inner.trim().replace(/,\s*$/, "");
        const isTypeImport = /^import\s+type/.test(target);
        const prefix = isTypeImport ? "" : "type ";
        const adds = missing.map((m) => `${prefix}${m}`).join(", ");
        if (trimmed.includes("\n")) {
          const indent = (inner.match(/\n(\s*)/) || ["", "  "])[1];
          return `{${inner}${inner.endsWith(",") ? "" : ","}\n${indent}${adds},\n}`;
        }
        return `{ ${trimmed}, ${adds} }`;
      });
      newSrc = newSrc.replace(target, updated);
    } else {
      const lastImport = imports[imports.length - 1];
      const importLine = `import type { ${missing.join(", ")} } from "@mohasinac/appkit";`;
      if (lastImport) {
        newSrc = newSrc.replace(lastImport, `${lastImport}\n${importLine}`);
      } else {
        newSrc = `${importLine}\n${newSrc}`;
      }
    }
  }

  writeFileSync(file, newSrc);
  touchedFiles++;
  totalSites += sitesInFile;
  console.log(`${file}: -${sitesInFile} sites`);
}

console.log(`\nTotal: ${touchedFiles} files, -${totalSites} sites`);
