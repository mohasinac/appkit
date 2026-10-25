#!/usr/bin/env node
/*
 * Give the consumer a public path to every `_internal` module it ALREADY
 * imports through a barrel — DERIVED from the tree, not from a hand list.
 *
 * ## Why this supersedes the hardcoded KEYS in add-internal-export-keys.mjs
 *
 * That script's own header argues the right principle: a named key is "a
 * reviewable decision; a wildcard is an abdication", because `./_internal/*`
 * would publish all 667 modules and make the whole private tree API by
 * accident. That stands.
 *
 * What does not scale is maintaining the list BY HAND. It began at 22 keys,
 * grew to 27 within a day, and the measured requirement is 41 more for the bare
 * barrel alone and 123 for `/server`. A hand list at that size is the grep this
 * repo has repeatedly been bitten by trusting (Root Cause #84: the backlog you
 * enumerate by hand is smaller than the one the rule finds — the `/client`
 * sweep's own blocker list read 36 files when the truth was 4).
 *
 * So the LIST is derived and the POLICY is unchanged: only modules a consumer
 * file provably imports through a barrel today get a key. Nothing becomes
 * public that was not already public — these symbols ship through index.ts /
 * client.ts / server.ts right now and only the route changes. Run it again
 * after a sweep and it adds nothing, because nothing imports the barrel any
 * more; that self-limiting property is the point.
 *
 * ## Why it is worth doing at all
 *
 * The module closure is a UNION: one file importing a barrel pulls that
 * barrel's whole graph, so a barrel costs its full size until its importer
 * count reaches ZERO. `_internal` having no export key is the single fact that
 * pins those importers in place. Measured on the `/client` sweep: 450 sites
 * repointed, closure 2,631 -> 2,120, 511 modules gone at ~0.88 MB of build peak
 * each.
 *
 * ## The naming scheme, and why a key is not just the module path
 *
 * A key names what the module IS, so a later relocation inside `_internal` can
 * keep the key and stay non-breaking:
 *
 *   _internal/shared/listing-types/feature-flags  ->  ./listing-types/feature-flags
 *   _internal/server/features/audit-log/actions   ->  ./audit-log/actions
 *   _internal/shared/features/site-settings/fees  ->  ./site-settings/fees
 *
 * i.e. drop the `_internal/{shared,server,client}/` tier and a leading
 * `features/`. On collision — two tiers owning the same tail, or a key already
 * taken by a real public module — it falls back to the tier-qualified form
 * (`./server/audit-log/actions`) rather than silently overwriting. An
 * overwritten key would repoint an existing public path at a different module,
 * which is the dual-instance hazard in Root Cause #19.
 *
 * Usage:
 *   node appkit/scripts/derive-internal-export-keys.mjs --dry-run
 *   node appkit/scripts/derive-internal-export-keys.mjs --apply
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const APPKIT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const ROOT = resolve(APPKIT, "..");
const APPLY = process.argv.includes("--apply");

const { maskComments } = await import(
  pathToFileURL(join(APPKIT, "scripts/lib/mask-comments.mjs")).href
);

/* Every surface a consumer can import by barrel. The bare specifier resolves to
 * server-entry under import/default/react-server and client-entry under
 * browser/worker, and server-entry is `export *` from index PLUS its own
 * explicit blocks — so all three together are the bare barrel's real surface. */
const ENTRIES = [
  { spec: "@mohasinac/appkit", files: ["src/server-entry.ts", "src/client-entry.ts", "src/index.ts"] },
  { spec: "@mohasinac/appkit/client", files: ["src/client.ts"] },
  { spec: "@mohasinac/appkit/server", files: ["src/server.ts"] },
];

