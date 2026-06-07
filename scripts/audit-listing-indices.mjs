#!/usr/bin/env node
/**
 * audit-listing-indices.mjs — listing-page Firestore composite-index coverage.
 *
 * For every listing page in the monorepo (admin + seller DataListingView configs
 * + repository-driven public/user views), derive the (collection, filter-fields,
 * sort-field) tuples those toolbars produce at runtime, then check whether
 * `appkit/firebase/base/firestore.indexes.json` declares a matching composite
 * index. Missing indices throw FAILED_PRECONDITION in prod (Root Cause #2).
 *
 * Reports four blocking classes:
 *   [MISSING_INDEX]         composite index that no existing entry satisfies
 *                            (prefix match) — emits paste-ready JSON snippet
 *   [FILTER_FIELD_ORPHAN]   a buildFilters field never appears in any index
 *   [SORT_FIELD_ORPHAN]     a sortOptions value never appears in any index
 *   [QUERY_UNSATISFIABLE]   range filter on field A + sort on field B
 *                            (Firestore: range field must equal orderBy field)
 *
 * And two informational classes:
 *   [UNUSED_INDEX]          declared index that no listing query needs
 *                            (note: server jobs / fan-out NOT scanned)
 *   [PAGE_SUMMARY]          per-view derived (collection, filters, sorts)
 *                            (suppress with --summary-only)
 *
 * Baseline drift — only regressions block (count > BASELINE). Drive toward 0
 * by adding missing indices to firestore.indexes.json. Run after editing any
 * DataListingView config or repository .list() call site.
 *
 * Exits 0 clean / 1 on any regression above BASELINE.
 *
 * KEEP IN SYNC WITH:
 *   - appkit/src/_internal/server/jobs/core/listingProcessor.ts (LISTERS)
 *   - appkit/src/constants/api-endpoints.ts (ADMIN_ENDPOINTS / SELLER_ENDPOINTS)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");
const INDEXES_PATH = join(APPKIT_ROOT, "firebase", "base", "firestore.indexes.json");

const SUMMARY_ONLY = process.argv.includes("--summary-only");

// Baseline drift — only regressions block. Drive toward 0 as indices are added.
// Initial: 91 blocking issues (61 missing + 30 orphan/unsat) across 39 views.
const BASELINE = 91;

// ───────────────────────────────────────────────────────────────────────────────
// 1. Endpoint → collection map  (mirror of LISTERS in listingProcessor.ts)
// ───────────────────────────────────────────────────────────────────────────────
//
// Adding a new admin endpoint? Add a row here too, or it falls through to
// "unknown-collection" and the audit cannot derive indices for that view.
const ENDPOINT_TO_COLLECTION = {
  // Pure mappings
  "ADMIN_ENDPOINTS.PRODUCTS":               { collection: "products",            implicit: [] },
  "ADMIN_ENDPOINTS.ORDERS":                 { collection: "orders",              implicit: [] },
  "ADMIN_ENDPOINTS.USERS":                  { collection: "users",               implicit: [] },
  "ADMIN_ENDPOINTS.REVIEWS":                { collection: "reviews",             implicit: [] },
  "ADMIN_ENDPOINTS.BIDS":                   { collection: "bids",                implicit: [] },
  "ADMIN_ENDPOINTS.BLOG":                   { collection: "blogPosts",           implicit: [] },
  "ADMIN_ENDPOINTS.BUNDLES":                { collection: "bundles",             implicit: [] },
  "ADMIN_ENDPOINTS.CATEGORIES":             { collection: "categories",          implicit: ["categoryType==category"] },
  "ADMIN_ENDPOINTS.FAQS":                   { collection: "faqs",                implicit: [] },
  "ADMIN_ENDPOINTS.STORES":                 { collection: "stores",              implicit: [] },
  "ADMIN_ENDPOINTS.PAYOUTS":                { collection: "payouts",             implicit: [] },
  "ADMIN_ENDPOINTS.EVENTS":                 { collection: "events",              implicit: [] },
  "ADMIN_ENDPOINTS.COUPONS":                { collection: "coupons",             implicit: [] },
  "ADMIN_ENDPOINTS.SECTIONS":               { collection: "homepageSections",    implicit: [] },
  "ADMIN_ENDPOINTS.NEWSLETTER":             { collection: "newsletter",          implicit: [] },
  "ADMIN_ENDPOINTS.CONTACT_SUBMISSIONS":    { collection: "contactSubmissions",  implicit: [] },
  "ADMIN_ENDPOINTS.SESSIONS":               { collection: "sessions",            implicit: [] },
  "ADMIN_ENDPOINTS.ADMIN_EVENT_ENTRIES":    { collection: "eventEntries",        implicit: [] },
  "ADMIN_ENDPOINTS.ADMIN_NOTIFICATIONS":    { collection: "notifications",       implicit: [] },
  "ADMIN_ENDPOINTS.ADMIN_CARTS":            { collection: "carts",               implicit: [] },
  "ADMIN_ENDPOINTS.ADMIN_WISHLISTS":        { collection: "wishlists",           implicit: [] },
  "ADMIN_ENDPOINTS.ADMIN_HISTORY":          { collection: "history",             implicit: [] },
  "ADMIN_ENDPOINTS.FEATURE_FLAGS":          { collection: "featureFlags",        implicit: [] },
  "ADMIN_ENDPOINTS.STORE_ADDRESSES":        { collection: "addresses",           implicit: ["ownerType==store"] },
  "ADMIN_ENDPOINTS.CAROUSEL":               { collection: "carouselSlides",      implicit: [] },
  "ADMIN_ENDPOINTS.NAVIGATION":             { collection: "navigation",          implicit: [] },
  "ADMIN_ENDPOINTS.PRODUCT_FEATURES":       { collection: "productFeatures",     implicit: [] },
  "ADMIN_ENDPOINTS.TEAM":                   { collection: "users",               implicit: ["role==employee"] },
  "ADMIN_ENDPOINTS.SUPPORT_TICKETS":        { collection: "supportTickets",      implicit: [] },
  "ADMIN_ENDPOINTS.SCAMMERS":               { collection: "scammers",            implicit: [] },
  "ADMIN_ENDPOINTS.ADDRESSES":              { collection: "addresses",           implicit: [] },
  "ADMIN_ENDPOINTS.GROUPED_LISTINGS":       { collection: "groupedListings",     implicit: [] },
  "ADMIN_ENDPOINTS.ADS":                    { collection: "ads",                 implicit: [] },
  // Implicit categoryType filters
  "ADMIN_ENDPOINTS.BRANDS":                 { collection: "categories",          implicit: ["categoryType==brand"] },
  "ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES":  { collection: "categories",          implicit: ["categoryType==sublisting"] },
};

// repository variable name → collection  (for repository-driven views/actions)
const REPO_TO_COLLECTION = {
  productRepository:           "products",
  categoriesRepository:        "categories",
  storeRepository:             "stores",
  reviewRepository:            "reviews",
  orderRepository:             "orders",
  couponsRepository:           "coupons",
  bidRepository:               "bids",
  payoutRepository:            "payouts",
  blogRepository:              "blogPosts",
  eventRepository:             "events",
  eventEntryRepository:        "eventEntries",
  faqsRepository:              "faqs",
  notificationRepository:      "notifications",
  scammerRepository:           "scammers",
  homepageSectionsRepository:  "homepageSections",
  productFeaturesRepository:   "productFeatures",
  productTemplateRepository:   "productTemplates",
  userRepository:              "users",
  addressesRepository:         "addresses",
  bundlesRepository:           "bundles",
  classifiedRepository:        "classifiedListings",
  digitalCodesRepository:      "digitalCodes",
  liveItemsRepository:         "liveItems",
  prizeDrawsRepository:        "prizeDraws",
  conversationsRepository:     "conversations",
};

// ───────────────────────────────────────────────────────────────────────────────
// 2. File walker
// ───────────────────────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "__tests__", "__mocks__"]);

function walk(dir, exts, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, files);
    else if (exts.includes(extname(entry.name))) files.push(full);
  }
  return files;
}

// ───────────────────────────────────────────────────────────────────────────────
// 3. Parsing helpers
// ───────────────────────────────────────────────────────────────────────────────
const RE_LISTING_CFG_START = /(?:const|let)\s+\w+\s*:\s*ListingViewConfig\b[\s\S]*?=\s*\{/;
const RE_FILTER_KEYS  = /filterKeys\s*:\s*\[([^\]]*)\]/;
const RE_DEFAULT_SORT = /defaultSort\s*:\s*["'`]([^"'`]+)["'`]/;
const RE_SORT_OPTIONS = /sortOptions\s*:\s*\[([\s\S]*?)\n\s*\]/;
const RE_SORT_VAL     = /value\s*:\s*["'`]([^"'`]+)["'`]/g;
const RE_ENDPOINT     = /endpoint\s*:\s*([A-Z_]+_ENDPOINTS\.[A-Z_]+)/;
const RE_BUILD_FILTERS = /buildFilters\s*:\s*\([^)]*\)\s*=>\s*([\s\S]*?)(?=\n\s{0,4}[a-zA-Z_]+\s*:|\n\s{0,2}\}\s*satisfies|\n\s{0,2}\}\s*;?)/;
// Sieve clause: <field> <op> <value> — field can contain dots
const RE_SIEVE_CLAUSE = /([\w.]+)\s*(==|!=|>=|<=|>|<|_=)\s*/g;
const RE_STRING_LITERAL = /["'`]([^"'`]*?)["'`]/g;

const RE_REPO_LIST = /(\w+Repository)\.(?:list|listAll|listStores|listForEvent|listByStore)\s*\(\s*\{([\s\S]*?)\}\s*[,)]/g;
const RE_FILTERS_PROP = /\bfilters\s*:\s*["'`]([^"'`]*?)["'`]/;
const RE_SORTS_PROP   = /\bsorts\s*:\s*["'`]([^"'`]*?)["'`]/;

const RANGE_OPS = new Set([">", "<", ">=", "<=", "!="]);

function sliceBalanced(src, startIdx) {
  // Return the slice from `{` matching at startIdx through its matched `}`.
  let depth = 0;
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return src.slice(startIdx);
}

function extractDataListingConfig(content) {
  const startMatch = content.match(RE_LISTING_CFG_START);
  if (!startMatch) return null;
  const braceIdx = content.indexOf("{", startMatch.index + startMatch[0].length - 1);
  if (braceIdx === -1) return null;
  const slice = sliceBalanced(content, braceIdx);

  const cfg = {};
  const fk = slice.match(RE_FILTER_KEYS);
  cfg.filterKeys = fk ? [...fk[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map(m => m[1]) : [];
  const ds = slice.match(RE_DEFAULT_SORT);
  cfg.defaultSort = ds ? ds[1] : null;
  const so = slice.match(RE_SORT_OPTIONS);
  cfg.sortValues = so ? [...so[1].matchAll(RE_SORT_VAL)].map(m => m[1]) : [];
  const ep = slice.match(RE_ENDPOINT);
  cfg.endpoint = ep ? ep[1] : null;
  const bf = slice.match(RE_BUILD_FILTERS);
  cfg.buildFiltersBody = bf ? bf[1] : "";
  return cfg;
}

function extractSieveFieldsFromBody(body) {
  // Pull every string literal, then extract Sieve field references from each.
  const out = [];
  for (const m of body.matchAll(RE_STRING_LITERAL)) {
    const literal = m[1];
    for (const cm of literal.matchAll(RE_SIEVE_CLAUSE)) {
      out.push({ field: cm[1], op: cm[2], isRange: RANGE_OPS.has(cm[2]) });
    }
  }
  return out;
}

function parseSieveString(s) {
  const out = [];
  for (const clause of s.split(",").map(t => t.trim()).filter(Boolean)) {
    const m = clause.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<|_=|=)\s*(.*)$/);
    if (!m) continue;
    out.push({ field: m[1], op: m[2], isRange: RANGE_OPS.has(m[2]) });
  }
  return out;
}

function parseSortToken(token) {
  if (!token) return null;
  const t = token.trim();
  if (!t) return null;
  if (t === "__name__" || t === "-__name__") return null;
  const desc = t.startsWith("-");
  return { field: desc ? t.slice(1) : t, order: desc ? "DESCENDING" : "ASCENDING" };
}

// ───────────────────────────────────────────────────────────────────────────────
// 4. Required-index derivation
// ───────────────────────────────────────────────────────────────────────────────
function deriveRequiredIndices(collection, filterClauses, sortField, sortOrder, sourceRef) {
  // Returns { required: [{collection, fields[]}], issues: [{rule, message}] }
  const required = [];
  const issues = [];
  const equality = filterClauses.filter(c => c.op === "==");
  const range = filterClauses.filter(c => RANGE_OPS.has(c.op));
  const sortStripped = sortField;

  if (range.length > 0 && range[0].field !== sortStripped) {
    issues.push({
      rule: "QUERY_UNSATISFIABLE",
      message: `range filter on \`${range[0].field}\` while sorting by \`${sortStripped}\` (Firestore: range field must equal orderBy field)`,
      source: sourceRef,
    });
    return { required, issues };
  }

  if (filterClauses.length === 0) return { required, issues };
  if (filterClauses.length === 1 && equality[0]?.field === sortStripped) return { required, issues };

  // dedupe equality fields, alpha-sort for canonical order
  const equalityFields = [...new Set(equality.map(c => c.field))].sort();
  const rangeFields = [...new Set(range.map(c => c.field))].filter(f => !equalityFields.includes(f));

  const fields = [
    ...equalityFields.map(f => ({ fieldPath: f, order: "ASCENDING" })),
    ...rangeFields.map(f => ({ fieldPath: f, order: "ASCENDING" })),
  ];
  // Append sort field unless it's already the trailing range field
  if (rangeFields[0] !== sortStripped) {
    fields.push({ fieldPath: sortStripped, order: sortOrder });
  } else if (sortOrder !== "ASCENDING") {
    // override the trailing field's order to match sort direction
    fields[fields.length - 1].order = sortOrder;
  }
  if (fields.length < 2) return { required, issues };
  required.push({ collection, fields });
  return { required, issues };
}

