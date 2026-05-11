#!/usr/bin/env node
/**
 * sieve-audit — public listing API auditor for LetItRip / appkit consumers.
 *
 * Hits every public listing endpoint with sieve params (`f`, `s`, `p`, `ps`,
 * `q`) and verifies they actually change the result. Also probes auth-gated
 * `/api/admin/*`, `/api/store/*`, `/api/user/*` routes for anonymous 401.
 *
 * Reference values (slugs, codes, ids) are pulled from the LetItRip seed data
 * — see appkit/src/seed/*. Keep this map in sync if seed IDs change.
 *
 * Usage (consumer project root):
 *   npx appkit-sieve-audit --base https://www.letitrip.in
 *   npx appkit-sieve-audit --base http://localhost:3000 --only products,stores
 *   npx appkit-sieve-audit --json > report.json
 *
 * Exit code: 0 = all checks passed, 1 = at least one failure.
 */

const args = process.argv.slice(2);
function arg(name, fallback = undefined) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const BASE = String(arg("base", "https://www.letitrip.in")).replace(/\/$/, "");
const ONLY = arg("only");
const JSON_OUT = arg("json") === true;
const VERBOSE = arg("verbose") === true;
const TIMEOUT_MS = Number(arg("timeout", 20000));

const ONLY_SET = ONLY && typeof ONLY === "string"
  ? new Set(ONLY.split(",").map((s) => s.trim()))
  : null;

// ---------------------------------------------------------------------------
// Reference values pulled from appkit/src/seed/*.ts
// ---------------------------------------------------------------------------
const SEED = {
  brands: ["brand-pokemon", "brand-hot-wheels", "brand-bandai", "brand-takara-tomy"],
  stores: [
    "store-letitrip-official",
    "store-pokemon-palace",
    "store-cardgame-hub",
    "store-diecast-depot",
    "store-beyblade-arena",
    "store-tokyo-toys-india",
    "store-gundam-galaxy",
    "store-vintage-vault",
  ],
  categories: [
    "category-action-figures",
    "category-trading-cards",
    "category-diecast-vehicles",
    "category-spinning-tops",
    "category-model-kits",
    "category-vintage-rare",
  ],
  faqCategories: ["Shipping", "Returns", "Payments", "Auctions", "Pre-orders"],
  couponCodes: ["WELCOME10", "POKEMON25", "FREESHIP999", "BLADER20", "VIP2026"],
  searchTerms: { products: "pokemon", blog: "pokemon", events: "tournament", stores: "pokemon" },
  // sample IDs known to exist (used by detail/nested probes)
  sampleStoreSlug: "store-pokemon-palace",
  sampleProductId: "product-pokemon-151-etb",
  sampleBlogId: "blog-how-to-spot-fake-pokemon-cards-authentication",
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function build(path, params = {}) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

async function fetchJson(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: "follow" });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return {
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      bytes: text.length,
      json,
      isHtml: !json && /^\s*<!DOCTYPE/i.test(text),
    };
  } catch (err) {
    return { status: 0, error: String(err && err.message || err), bytes: 0, json: null };
  } finally {
    clearTimeout(t);
  }
}

// Extract item list and pagination meta from the variety of shapes the API uses.
function extract(json) {
  if (!json || typeof json !== "object") return { items: [], meta: {} };
  const data = json.data ?? json;
  let items = [];
  if (Array.isArray(data)) items = data;
  else if (Array.isArray(data.items)) items = data.items;
  else if (Array.isArray(data.posts)) items = data.posts;
  else if (Array.isArray(data.reviews)) items = data.reviews;
  else if (Array.isArray(data.events)) items = data.events;
  const meta = {
    total: data && typeof data === "object" ? data.total ?? null : null,
    page: data && typeof data === "object" ? data.page ?? null : null,
    pageSize: data && typeof data === "object" ? data.pageSize ?? null : null,
    totalPages: data && typeof data === "object" ? data.totalPages ?? null : null,
    hasMore: data && typeof data === "object" ? data.hasMore ?? null : null,
  };
  const ids = items.map((x) => x && (x.id ?? x.slug ?? x._id) || "?").filter(Boolean);
  return { items, ids, meta };
}

