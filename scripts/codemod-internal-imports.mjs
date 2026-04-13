import fs from "fs";
import path from "path";

const rootDir = path.resolve("d:/proj/appkit");
const srcDir = path.join(rootDir, "src");

const internalRoots = {
  contracts: "contracts",
  core: "core",
  http: "http",
  errors: "errors",
  utils: "utils",
  validation: "validation",
  tokens: "tokens",
  next: "next",
  react: "react",
  ui: "ui",
  security: "security",
  seo: "seo",
  monitoring: "monitoring",
  instrumentation: "instrumentation",
  "style/tailwind": "style/tailwind",
  "style/vanilla": "style/vanilla",
  "providers/db-firebase": "providers/db-firebase",
  "providers/auth-firebase": "providers/auth-firebase",
  "providers/email-resend": "providers/email-resend",
  "providers/storage-firebase": "providers/storage-firebase",
  "providers/payment-razorpay": "providers/payment-razorpay",
  "providers/shipping-shiprocket": "providers/shipping-shiprocket",
  "features/layout": "features/layout",
  "features/forms": "features/forms",
  "features/filters": "features/filters",
  "features/media": "features/media",
  "features/auth": "features/auth",
  "features/account": "features/account",
  "features/admin": "features/admin",
  "features/cms": "features/cms",
  "features/about": "features/about",
  "features/blog": "features/blog",
  "features/cart": "features/cart",
  "features/contact": "features/contact",
  "features/copilot": "features/copilot",
  "features/categories": "features/categories",
  "features/checkout": "features/checkout",
  "features/collections": "features/collections",
  "features/consultation": "features/consultation",
  "features/corporate": "features/corporate",
  "features/events": "features/events",
  "features/faq": "features/faq",
  "features/homepage": "features/homepage",
  "features/loyalty": "features/loyalty",
  "features/orders": "features/orders",
  "features/payments": "features/payments",
  "features/products": "features/products",
  "features/promotions": "features/promotions",
  "features/reviews": "features/reviews",
  "features/search": "features/search",
  "features/seller": "features/seller",
  "features/stores": "features/stores",
  "features/wishlist": "features/wishlist",
  "features/auctions": "features/auctions",
  "features/pre-orders": "features/pre-orders",
  "features/before-after": "features/before-after",
  "features/whatsapp-bot": "features/whatsapp-bot",
  cli: "cli",
  seed: "seed",
};

const rootKeys = Object.keys(internalRoots).sort((a, b) => b.length - a.length);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function rewriteSpecifier(filePath, specifier) {
  if (!specifier.startsWith("@mohasinac/")) return specifier;
  if (specifier.startsWith("@mohasinac/sievejs")) return specifier;
  if (specifier.startsWith("@mohasinac/appkit")) return specifier;

  const rest = specifier.slice("@mohasinac/".length);
  const key = rootKeys.find((k) => rest === k || rest.startsWith(`${k}/`));
  if (!key) return specifier;

  const subPath = rest === key ? "" : rest.slice(key.length + 1);
  const targetBase = path.join(srcDir, internalRoots[key]);
  const targetAbs = subPath ? path.join(targetBase, subPath) : targetBase;

  let rel = path.relative(path.dirname(filePath), targetAbs);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return toPosix(rel);
}

function normalizeRelativeJsSpecifier(filePath, specifier) {
  if (
    !filePath ||
    (!specifier.startsWith("./") && !specifier.startsWith("../"))
  ) {
    return specifier;
  }
  if (!specifier.endsWith(".js")) {
    return specifier;
  }
  return specifier.slice(0, -3);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      walk(full, files);
    } else if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const importFromRe = /(from\s+["'])(@mohasinac\/[^"']+)(["'])/g;
const dynamicImportRe = /(import\(\s*["'])(@mohasinac\/[^"']+)(["']\s*\))/g;
const relativeFromJsRe = /(from\s+["'])(\.\.?\/[^"']+\.js)(["'])/g;
const relativeDynamicJsRe = /(import\(\s*["'])(\.\.?\/[^"']+\.js)(["']\s*\))/g;

let touchedFiles = 0;
let rewrites = 0;

for (const filePath of walk(srcDir)) {
  const before = fs.readFileSync(filePath, "utf8");
  let after = before.replace(importFromRe, (m, a, spec, c) => {
    const next = rewriteSpecifier(filePath, spec);
    if (next !== spec) rewrites += 1;
    return `${a}${next}${c}`;
  });

  after = after.replace(dynamicImportRe, (m, a, spec, c) => {
    const next = rewriteSpecifier(filePath, spec);
    if (next !== spec) rewrites += 1;
    return `${a}${next}${c}`;
  });

  after = after.replace(relativeFromJsRe, (m, a, spec, c) => {
    const next = normalizeRelativeJsSpecifier(filePath, spec);
    if (next !== spec) rewrites += 1;
    return `${a}${next}${c}`;
  });

  after = after.replace(relativeDynamicJsRe, (m, a, spec, c) => {
    const next = normalizeRelativeJsSpecifier(filePath, spec);
    if (next !== spec) rewrites += 1;
    return `${a}${next}${c}`;
  });

  if (after !== before) {
    fs.writeFileSync(filePath, after);
    touchedFiles += 1;
  }
}

console.log(
  `Updated ${touchedFiles} files with ${rewrites} rewritten imports.`,
);
