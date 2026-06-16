#!/usr/bin/env node
// W14 codemod: swap Record<string, unknown> → FirestoreDocument across appkit.
// Add FirestoreDocument import where missing. Handles multi-line imports.

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
]);

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) yield full;
  }
}

const PATTERN = /Record\s*<\s*string\s*,\s*unknown\s*>/g;
// Match multi-line OR single-line import statements
const IMPORT_RE = /^import\s+(?:type\s+)?\{[\s\S]+?\}\s+from\s+["'][^"']+["'];?$/gm;

let totalSites = 0;
let touchedFiles = 0;

for (const file of walk(ROOT)) {
  const relPath = file.replace(/\\/g, "/");
  if (ALLOWLISTED_FILES.has(relPath)) continue;
  const src = readFileSync(file, "utf8");
  if (!PATTERN.test(src)) continue;
  PATTERN.lastIndex = 0;

  const before = src;
  let newSrc = src.replace(PATTERN, "FirestoreDocument");
  const sites = (before.match(PATTERN) || []).length;
  PATTERN.lastIndex = 0;

  // Check if FirestoreDocument already imported
  const imports = [...newSrc.matchAll(IMPORT_RE)].map((m) => m[0]);
  const hasFirestoreDocumentImport = imports.some((i) => /\bFirestoreDocument\b/.test(i));

  if (!hasFirestoreDocumentImport) {
    // Find appkit or schemas/types import
    const target = imports.find((i) =>
      /from\s+["']@mohasinac\/appkit(?:\/client)?["']/.test(i) ||
      /from\s+["'](?:\.\.\/)+schemas\/types["']/.test(i),
    );

    if (target) {
      // Inject FirestoreDocument inside the existing import braces
      const updated = target.replace(/\{([^}]+)\}/, (match, inner) => {
        const trimmed = inner.trim().replace(/,\s*$/, "");
        const isTypeImport = /^import\s+type/.test(target);
        const prefix = isTypeImport ? "" : "type ";
        // Multi-line: preserve trailing comma style
        if (trimmed.includes("\n")) {
          return `{\n  ${prefix}FirestoreDocument,\n${inner.replace(/^\s*/, "  ")}}`;
        }
        return `{ ${trimmed}, ${prefix}FirestoreDocument }`;
      });
      newSrc = newSrc.replace(target, updated);
    } else {
      // Add new import line AFTER the last existing import in the file
      const lastImport = imports[imports.length - 1];
      if (lastImport) {
        newSrc = newSrc.replace(lastImport, `${lastImport}\nimport type { FirestoreDocument } from "@mohasinac/appkit";`);
      } else {
        // No imports at all — prepend
        newSrc = `import type { FirestoreDocument } from "@mohasinac/appkit";\n${newSrc}`;
      }
    }
  }

  writeFileSync(file, newSrc);
  touchedFiles++;
  totalSites += sites;
  console.log(`${file}: -${sites} sites`);
}

console.log(`\nTotal: ${touchedFiles} files, -${totalSites} sites`);