function idsKey(ids) { return ids.slice(0, 10).join("|"); }

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
const results = [];
function record(r) {
  results.push(r);
  if (!JSON_OUT) {
    const status = r.pass ? "PASS" : r.skip ? "SKIP" : "FAIL";
    const colour = r.pass ? "\x1b[32m" : r.skip ? "\x1b[33m" : "\x1b[31m";
    const reset = "\x1b[0m";
    const detail = r.detail ? `  — ${r.detail}` : "";
    console.log(`  ${colour}${status}${reset} ${r.collection}/${r.name}${detail}`);
    if (VERBOSE && r.url) console.log(`        ${r.url}`);
  }
}

async function runSuite(collection, suite) {
  if (ONLY_SET && !ONLY_SET.has(collection)) return;
  if (!JSON_OUT) console.log(`\n▌ ${collection}`);
  await suite();
}

// Pull a baseline for diff-based tests. Returns { ids, meta, raw }.
async function baseline(collection, path, params = {}) {
  const url = build(path, params);
  const res = await fetchJson(url);
  const ex = extract(res.json);
  return { url, res, ex };
}

function expectDifferent(collection, name, baseIds, variantIds, url, why) {
  if (!variantIds || variantIds.length === 0) {
    record({ collection, name, pass: false, detail: `${why} returned 0 items`, url });
    return;
  }
  if (idsKey(baseIds) === idsKey(variantIds)) {
    record({ collection, name, pass: false, detail: `${why} produced identical IDs as base — param ignored`, url });
  } else {
    record({ collection, name, pass: true, detail: `${why} changed result set`, url });
  }
}

function expectMeta(collection, name, want, got, url) {
  const ok = Object.entries(want).every(([k, v]) => got[k] === v);
  record({
    collection, name, pass: ok, url,
    detail: ok ? `meta=${JSON.stringify(want)}` : `wanted ${JSON.stringify(want)}, got ${JSON.stringify(got)}`,
  });
}

function expectStatus(collection, name, want, res, url) {
  const ok = res.status === want;
  record({
    collection, name, pass: ok, url,
    detail: ok ? `status=${want}` : `wanted status ${want}, got ${res.status}${res.error ? ` (${res.error})` : ""}`,
  });
}

// ---------------------------------------------------------------------------
// Suites — one per collection
// ---------------------------------------------------------------------------
async function suiteProducts() {
  const path = "/api/products";
  const base = await baseline("products", path, { ps: 5 });
  record({ collection: "products", name: "base", pass: base.res.status === 200 && base.ex.items.length > 0, url: base.url, detail: `total=${base.ex.meta.total} items=${base.ex.items.length}` });

  const ps1 = await baseline("products", path, { ps: 1 });
  expectMeta("products", "pageSize=1 honored", { pageSize: 1 }, ps1.ex.meta, ps1.url);

  const p2 = await baseline("products", path, { ps: 5, p: 2 });
  expectDifferent("products", "pagination p=2", base.ex.ids, p2.ex.ids, p2.url, "page=2");

  const sAsc = await baseline("products", path, { ps: 5, s: "price" });
  const sDesc = await baseline("products", path, { ps: 5, s: "-price" });
  expectDifferent("products", "sort price asc vs desc", sAsc.ex.ids, sDesc.ex.ids, sDesc.url, "sort=-price");

  const fAuc = await baseline("products", path, { ps: 5, f: "isAuction==true" });
  const fNon = await baseline("products", path, { ps: 5, f: "isAuction==false" });
  expectDifferent("products", "filter isAuction", fAuc.ex.ids, fNon.ex.ids, fNon.url, "isAuction toggle");

  const fBrand = await baseline("products", path, { ps: 5, f: `brandSlug==${SEED.brands[0]}` });
  expectDifferent("products", `filter brandSlug=${SEED.brands[0]}`, base.ex.ids, fBrand.ex.ids, fBrand.url, "brand filter");

  const fCat = await baseline("products", path, { ps: 5, f: `categorySlug==${SEED.categories[0]}` });
  expectDifferent("products", `filter categorySlug=${SEED.categories[0]}`, base.ex.ids, fCat.ex.ids, fCat.url, "category filter");

  const fStore = await baseline("products", path, { ps: 5, f: `storeId==${SEED.stores[1]}` });
  expectDifferent("products", `filter storeId=${SEED.stores[1]}`, base.ex.ids, fStore.ex.ids, fStore.url, "storeId filter");

  const q = await baseline("products", path, { ps: 5, q: SEED.searchTerms.products });
  expectDifferent("products", `q=${SEED.searchTerms.products}`, base.ex.ids, q.ex.ids, q.url, "full-text search");
}