function canonicalIndexKey(idx) {
  return `${idx.collection || idx.collectionGroup}|${(idx.fields).map(f => `${f.fieldPath}:${f.order}`).join("|")}`;
}

// ───────────────────────────────────────────────────────────────────────────────
// 5. Index loading + prefix matching
// ───────────────────────────────────────────────────────────────────────────────
function loadIndexes() {
  const raw = JSON.parse(readFileSync(INDEXES_PATH, "utf8"));
  const byCollection = new Map();
  const collectionGroupCount = (raw.indexes || []).filter(i => i.queryScope === "COLLECTION_GROUP").length;
  for (const idx of raw.indexes || []) {
    if (idx.queryScope !== "COLLECTION") continue;
    const col = idx.collectionGroup;
    if (!byCollection.has(col)) byCollection.set(col, []);
    byCollection.get(col).push({ fields: idx.fields, hit: false, raw: idx });
  }
  return { byCollection, collectionGroupCount };
}

function prefixMatch(required, existingList) {
  // existing satisfies required iff existing.length >= required.length AND
  // every required[i] matches existing[i] fieldPath+order.
  outer: for (const ex of existingList) {
    if (ex.fields.length < required.fields.length) continue;
    for (let i = 0; i < required.fields.length; i++) {
      if (ex.fields[i].fieldPath !== required.fields[i].fieldPath) continue outer;
      if (ex.fields[i].order !== required.fields[i].order) continue outer;
    }
    ex.hit = true;
    return true;
  }
  return false;
}

