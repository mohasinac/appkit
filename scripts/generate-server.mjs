/**
 * Generates src/server.ts with all server-safe named exports.
 * Excludes browser-only providers (firebase-client, storage-firebase/client).
 * Run: node scripts/generate-server.mjs
 */
import {
  readFileSync,
  existsSync,
  statSync,
  writeFileSync,
  readdirSync,
} from "fs";
import { resolve, dirname, join, relative } from "path";

const SRC = resolve("src");

function absPath(rel) {
  return join(SRC, rel.replace(/^\.\//, ""));
}

function resolveRel(fromFile, sub) {
  if (!sub.startsWith(".")) return null;
  const dir = dirname(absPath(fromFile));
  const candidates = [
    resolve(dir, sub),
    resolve(dir, sub + ".ts"),
    resolve(dir, sub + ".tsx"),
    resolve(dir, sub + "/index.ts"),
    resolve(dir, sub + "/index.tsx"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && !statSync(c).isDirectory()) {
      return relative(SRC, c).replace(/\\/g, "/");
    }
  }
  return null;
}

function getDirectExports(relFile) {
  const filePath = absPath(relFile);
  if (!existsSync(filePath) || statSync(filePath).isDirectory())
    return { values: [], types: [] };
  const text = readFileSync(filePath, "utf8");
  const values = new Set();
  const types = new Set();

  for (const m of text.matchAll(
    /^export\s+(?:default\s+)?(?:abstract\s+)?(?:declare\s+)?(?:async\s+)?(?:(?!type\b))(class|function|const|let|var|enum)\s+(\w+)/gm,
  )) {
    values.add(m[2]);
  }
  for (const m of text.matchAll(
    /^export\s+(?:declare\s+)?(?:type|interface)\s+(\w+)/gm,
  )) {
    types.add(m[1]);
  }
  for (const m of text.matchAll(
    /^export\s+(?:type\s+)?\{([^}]+)\}(?:\s+from\s+['"][^'"]+['"])?/gm,
  )) {
    const isTypeBlock = /^export\s+type\s+\{/.test(m[0]);
    for (const raw of m[1].split(",")) {
      const trimmedRaw = raw.trim().replace(/^type\s+/, "");
      const parts = trimmedRaw.split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      const isType = isTypeBlock || /^\s*type\s+/.test(raw);
      if (name && /^\w+$/.test(name) && name !== "default") {
        if (isType) types.add(name);
        else values.add(name);
      }
    }
  }

  for (const m of text.matchAll(
    /^export\s+\*\s+(?:as\s+\w+\s+)?from\s+['"]([^'"]+)['"]/gm,
  )) {
    const resolved = resolveRel(relFile, m[1]);
    if (resolved) {
      const sub = getDirectExports(resolved);
      sub.values.forEach((v) => values.add(v));
      sub.types.forEach((t) => types.add(t));
    }
  }

  return { values: [...values].sort(), types: [...types].sort() };
}

const FILES = [
  // ─── tier 0 ───────────────────────────────────────────────────────────────
  "tokens/index.ts",
  // ─── tier 1 UI ────────────────────────────────────────────────────────────
  "ui/index.ts",
  // ─── react ────────────────────────────────────────────────────────────────
  "react/index.ts",
  // ─── shared utilities ─────────────────────────────────────────────────────
  "values/index.ts",
  "utils/index.ts",
  "constants/index.ts",
  "contracts/index.ts",
  "validation/index.ts",
  "errors/index.ts",
  "seo/index.ts",
  "cli/index.ts",
  // ─── core ─────────────────────────────────────────────────────────────────
  "core/index.ts",
  // ─── infrastructure ───────────────────────────────────────────────────────
  "security/index.ts",
  "repositories/index.ts",
  "seed/index.ts",
  "monitoring/index.ts",
  "instrumentation/index.ts",
  "http/index.ts",
  // ─── next helpers ─────────────────────────────────────────────────────────
  "next/index.ts",
  // ─── style ────────────────────────────────────────────────────────────────
  "style/tailwind/index.ts",
  "style/vanilla/index.ts",
  // ─── server providers only (firebase-client + storage/client are browser-only) ──
  "providers/auth-firebase/index.ts",
  "providers/db-firebase/index.ts",
  "providers/db-firebase/rtdb-paths.ts",
  "providers/email-resend/index.ts",
  "providers/payment-razorpay/index.ts",
  "providers/shipping-shiprocket/index.ts",
  "providers/storage-firebase/index.ts",
  // ─── features ─────────────────────────────────────────────────────────────
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

// Auto-add all features/*/schemas/index.ts that exist
const featuresDir = join(SRC, "features");
for (const feat of readdirSync(featuresDir)) {
  const schemaIndex = `features/${feat}/schemas/index.ts`;
  if (existsSync(absPath(schemaIndex)) && !FILES.includes(schemaIndex)) {
    FILES.push(schemaIndex);
  }
}

const seen = new Set();
const sections = [];

for (const file of FILES) {
  const { values, types } = getDirectExports(file);
  const srcPath = "./" + file.replace(/\.tsx?$/, "");

  const newValues = values.filter((v) => !seen.has(v));
  const newTypes = types.filter((t) => !seen.has(t));

  newValues.forEach((v) => seen.add(v));
  newTypes.forEach((t) => seen.add(t));

  if (newValues.length === 0 && newTypes.length === 0) {
    sections.push(`// (no new exports from ${srcPath})`);
    continue;
  }

  const lines = [];
  if (newValues.length > 0) {
    lines.push(`export { ${newValues.join(", ")} } from "${srcPath}";`);
  }
  if (newTypes.length > 0) {
    lines.push(`export type { ${newTypes.join(", ")} } from "${srcPath}";`);
  }
  sections.push(lines.join("\n"));
}

const output = [
  "// AUTO-GENERATED — server-safe barrel (no browser-only providers)",
  "// Run: node scripts/generate-server.mjs",
  "",
  sections.join("\n"),
].join("\n");

writeFileSync(join(SRC, "server.ts"), output);
console.log("Written src/server.ts");
console.log("Total server exports:", seen.size);
