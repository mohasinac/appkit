#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = SCRIPT_DIR.replace(/scripts$/, "");
const SCHEMAS_TYPES = APPKIT_ROOT + "src/schemas/types.ts";

const FILES = `
src/features/account/api/[userId]/addresses/route.ts
src/features/account/api/[userId]/route.ts
src/features/admin/api/bids/route.ts
src/features/admin/api/coupons/route.ts
src/features/admin/api/products/route.ts
src/features/admin/api/reviews/route.ts
src/features/before-after/api/route.ts
src/features/cart/api/route.ts
src/features/cart/api/[id]/route.ts
src/features/collections/api/route.ts
src/features/consultation/api/route.ts
src/features/corporate/api/route.ts
src/features/homepage/api/sections/route.ts
src/features/loyalty/api/admin/loyalty/grant/route.ts
src/features/loyalty/api/balance/route.ts
src/features/loyalty/api/earn/route.ts
src/features/loyalty/api/history/route.ts
src/features/loyalty/api/redeem/route.ts
src/features/pre-orders/api/admin/route.ts
src/features/pre-orders/api/admin/[id]/route.ts
src/features/pre-orders/api/[slug]/route.ts
src/features/seller/api/coupons/route.ts
src/features/seller/api/offers/route.ts
src/features/seller/api/products/route.ts
src/features/seller/api/store/route.ts
src/features/whatsapp-bot/api/send-status/route.ts
src/features/whatsapp-bot/api/webhook/route.ts
`.split("\n").map((s) => s.trim()).filter(Boolean);

for (const rel of FILES) {
  const abs = APPKIT_ROOT + rel.split("/").join(sep);
  let src = readFileSync(abs, "utf8");
  if (src.includes("JsonValue }")) {
    console.log(`SKIP (already has): ${rel}`);
    continue;
  }
  // Find a relative import to compute the relative path
  const fileDir = dirname(abs);
  let relPath = relative(fileDir, SCHEMAS_TYPES.split("/").join(sep)).replace(/\\/g, "/").replace(/\.ts$/, "");
  if (!relPath.startsWith(".")) relPath = "./" + relPath;
  const importLine = `import type { JsonValue } from "${relPath}";\n`;
  // Insert after the last import line of the initial import block
  const lines = src.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    if (/^import /.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx === -1) {
    console.log(`SKIP (no imports): ${rel}`);
    continue;
  }
  lines.splice(lastImportIdx + 1, 0, importLine.trimEnd());
  writeFileSync(abs, lines.join("\n"));
  console.log(`ADDED: ${rel} (after line ${lastImportIdx + 1}, import path: ${relPath})`);
}