async function suiteCategories() {
  const path = "/api/categories";
  const base = await baseline("categories", path, { ps: 5 });
  record({ collection: "categories", name: "base", pass: base.res.status === 200 && base.ex.items.length > 0, url: base.url, detail: `items=${base.ex.items.length}` });

  const ps1 = await baseline("categories", path, { ps: 1 });
  const ok = ps1.ex.items.length === 1;
  record({ collection: "categories", name: "ps=1 honored", pass: ok, url: ps1.url, detail: ok ? "items=1" : `items=${ps1.ex.items.length}` });

  const sAsc = await baseline("categories", path, { ps: 5, s: "name" });
  const sDesc = await baseline("categories", path, { ps: 5, s: "-name" });
  expectDifferent("categories", "sort name asc vs desc", sAsc.ex.ids, sDesc.ex.ids, sDesc.url, "sort=-name");

  const t1 = await baseline("categories", path, { ps: 10, f: "tier==1" });
  const t3 = await baseline("categories", path, { ps: 10, f: "tier==3" });
  expectDifferent("categories", "filter tier=1 vs tier=3", t1.ex.ids, t3.ex.ids, t3.url, "tier filter");

  const fFeat = await baseline("categories", path, { ps: 5, f: "isFeatured==true" });
  expectDifferent("categories", "filter isFeatured=true", base.ex.ids, fFeat.ex.ids, fFeat.url, "isFeatured filter");
}

async function suiteStores() {
  const path = "/api/stores";
  const base = await baseline("stores", path, { ps: 5 });
  record({ collection: "stores", name: "base", pass: base.res.status === 200 && base.ex.items.length > 0, url: base.url, detail: `total=${base.ex.meta.total} items=${base.ex.items.length}` });

  const ps1 = await baseline("stores", path, { ps: 1 });
  expectMeta("stores", "pageSize=1 honored", { pageSize: 1 }, ps1.ex.meta, ps1.url);

  const sAsc = await baseline("stores", path, { ps: 5, s: "storeName" });
  const sDesc = await baseline("stores", path, { ps: 5, s: "-storeName" });
  expectDifferent("stores", "sort storeName asc vs desc", sAsc.ex.ids, sDesc.ex.ids, sDesc.url, "sort=-storeName");

  const fT = await baseline("stores", path, { ps: 10, f: "isVerified==true" });
  const fF = await baseline("stores", path, { ps: 10, f: "isVerified==false" });
  expectDifferent("stores", "filter isVerified true vs false", fT.ex.ids, fF.ex.ids, fF.url, "isVerified toggle");

  const q = await baseline("stores", path, { ps: 5, q: SEED.searchTerms.stores });
  // Search may return 0 items legitimately, just check status is 200
  record({ collection: "stores", name: `q=${SEED.searchTerms.stores}`, pass: q.res.status === 200, url: q.url, detail: `items=${q.ex.items.length}` });
}

async function suiteBlog() {
  const path = "/api/blog";
  const base = await baseline("blog", path, { ps: 5 });
  record({ collection: "blog", name: "base", pass: base.res.status === 200 && base.ex.items.length > 0, url: base.url, detail: `items=${base.ex.items.length}` });

  const ps1 = await baseline("blog", path, { ps: 1 });
  const ok = ps1.ex.items.length === 1;
  record({ collection: "blog", name: "ps=1 honored", pass: ok, url: ps1.url, detail: ok ? "items=1" : `items=${ps1.ex.items.length}` });

  const sAsc = await baseline("blog", path, { ps: 5, s: "title" });
  const sDesc = await baseline("blog", path, { ps: 5, s: "-title" });
  expectDifferent("blog", "sort title asc vs desc", sAsc.ex.ids, sDesc.ex.ids, sDesc.url, "sort=-title");

  const fFeat = await baseline("blog", path, { ps: 5, f: "isFeatured==true" });
  expectDifferent("blog", "filter isFeatured=true", base.ex.ids, fFeat.ex.ids, fFeat.url, "isFeatured filter");

  const fCat = await baseline("blog", path, { ps: 5, f: "category==Authentication" });
  expectDifferent("blog", "filter category=Authentication", base.ex.ids, fCat.ex.ids, fCat.url, "category filter");

  const q = await baseline("blog", path, { ps: 5, q: SEED.searchTerms.blog });
  expectDifferent("blog", `q=${SEED.searchTerms.blog}`, base.ex.ids, q.ex.ids, q.url, "full-text search");
}

