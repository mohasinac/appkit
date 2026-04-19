/**
 * Collects all exported symbol names from every file listed in
 * the barrels (client.ts / server.ts) and prints them grouped by
 * source file, flagging duplicates.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";

const SRC = resolve("src");

function readFile(rel) {
  const abs = join(SRC, rel.replace(/^\.\//, ""));
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function resolveIndex(rel) {
  // try as-is, then with /index.ts
  const candidates = [
    rel,
    rel + ".ts",
    rel + "/index.ts",
  ];
  for (const c of candidates) {
    const abs = join(SRC, c.replace(/^\.\//, ""));
    if (existsSync(abs)) return c;
  }
  return null;
}

const EXPORT_LINE = /^export\s+(?:(?:type\s+)?(?:default\s+)?(?:class|function|const|let|var|interface|type|enum|abstract class)\s+(\w+)|(?:type\s+)?\{([^}]+)\}(?:\s+from\s+['"]([^'"]+)['"])?)/gm;
const REEXPORT_STAR = /^export\s+\*\s+from\s+['"]([^'"]+)['"]/gm;

const seen = new Map(); // symbol -> [file, ...]

function extractExports(rel, depth = 0) {
  if (depth > 5) return {};
  const text = readFile(rel);
  if (!text) return {};

  const result = {}; // symbol -> file

  // named re-exports: export { A, B } from './foo'
  for (const match of text.matchAll(/^export\s+(?:type\s+)?\{([^}]+)\}(?:\s+from\s+['"]([^'"]+)['"])?/gm)) {
    const names = match[1].split(",").map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return (parts[1] || parts[0]).trim();
    }).filter(Boolean);
    for (const name of names) {
      if (name && name !== "default") result[name] = rel;
    }
  }

  // declared exports: export function Foo, export const Foo, etc.
  for (const match of text.matchAll(/^export\s+(?:default\s+)?(?:abstract\s+)?(?:type\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/gm)) {
    result[match[1]] = rel;
  }

  // export * from './foo'
  for (const match of text.matchAll(/^export\s+\*\s+(?:as\s+\w+\s+)?from\s+['"]([^'"]+)['"]/gm)) {
    const subRel = match[1];
    const resolved = resolveRelative(rel, subRel);
    if (resolved) {
      const sub = extractExports(resolved, depth + 1);
      for (const [k, v] of Object.entries(sub)) {
        if (!result[k]) result[k] = v;
      }
    }
  }

  return result;
}

function resolveRelative(base, sub) {
  if (!sub.startsWith(".")) return null;
  const dir = dirname(join(SRC, base.replace(/^\.\//, "")));
  const abs = resolve(dir, sub);
  const rel = abs.replace(SRC + "\\", "").replace(SRC + "/", "").replace(/\\/g, "/");
  const candidates = [rel, rel + ".ts", rel + "/index.ts"];
  for (const c of candidates) {
    if (existsSync(join(SRC, c))) return c;
  }
  return null;
}

// Files to include
const FILES = [
  // tier 0
  "tokens/index.ts",
  "style/tailwind/index.ts",
  "style/vanilla/index.ts",
  // tier 1 - ui
  "ui/index.ts",
  // react
  "react/index.ts",
  // utils/helpers
  "values/index.ts",
  "utils/index.ts",
  "constants/index.ts",
  "contracts/index.ts",
  "validation/index.ts",
  "errors/index.ts",
  "seo/index.ts",
  "cli/index.ts",
  // core
  "core/index.ts",
  // infra
  "security/index.ts",
  "repositories/index.ts",
  "seed/index.ts",
  "monitoring/index.ts",
  "instrumentation/index.ts",
  "http/index.ts",
  // next
  "next/index.ts",
  // providers
  "providers/auth-firebase/index.ts",
  "providers/db-firebase/index.ts",
  "providers/db-firebase/rtdb-paths.ts",
  "providers/email-resend/index.ts",
  "providers/firebase-client/index.ts",
  "providers/payment-razorpay/index.ts",
  "providers/shipping-shiprocket/index.ts",
  "providers/storage-firebase/index.ts",
  "providers/storage-firebase/client.ts",
  // features
  "features/about/index.ts",
  "features/account/index.ts",
  "features/account/server.ts",
  "features/admin/index.ts",
  "features/admin/server.ts",
  "features/auctions/index.ts",
  "features/auctions/server.ts",
  "features/auth/server.ts",
  "features/auth/schemas/index.ts",
  "features/before-after/index.ts",
  "features/before-after/server.ts",
  "features/blog/index.ts",
  "features/blog/server.ts",
  "features/cart/server.ts",
  "features/cart/schemas/index.ts",
  "features/categories/index.ts",
  "features/categories/server.ts",
  "features/checkout/server.ts",
  "features/checkout/schemas/index.ts",
  "features/cms/index.ts",
  "features/collections/index.ts",
  "features/collections/server.ts",
  "features/consultation/index.ts",
  "features/consultation/server.ts",
  "features/contact/index.ts",
  "features/contact/server.ts",
  "features/copilot/index.ts",
  "features/corporate/index.ts",
  "features/corporate/server.ts",
  "features/cron/index.ts",
  "features/events/index.ts",
  "features/events/server.ts",
  "features/faq/index.ts",
  "features/faq/server.ts",
  "features/filters/index.ts",
  "features/forms/index.ts",
  "features/homepage/index.ts",
  "features/homepage/server.ts",
  "features/layout/index.ts",
  "features/loyalty/index.ts",
  "features/loyalty/server.ts",
  "features/media/index.ts",
  "features/media/server.ts",
  "features/orders/index.ts",
  "features/orders/server.ts",
  "features/payments/index.ts",
  "features/payments/server.ts",
  "features/pre-orders/index.ts",
  "features/pre-orders/server.ts",
  "features/products/index.ts",
  "features/products/server.ts",
  "features/promotions/index.ts",
  "features/promotions/server.ts",
  "features/reviews/index.ts",
  "features/reviews/server.ts",
  "features/search/index.ts",
  "features/search/server.ts",
  "features/seller/index.ts",
  "features/seller/server.ts",
  "features/stores/index.ts",
  "features/stores/server.ts",
  "features/whatsapp-bot/index.ts",
  "features/whatsapp-bot/server.ts",
  "features/wishlist/index.ts",
  "features/wishlist/server.ts",
];

// Process each file and collect
const byFile = {}; // file -> [symbol]
const symToFile = {}; // symbol -> first file that defines it

for (const file of FILES) {
  const exports = extractExports(file);
  const unique = [];
  for (const [sym, src] of Object.entries(exports)) {
    if (!symToFile[sym]) {
      symToFile[sym] = file;
      unique.push(sym);
    }
    // else: duplicate, skip
  }
  if (unique.length > 0) {
    byFile[file] = unique;
  }
}

// Output as JS that can be used to build index.ts
console.log(JSON.stringify(byFile, null, 2));