// ───────────────────────────────────────────────────────────────────────────────
// 6. Scan: DataListingView configs
// ───────────────────────────────────────────────────────────────────────────────
const pageEntries = [];      // { ref, collection, filterClauses, sortValues, defaultSort }
const informational = [];    // { rule, message, ref }

function scanDataListingConfigs() {
  const adminDir = join(APPKIT_ROOT, "src", "features", "admin", "components");
  const sellerDir = join(APPKIT_ROOT, "src", "features", "seller", "components");
  const files = [...walk(adminDir, [".tsx"]), ...walk(sellerDir, [".tsx"])];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (!content.includes("ListingViewConfig<")) continue;
    const cfg = extractDataListingConfig(content);
    if (!cfg || !cfg.endpoint) continue;
    const ep = ENDPOINT_TO_COLLECTION[cfg.endpoint];
    if (!ep) {
      informational.push({
        rule: "UNKNOWN_ENDPOINT",
        message: `endpoint ${cfg.endpoint} not in ENDPOINT_TO_COLLECTION — add to audit-listing-indices.mjs to derive indices`,
        ref: relative(REPO_ROOT, file).replace(/\\/g, "/"),
      });
      continue;
    }
    const fieldsFromBuild = extractSieveFieldsFromBody(cfg.buildFiltersBody);
    const implicitFields = ep.implicit.flatMap(parseSieveString);
    const filterClauses = [...implicitFields, ...fieldsFromBuild];
    const sortValues = new Set(cfg.sortValues);
    if (cfg.defaultSort) sortValues.add(cfg.defaultSort);
    pageEntries.push({
      ref: relative(REPO_ROOT, file).replace(/\\/g, "/"),
      collection: ep.collection,
      filterClauses,
      sortValues: [...sortValues],
      kind: "dlv",
    });
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 7. Scan: repository-driven .list() call sites
// ───────────────────────────────────────────────────────────────────────────────
function scanRepoListCalls() {
  // appkit features + consumer src (API routes + actions both call repo.list())
  const roots = [
    join(APPKIT_ROOT, "src", "features"),
    join(REPO_ROOT, "src"),
  ];
  const files = roots.flatMap(r => walk(r, [".ts", ".tsx"])).filter(f => {
    const base = f.replace(/\\/g, "/");
    if (base.endsWith(".test.ts") || base.endsWith(".test.tsx")) return false;
    if (base.includes("/repository/")) return false; // skip repos themselves
    if (base.endsWith("/repository.ts")) return false;
    return true;
  });
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const ref = relative(REPO_ROOT, file).replace(/\\/g, "/");
    let m;
    while ((m = RE_REPO_LIST.exec(content)) !== null) {
      const [, repoName, body] = m;
      const collection = REPO_TO_COLLECTION[repoName];
      if (!collection) {
        informational.push({
          rule: "UNKNOWN_REPO",
          message: `${repoName} not in REPO_TO_COLLECTION — add to audit-listing-indices.mjs`,
          ref: `${ref}:${lineNumOf(content, m.index)}`,
        });
        continue;
      }
      const fm = body.match(RE_FILTERS_PROP);
      const sm = body.match(RE_SORTS_PROP);
      if (!fm && !sm) continue;
      if (/\bfilters\s*:\s*[a-zA-Z_]/.test(body) && !fm) {
        informational.push({
          rule: "FILTER_UNRESOLVED",
          message: `filters prop is a dynamic expression (not a string literal) — skipping derivation`,
          ref: `${ref}:${lineNumOf(content, m.index)}`,
        });
      }
      const filterClauses = fm ? parseSieveString(fm[1]) : [];
      const sortValues = sm ? sm[1].split(",").map(s => s.trim()).filter(Boolean) : [];
      pageEntries.push({
        ref: `${ref}:${lineNumOf(content, m.index)}`,
        collection,
        filterClauses,
        sortValues,
        kind: "repo",
      });
    }
  }
}