async function suiteEvents() {
  const path = "/api/events";
  const base = await baseline("events", path, { ps: 5 });
  record({ collection: "events", name: "base", pass: base.res.status === 200 && base.ex.items.length > 0, url: base.url, detail: `items=${base.ex.items.length}` });

  const sAsc = await baseline("events", path, { ps: 5, s: "startsAt" });
  const sDesc = await baseline("events", path, { ps: 5, s: "-startsAt" });
  expectDifferent("events", "sort startsAt asc vs desc", sAsc.ex.ids, sDesc.ex.ids, sDesc.url, "sort=-startsAt");

  const fAct = await baseline("events", path, { ps: 5, f: "status==ACTIVE" });
  const fEnd = await baseline("events", path, { ps: 5, f: "status==ENDED" });
  expectDifferent("events", "filter status ACTIVE vs ENDED", fAct.ex.ids, fEnd.ex.ids, fEnd.url, "status filter");

  const fType = await baseline("events", path, { ps: 5, f: "type==TOURNAMENT" });
  expectDifferent("events", "filter type=TOURNAMENT", base.ex.ids, fType.ex.ids, fType.url, "type filter");

  const q = await baseline("events", path, { ps: 5, q: SEED.searchTerms.events });
  record({ collection: "events", name: `q=${SEED.searchTerms.events}`, pass: q.res.status === 200, url: q.url, detail: `status=${q.res.status} items=${q.ex.items.length}` });
}

async function suiteFaqs() {
  const path = "/api/faqs";
  const base = await baseline("faqs", path, { ps: 5 });
  record({ collection: "faqs", name: "base", pass: base.res.status === 200 && base.ex.items.length > 0, url: base.url, detail: `total=${base.ex.meta.total} items=${base.ex.items.length}` });

  const ps1 = await baseline("faqs", path, { ps: 1 });
  const ok = ps1.ex.items.length === 1;
  record({ collection: "faqs", name: "ps=1 honored", pass: ok, url: ps1.url, detail: ok ? "items=1" : `items=${ps1.ex.items.length}` });

  const fPinned = await baseline("faqs", path, { ps: 5, f: "isPinned==true" });
  expectDifferent("faqs", "filter isPinned=true", base.ex.ids, fPinned.ex.ids, fPinned.url, "isPinned filter");

  const fCat = await baseline("faqs", path, { ps: 10, f: `category==${SEED.faqCategories[0]}` });
  expectDifferent("faqs", `filter category=${SEED.faqCategories[0]}`, base.ex.ids, fCat.ex.ids, fCat.url, "category filter");

  const fHome = await baseline("faqs", path, { ps: 5, f: "showOnHomepage==true" });
  expectDifferent("faqs", "filter showOnHomepage=true", base.ex.ids, fHome.ex.ids, fHome.url, "homepage filter");
}

async function suitePreOrders() {
  const path = "/api/pre-orders";
  const base = await baseline("pre-orders", path, { ps: 5 });
  record({ collection: "pre-orders", name: "base", pass: base.res.status === 200, url: base.url, detail: `items=${base.ex.items.length} total=${base.ex.meta.total}` });

  if (base.ex.items.length === 0) {
    record({ collection: "pre-orders", name: "has seeded data", pass: false, url: base.url, detail: "no items returned despite seed data" });
    return;
  }
  const ps1 = await baseline("pre-orders", path, { ps: 1 });
  expectMeta("pre-orders", "pageSize=1 honored", { pageSize: 1 }, ps1.ex.meta, ps1.url);

  const sAsc = await baseline("pre-orders", path, { ps: 5, s: "price" });
  const sDesc = await baseline("pre-orders", path, { ps: 5, s: "-price" });
  expectDifferent("pre-orders", "sort price asc vs desc", sAsc.ex.ids, sDesc.ex.ids, sDesc.url, "sort=-price");
}

async function suiteAuctions() {
  // No /api/auctions route exists at the moment — check that the listing-equivalent
  // works through /api/products with isAuction filter, AND probe the explicit path.
  const explicit = await baseline("auctions", "/api/auctions", { ps: 5 });
  const looksLikeHtml = explicit.res.isHtml || (explicit.res.contentType || "").includes("text/html");
  record({
    collection: "auctions",
    name: "/api/auctions returns JSON (not page HTML)",
    pass: !looksLikeHtml && explicit.res.status === 200 && explicit.ex.items.length >= 0,
    url: explicit.url,
    detail: looksLikeHtml ? "App Router served HTML page — no API route" : `status=${explicit.res.status} items=${explicit.ex.items.length}`,
  });

  // Fallback: products filtered by isAuction
  const proxied = await baseline("auctions", "/api/products", { ps: 5, f: "isAuction==true" });
  record({
    collection: "auctions",
    name: "products?f=isAuction==true returns auctions",
    pass: proxied.res.status === 200 && proxied.ex.items.length > 0 && proxied.ex.items.every((it) => it.isAuction === true || String(it.id || "").startsWith("auction-")),
    url: proxied.url,
    detail: `items=${proxied.ex.items.length}`,
  });
}

