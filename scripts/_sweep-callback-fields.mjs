#!/usr/bin/env node
// Sweep `field?: (arg: unknown) => ...` callback-typed interface fields
// and `apiClient.get<{ X: unknown[] }>` generic args.

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

  const lines = src.split(/\r?\n/);
  let sitesInFile = 0;
  let needsJsonValue = false;
  let needsJsonArray = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (PER_LINE_OK_RE.test(line)) continue;
    if (i > 0 && PER_LINE_OK_RE.test(lines[i - 1])) continue;

    // onSuccess?: (data: unknown) => ... — interface field callback
    // onError?: (err: unknown) => ...
    // onChange?: (value: unknown) => ...
    let newLine = line.replace(/(onSuccess\?\s*:\s*\([^)]*?:\s*)unknown(\b)/g, (_, prefix, suffix) => {
      sitesInFile++; needsJsonValue = true;
      return `${prefix}JsonValue${suffix}`;
    });
    newLine = newLine.replace(/(onError\?\s*:\s*\([^)]*?:\s*)unknown(\b)/g, (_, prefix, suffix) => {
      sitesInFile++;
      // err is Error
      return `${prefix}Error${suffix}`;
    });
    newLine = newLine.replace(/(onChange\?\s*:\s*\([^)]*?:\s*)unknown(\b)/g, (_, prefix, suffix) => {
      sitesInFile++; needsJsonValue = true;
      return `${prefix}JsonValue${suffix}`;
    });

    // apiClient.get<{ X: unknown[] }>, .get<{ X?: unknown[] }>
    newLine = newLine.replace(/(apiClient\.\w+<\{[^}]*?:\s*)unknown(\[\])/g, (_, prefix, suffix) => {
      sitesInFile++; needsJsonValue = true;
      return `${prefix}JsonValue${suffix}`;
    });

    // useQuery<{ X: unknown[] }>
    newLine = newLine.replace(/(useQuery<\{[^}]*?:\s*)unknown(\[\])/g, (_, prefix, suffix) => {
      sitesInFile++; needsJsonValue = true;
      return `${prefix}JsonValue${suffix}`;
    });

    // `: unknown;` at end of line (typical interface field) — already covered by W16a's regex but
    // some edge cases might remain
    // `data?: unknown` in standalone lines
    if (/^\s+\w+\??\s*:\s*unknown;?\s*$/.test(line)) {
      newLine = line.replace(/(\s+\w+\??\s*:\s*)unknown/g, (_, prefix) => {
        sitesInFile++; needsJsonValue = true;
        return `${prefix}JsonValue`;
      });
    }

    if (newLine !== line) lines[i] = newLine;
  }

  if (sitesInFile === 0) continue;

  let newSrc = lines.join("\n");

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