function lineNumOf(src, offset) {
  let n = 1;
  for (let i = 0; i < offset && i < src.length; i++) if (src[i] === "\n") n++;
  return n;
}

// ───────────────────────────────────────────────────────────────────────────────
// 8. Run
// ───────────────────────────────────────────────────────────────────────────────
scanDataListingConfigs();
scanRepoListCalls();

const { byCollection: indexBuckets, collectionGroupCount } = loadIndexes();

// Build set of (collection|field) referenced by ANY existing index, for orphan checks
const indexedFields = new Set();
for (const [col, list] of indexBuckets.entries()) {
  for (const idx of list) {
    for (const f of idx.fields) indexedFields.add(`${col}|${f.fieldPath}`);
  }
}

// Derive required indices per page
const requiredByKey = new Map();  // key → { collection, fields[], refs:Set }
const queryIssues = [];
const filterOrphans = new Map();  // collection|field → Set<ref>
const sortOrphans = new Map();    // collection|field → Set<ref>

function addOrphan(map, key, ref) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(ref);
}

for (const page of pageEntries) {
  // Check filter-field orphans
  for (const c of page.filterClauses) {
    if (!indexedFields.has(`${page.collection}|${c.field}`)) {
      addOrphan(filterOrphans, `${page.collection}|${c.field}`, page.ref);
    }
  }
  // Check sort-field orphans + derive required
  for (const sortVal of page.sortValues) {
    const parsed = parseSortToken(sortVal);
    if (!parsed) continue;
    if (!indexedFields.has(`${page.collection}|${parsed.field}`)) {
      addOrphan(sortOrphans, `${page.collection}|${parsed.field}`, page.ref);
    }
    // Required-index derivation: for each filter-combo state, try the sort
    // (we use the full filter set — over-approximation, safe direction)
    const { required, issues } = deriveRequiredIndices(
      page.collection, page.filterClauses, parsed.field, parsed.order, page.ref,
    );
    for (const r of required) {
      const key = canonicalIndexKey(r);
      if (!requiredByKey.has(key)) requiredByKey.set(key, { ...r, refs: new Set() });
      requiredByKey.get(key).refs.add(page.ref);
    }
    for (const issue of issues) queryIssues.push(issue);
  }
  // Also: no-filter case (user clears filters → just the sort, possibly against implicit)
  // Already handled when filterClauses is small.
}