const pkgPath = join(APPKIT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const exp = pkg.exports;

/* ── what already resolves ─────────────────────────────────────────────────── */
const exact = new Map();
const wild = [];
for (const [k, v] of Object.entries(exp)) {
  const t = typeof v === "string" ? v : (v?.import ?? v?.default);
  if (!t || !k.startsWith("./")) continue;
  if (k.includes("*")) {
    const [pre, post = ""] = k.slice(2).split("*");
    const [tPre, tPost = ""] = t.split("*");
    wild.push({ pre, post, tPre, tPost });
  } else exact.set(k.slice(2), t);
}
const fileFor = (cand) => {
  if (exact.has(cand)) return exact.get(cand);
  for (const w of wild) {
    if (!cand.startsWith(w.pre) || !cand.endsWith(w.post)) continue;
    const star = cand.slice(w.pre.length, cand.length - w.post.length);
    if (star) return w.tPre + star + w.tPost;
  }
  return null;
};
const resolves = (sub) =>
  [sub, `${sub}/index`].some((c) => {
    const f = fileFor(c);
    return f && existsSync(join(APPKIT, f));
  });

/*
 * The modules an existing key already TARGETS.
 *
 * 🛑 `resolves()` is the wrong question for an `_internal` module and asking it
 * produced duplicate keys. A key for `_internal/shared/fees/calculator` is
 * spelled `./fees/calculator` — the subpath deliberately does NOT contain
 * `_internal`, that being the whole point of naming a key for what the module
 * IS. So `resolves("_internal/shared/fees/calculator")` is false even though the
 * module is fully reachable, and six modules that already had a key were
 * re-proposed under tier-qualified aliases (`./shared/fees/calculator`). Two
 * public paths to one module is the dual-instance hazard of Root Cause #19
 * wearing a different hat: a consumer importing each gets two module records
 * under some resolver conditions.
 *
 * Reverse the map instead, and compare dist TARGETS.
 */
const alreadyKeyed = new Set();
for (const v of Object.values(exp)) {
  const t = typeof v === "string" ? v : (v?.import ?? v?.default);
  if (!t || t.includes("*") || !t.includes("/_internal/")) continue;
  alreadyKeyed.add(t.replace(/^\.\/dist\//, "").replace(/(\/index)?\.js$/, ""));
}

/* ── which _internal modules the consumer reaches through a barrel ─────────── */
function walk(d, o = []) {
  let es;
  try { es = readdirSync(d); } catch { return o; }
  for (const e of es) {
    const p = join(d, e);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) { if (e !== "node_modules" && e !== ".next") walk(p, o); }
    else if (/\.tsx?$/.test(p)) o.push(p);
  }
  return o;
}
const consumerFiles = walk(join(ROOT, "src"));
const needed = new Map(); // _internal module -> files that would be freed

for (const entry of ENTRIES) {
  const src = entry.files
    .map((f) => maskComments(readFileSync(join(APPKIT, f), "utf8")))
    .join("\n");
  const target = new Map();
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']\.\/([^"']+)["']/g)) {
    const mod = m[2].replace(/\.tsx?$/, "");
    for (const raw of m[1].split(",")) {
      const t = raw.trim().replace(/^type\s+/, "");
      if (!t) continue;
      const p = t.split(/\s+as\s+/).map((x) => x.trim());
      if (!target.has(p[1] || p[0])) target.set(p[1] || p[0], mod);
    }
  }
  const re = new RegExp(
    `^[ \\t]*(?:import|export)\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*["']${entry.spec.replace(/\//g, "\\/")}["'];?[ \\t]*$`,
    "gm",
  );
  for (const f of consumerFiles) {
    const s = maskComments(readFileSync(f, "utf8"));
    for (const m of s.matchAll(re)) {
      for (const raw of maskComments(m[1]).split(",")) {
        const t = raw.trim().replace(/^type\s+/, "");
        if (!t) continue;
        const mod = target.get(t.split(/\s+as\s+/)[0].trim());
        if (!mod || !mod.startsWith("_internal/")) continue;
        if (resolves(mod) || alreadyKeyed.has(mod.replace(/\/index$/, ""))) continue;
        if (!needed.has(mod)) needed.set(mod, new Set());
        needed.get(mod).add(f.slice(ROOT.length + 1).replace(/\\/g, "/"));
      }
    }
  }
}

/* ── name them ─────────────────────────────────────────────────────────────── */
function keyFor(mod, taken) {
  const m = /^_internal\/(shared|server|client)\/(.*)$/.exec(mod);
  const tier = m ? m[1] : "";
  /* Drop a trailing `/index`: the module `.../features/products/index` IS the
   * products module, so `./products` reads correctly and `./products/index`
   * reads like a file inside it. 13 keys were shaped that way. */
  let tail = (m ? m[2] : mod).replace(/^features\//, "").replace(/\/index$/, "");
  for (const cand of [`./${tail}`, `./${tier}/${tail}`, `./_internal/${mod.slice("_internal/".length)}`]) {
    if (!taken.has(cand) && !exp[cand]) return cand;
  }
  return null;
}

const taken = new Set();
const additions = [];
for (const [mod, files] of [...needed].sort((a, b) => b[1].size - a[1].size)) {
  const dist = existsSync(join(APPKIT, `dist/${mod}.js`)) ? `${mod}` : `${mod}/index`;
  if (!existsSync(join(APPKIT, `dist/${dist}.js`))) {
    console.log(`  !! no dist for ${mod} — skipped (build appkit first?)`);
    continue;
  }
  const key = keyFor(mod, taken);
  if (!key) { console.log(`  !! could not name ${mod} — skipped`); continue; }
  taken.add(key);
  additions.push({ key, dist, mod, freed: files.size });
}

console.log(
  `[derive-internal-export-keys] ${APPLY ? "adding" : "would add"} ${additions.length} key(s)` +
  ` for ${new Set(additions.flatMap((a) => [...(needed.get(a.mod) ?? [])])).size} consumer file(s)`,
);
for (const a of additions.slice(0, 200)) {
  console.log(`   ${String(a.freed).padStart(3)}f  ${a.key.padEnd(40)} -> ${a.mod}`);
}
if (additions.length > 200) console.log(`   … +${additions.length - 12} more`);

if (!APPLY) {
  console.log("  (dry run — pass --apply)");
} else {
  for (const a of additions) {
    exp[a.key] = { types: `./dist/${a.dist}.d.ts`, import: `./dist/${a.dist}.js` };
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log(`  package.json written — ${Object.keys(exp).length} total key(s)`);
}
