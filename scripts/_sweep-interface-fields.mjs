#!/usr/bin/env node
// W16a codemod (conservative): swap `field?: unknown` and `field?: unknown[]`
// INSIDE interface/type declarations only. Skips function parameters,
// type guards, generic defaults, catch clauses.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const EXCLUDED = new Set(["node_modules", "dist", "__tests__", "__mocks__"]);
const ALLOWLISTED_FILES = new Set([
  "src/utils/object.helper.ts",
  "src/schemas/types.ts",
  "src/ui/rich-text/RichText.tsx",
  "src/ui/components/RichTextEditor.tsx",
  "src/errors/normalize.ts",
  "src/core/Logger.ts",
  "src/core/EventBus.ts",
  "src/core/server-action.ts",
  "src/core/mutation-events.ts",
  "src/contracts/field-ops.ts",
  "src/contracts/extend.ts",
  "src/contracts/client-realtime.ts",
  "src/client/api/ApiError.ts",
  "src/client/api/surface-error.ts",
  "src/client/api/useApiQuery.ts",
  "src/errors/base-error.ts",
  "src/errors/api-error.ts",
  "src/errors/authentication-error.ts",
  "src/errors/authorization-error.ts",
  "src/errors/database-error.ts",
  "src/errors/error-handler.ts",
  "src/errors/error-mapping.ts",
  "src/errors/validation-error.ts",
  "src/errors/not-found-error.ts",
  "src/errors/razorpay-unreachable.ts",
  "src/core/newsletter.repository.ts",
  "src/configs/next.ts",
  "src/configs/tailwind.ts",
  "src/configs/postcss.ts",
  "src/configs/eslint.ts",
  "src/cli/index.ts",
  "src/monitoring/server-logger.ts",
  "src/monitoring/client-logger.ts",
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

let totalSites = 0;
let touchedFiles = 0;

for (const file of walk(ROOT)) {
  const relPath = file.replace(/\\/g, "/");
  if (ALLOWLISTED_FILES.has(relPath)) continue;
  const src = readFileSync(file, "utf8");
  if (!/\bunknown\b/.test(src)) continue;

  // Find all interface/type declaration blocks
  // Match `interface Foo { ... }` and `type Foo = { ... }`
  const blockRe = /(?:^|\n)\s*(?:export\s+)?(?:interface\s+\w+(?:<[^>]+>)?(?:\s+extends\s+[^{]+)?\s*\{|type\s+\w+(?:<[^>]+>)?\s*=\s*\{)([\s\S]*?)\n\s*\}/g;
  let newSrc = src;
  let needsJsonValue = false;
  let needsJsonArray = false;
  let sitesInFile = 0;

  newSrc = newSrc.replace(blockRe, (block, body) => {
    const lines = body.split(/\n/);
    let changed = false;
    const newLines = lines.map((line, i) => {
      if (PER_LINE_OK_RE.test(line)) return line;
      if (i > 0 && PER_LINE_OK_RE.test(lines[i - 1])) return line;

      let newLine = line;
      // `field?: unknown[]` or `field: unknown[]` → JsonArray
      newLine = newLine.replace(/(\w+\??\s*:\s*)unknown\[\]/g, (_, prefix) => {
        changed = true;
        needsJsonArray = true;
        sitesInFile++;
        return `${prefix}JsonArray`;
      });
      // `field?: unknown` or `field: unknown` → JsonValue
      // Only when not followed by `[` (already caught above) and not inside generics
      newLine = newLine.replace(/(\w+\??\s*:\s*)unknown\b(?!\[|\s*[,;]?\s*$|\s*[)>])/g, (match, prefix, offset, full) => {
        const before = full.slice(0, offset);
        const openCount = (before.match(/</g) || []).length;
        const closeCount = (before.match(/>/g) || []).length;
        if (openCount > closeCount) return match;
        changed = true;
        needsJsonValue = true;
        sitesInFile++;
        return `${prefix}JsonValue`;
      });
      // Index signature: `[key: string]: unknown` → JsonValue
      newLine = newLine.replace(/(\[\s*\w+\s*:\s*\w+\s*\]\s*:\s*)unknown\b/g, (_, prefix) => {
        changed = true;
        needsJsonValue = true;
        sitesInFile++;
        return `${prefix}JsonValue`;
      });
      return newLine;
    });
    return changed ? block.replace(body, newLines.join("\n")) : block;
  });

  if (sitesInFile === 0) continue;

  // Add JsonValue/JsonArray imports if missing
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
