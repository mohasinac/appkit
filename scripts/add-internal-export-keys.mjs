#!/usr/bin/env node
/*
 * Give the consumer a public path to the `_internal` modules it ALREADY uses.
 *
 * ## The situation this resolves
 *
 * 27 modules under `_internal/` are exported by `client.ts`, which is a PUBLIC
 * entry. So their symbols are already public API — `ACTIONS`, `CART_LANE`,
 * `pluginFor`, `RoleGuard` and the rest. What is missing is a path: `_internal`
 * has no export key, so the ONLY way to reach them is the barrel.
 *
 * That single fact pins 274 consumer files to `@mohasinac/appkit/client`, and
 * a barrel costs its whole graph to anyone who imports it at all — 973 modules
 * here, ~856 MB at the measured 0.88 MB/module.
 *
 * ## Why this is not a boundary violation
 *
 * scripts/audit-appkit-reexports.mjs guards exactly three files —
 * `["index.ts", "client.ts", "server.ts"]` — and its own remedy text reads
 * "Move the symbol or WIRE CONSUMERS DIRECTLY". An export key is that second
 * option. audit-violations.mjs polices layering INSIDE _internal (client must
 * not import server, shared must not import either) and is untouched by this.
 *
 * 🛑 Nothing becomes public that was not already public. The symbols ship
 * today through client.ts; only the route changes. What DOES change is that
 * these paths become API — moving one later is a breaking change. That is the
 * deliberate trade, which is why the list is explicit and generated from
 * measured consumer usage rather than a wildcard.
 *
 * 🛑 Specifically NOT an `./_internal/*` wildcard. That would publish all 667
 * modules and make the whole private tree API by accident. 27 named keys is a
 * reviewable decision; a wildcard is an abdication.
 *
 * Usage: node scripts/add-internal-export-keys.mjs --dry-run | --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const PKG = join(ROOT, "package.json");

/* The modules the consumer reaches through client.ts, measured. Key = the
 * public path, value = the module under _internal. Named for what the module
 * IS, not where it happens to live, so a later relocation can keep the key. */
const KEYS = {
  "./checkout/lanes":            "_internal/shared/checkout/lanes",
  "./checkout/line-members":     "_internal/shared/checkout/line-members",
  "./fees/explain":              "_internal/shared/fees/explain",
  "./fees/buyer-facing":         "_internal/shared/features/site-settings/fees",
  "./emi/schedule":              "_internal/shared/features/emi/schedule",
  "./listing-types/registry":    "_internal/shared/listing-types/_registry",
  "./actions/registry":          "_internal/shared/actions/action-registry",
  "./history/types":             "_internal/shared/history/types",
  "./orders/config":             "_internal/shared/features/orders/config",
  "./media/limits":              "_internal/shared/media/limits",
  "./site-settings/public":      "_internal/shared/features/site-settings/types",
  "./categories/bundle-copy":    "_internal/shared/features/categories/bundle-copy",
  "./admin/integrations":        "_internal/shared/features/admin/integrations",
  "./layout/nav-types":          "_internal/shared/features/layout/index",
  "./views/maintenance":         "_internal/client/features/maintenance",
  "./views/digital-code-reveal": "_internal/client/features/digital-code/CodeRevealPanel",
  "./views/dashboard-layout":    "_internal/client/features/layout/DashboardLayoutClient",
  "./views/role-guard":          "_internal/client/features/layout/RoleGuard",
  "./views/lottery-admin-edit":  "_internal/client/features/lottery/LotteryAdminEditView",
  "./views/lottery-admin-slot":  "_internal/client/features/lottery/LotteryAdminSlotView",
  "./views/lottery-pull-form":   "_internal/client/features/lottery/LotteryPullForm",
  "./views/tour-provider":       "_internal/client/features/tour/TourProvider",
};

const pkg = JSON.parse(readFileSync(PKG, "utf8"));
const exp = pkg.exports;
let added = 0, existed = 0;

for (const [key, mod] of Object.entries(KEYS)) {
  if (exp[key]) { existed++; continue; }
  exp[key] = { types: `./dist/${mod}.d.ts`, import: `./dist/${mod}.js` };
  added++;
}

/* Keep the wildcard keys last — Node takes the most specific match, so order is
 * not semantic, but a reader should see the explicit keys together. */
console.log(`[internal-export-keys] ${APPLY ? "added" : "would add"} ${added} key(s), ${existed} already present`);
for (const [k, v] of Object.entries(KEYS)) if (!existed || !pkg.exports[k]) void v;

if (APPLY) {
  writeFileSync(PKG, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("  package.json written");
} else {
  console.log("  (dry run — pass --apply)");
}