async function suiteSearch() {
  const path = "/api/search";
  const q = await baseline("search", path, { q: SEED.searchTerms.products });
  record({ collection: "search", name: "q=pokemon returns results", pass: q.res.status === 200 && q.ex.items.length > 0, url: q.url, detail: `items=${q.ex.items.length}` });
}

async function suiteNested() {
  const slug = SEED.sampleStoreSlug;
  const products = await baseline("nested:stores", `/api/stores/${slug}/products`, { ps: 5 });
  record({ collection: "nested:stores", name: `${slug}/products`, pass: products.res.status === 200 && products.ex.items.length > 0, url: products.url, detail: `items=${products.ex.items.length}` });

  const reviews = await baseline("nested:stores", `/api/stores/${slug}/reviews`, { ps: 5 });
  record({ collection: "nested:stores", name: `${slug}/reviews`, pass: reviews.res.status === 200, url: reviews.url, detail: `status=${reviews.res.status}` });

  const auctions = await baseline("nested:stores", `/api/stores/${slug}/auctions`, { ps: 5 });
  record({ collection: "nested:stores", name: `${slug}/auctions`, pass: auctions.res.status === 200, url: auctions.url, detail: `status=${auctions.res.status}` });
}

async function suiteAuthGates() {
  const gated = [
    "/api/admin/users",
    "/api/admin/stores",
    "/api/admin/orders",
    "/api/admin/reviews",
    "/api/admin/bids",
    "/api/admin/blog",
    "/api/admin/payouts",
    "/api/admin/sessions",
    "/api/store/products",
    "/api/store/orders",
    "/api/store/coupons",
    "/api/store/reviews",
    "/api/store/payouts",
    "/api/store/addresses",
    "/api/store/bids",
    "/api/user/orders",
    "/api/user/wishlist",
    "/api/user/profile",
    "/api/user/addresses",
    "/api/user/offers",
    "/api/notifications",
  ];
  for (const path of gated) {
    const url = build(path);
    const res = await fetchJson(url);
    const is401 = res.status === 401 || res.status === 403;
    const isLeak = res.status === 200 && res.json && (res.json.data || res.json.items);
    record({
      collection: "auth-gates",
      name: path,
      pass: is401,
      url,
      detail: is401 ? `gated (status ${res.status})` : isLeak ? "🚨 LEAK — returned data without auth" : `unexpected status ${res.status}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!JSON_OUT) {
    console.log(`\nsieve-audit → ${BASE}`);
    console.log(`time=${new Date().toISOString()}`);
    if (ONLY_SET) console.log(`only=${[...ONLY_SET].join(",")}`);
  }

  await runSuite("products", suiteProducts);
  await runSuite("categories", suiteCategories);
  await runSuite("stores", suiteStores);
  await runSuite("blog", suiteBlog);
  await runSuite("events", suiteEvents);
  await runSuite("faqs", suiteFaqs);
  await runSuite("pre-orders", suitePreOrders);
  await runSuite("auctions", suiteAuctions);
  await runSuite("search", suiteSearch);
  await runSuite("nested:stores", suiteNested);
  await runSuite("auth-gates", suiteAuthGates);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass && !r.skip).length;

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ base: BASE, total, passed, failed, results }, null, 2));
  } else {
    console.log(`\n──────────────────────────────────────────────`);
    console.log(`Summary:  ${passed}/${total} passed   (${failed} failed)`);
    console.log(`──────────────────────────────────────────────`);

    // Per-collection roll-up
    const byCol = new Map();
    for (const r of results) {
      const c = byCol.get(r.collection) || { pass: 0, fail: 0 };
      if (r.pass) c.pass++; else c.fail++;
      byCol.set(r.collection, c);
    }
    for (const [col, c] of byCol) {
      const mark = c.fail === 0 ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
      console.log(`  ${mark} ${col.padEnd(20)} ${c.pass}/${c.pass + c.fail}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("sieve-audit crashed:", err);
  process.exit(2);
});