// Match required vs existing
const missing = [];
for (const req of requiredByKey.values()) {
  const existing = indexBuckets.get(req.collection) || [];
  if (!prefixMatch(req, existing)) {
    missing.push(req);
  }
}

// Unused indices
const unused = [];
for (const [col, list] of indexBuckets.entries()) {
  for (const idx of list) {
    if (!idx.hit) unused.push({ collection: col, fields: idx.fields, raw: idx.raw });
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 9. Report
// ───────────────────────────────────────────────────────────────────────────────
const blockingCount = missing.length + filterOrphans.size + sortOrphans.size + queryIssues.length;

function indexToJson(idx) {
  return JSON.stringify({
    collectionGroup: idx.collection,
    queryScope: "COLLECTION",
    fields: idx.fields,
  }, null, 2);
}

const out = [];
out.push(`audit-listing-indices: ${blockingCount} blocking, ${unused.length} unused indices, ${pageEntries.length} views scanned.`);
out.push("");

if (missing.length > 0) {
  out.push(`[MISSING_INDEX] ${missing.length} composite indices missing`);
  for (const m of missing) {
    const refs = [...m.refs].slice(0, 3).join(", ") + (m.refs.size > 3 ? ` (+${m.refs.size - 3} more)` : "");
    out.push(`  collection=${m.collection}  fields=[${m.fields.map(f => `${f.fieldPath} ${f.order}`).join(", ")}]`);
    out.push(`    referenced by: ${refs}`);
    out.push(`    Add to appkit/firebase/base/firestore.indexes.json:`);
    out.push(indexToJson(m).split("\n").map(l => `      ${l}`).join("\n"));
  }
  out.push("");
}

if (filterOrphans.size > 0) {
  out.push(`[FILTER_FIELD_ORPHAN] ${filterOrphans.size} filter fields never appear in any index`);
  for (const [key, refs] of filterOrphans) {
    const [col, field] = key.split("|");
    out.push(`  collection=${col}  field=${field}`);
    out.push(`    referenced by: ${[...refs].slice(0, 3).join(", ")}`);
  }
  out.push("");
}

if (sortOrphans.size > 0) {
  out.push(`[SORT_FIELD_ORPHAN] ${sortOrphans.size} sort fields never appear in any index`);
  for (const [key, refs] of sortOrphans) {
    const [col, field] = key.split("|");
    out.push(`  collection=${col}  field=${field}`);
    out.push(`    referenced by: ${[...refs].slice(0, 3).join(", ")}`);
  }
  out.push("");
}

if (queryIssues.length > 0) {
  out.push(`[QUERY_UNSATISFIABLE] ${queryIssues.length} queries Firestore can never satisfy`);
  for (const q of queryIssues) {
    out.push(`  ${q.source}`);
    out.push(`    ${q.message}`);
  }
  out.push("");
}

// Informational
if (unused.length > 0) {
  out.push(`— informational —`);
  out.push(`[UNUSED_INDEX] ${unused.length} indices not requested by any listing page`);
  out.push(`  (NOTE: server jobs / analytics / fan-out queries are NOT scanned by this audit;`);
  out.push(`   review against server/jobs/* and functions/* triggers before deleting.)`);
  if (!SUMMARY_ONLY) {
    for (const u of unused.slice(0, 50)) {
      out.push(`  ${u.collection}: [${u.fields.map(f => `${f.fieldPath} ${f.order}`).join(", ")}]`);
    }
    if (unused.length > 50) out.push(`  ... (+${unused.length - 50} more — pass without --summary-only to see all)`);
  }
  out.push("");
}

if (collectionGroupCount > 0) {
  out.push(`(${collectionGroupCount} COLLECTION_GROUP indices excluded from matching — v1 non-goal.)`);
  out.push("");
}

if (informational.length > 0 && !SUMMARY_ONLY) {
  out.push(`[INFO] ${informational.length} informational notes`);
  for (const i of informational.slice(0, 30)) {
    out.push(`  [${i.rule}] ${i.ref}`);
    out.push(`    ${i.message}`);
  }
  if (informational.length > 30) out.push(`  ... (+${informational.length - 30} more)`);
  out.push("");
}

if (!SUMMARY_ONLY) {
  out.push(`[PAGE_SUMMARY] ${pageEntries.length} views scanned`);
  for (const p of pageEntries) {
    const fields = p.filterClauses.map(c => `${c.field}${c.op}`).join(",") || "-";
    const sorts = p.sortValues.join(",") || "-";
    out.push(`  ${p.ref}  coll=${p.collection}  filters=[${fields}]  sorts=[${sorts}]`);
  }
  out.push("");
}

if (blockingCount === 0) {
  console.log("audit-listing-indices: clean ✓");
  if (unused.length > 0 || informational.length > 0) {
    process.stderr.write(out.join("\n") + "\n");
  }
  process.exit(0);
}

if (blockingCount <= BASELINE) {
  console.log(
    `audit-listing-indices: ${blockingCount} blocking (baseline ${BASELINE} — ${BASELINE - blockingCount} improved). No regression.`,
  );
  if (!SUMMARY_ONLY) process.stderr.write(out.join("\n") + "\n");
  process.exit(0);
}

console.error(
  `audit-listing-indices: ${blockingCount} blocking (baseline ${BASELINE} — regression of ${blockingCount - BASELINE}).\n`,
);
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
