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
 * Strict-zero (2026-08-18, per user directive after the getRowHref/index
 * incident) — any MISSING_INDEX / FILTER_FIELD_ORPHAN / SORT_FIELD_ORPHAN /
 * QUERY_UNSATISFIABLE blocks the gate, not just regressions above a baseline.
 * Add missing indices to firestore.indexes.json to clear a failure. Run
 * after editing any DataListingView config or repository call site.
 *
 * Exits 0 clean / 1 on any blocking violation.
 *
 * KEEP IN SYNC WITH:
 *   - appkit/src/_internal/server/jobs/core/listingProcessor.ts (LISTERS)
 *   - appkit/src/constants/api-endpoints.ts (ADMIN_ENDPOINTS / SELLER_ENDPOINTS)
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APPKIT_ROOT, "..");
const INDEXES_PATH = join(APPKIT_ROOT, "firebase", "base", "firestore.indexes.json");

const SUMMARY_ONLY = process.argv.includes("--summary-only");

// Baseline drift — only regressions block. Drive toward 0 as indices are added.
// Initial: 91 blocking issues (61 missing + 30 orphan/unsat) across 39 views.
// LOCKED P4 (2026-06-08): all 91 → 0. Extracted 64 missing composite indices
// from audit output into firestore.indexes.json; updated audit to recognize
// Firestore's single-field auto-indexes (no composite needed when there are no filters).

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
  // Registered 2026-08-24 — both features shipped without an entry here, so
  // this audit reported them as UNKNOWN and blocked.
  "ADMIN_ENDPOINTS.AUDIT_LOG":              { collection: "adminAuditLog",       implicit: [] },
  "ADMIN_ENDPOINTS.OFFERS":                 { collection: "offers",              implicit: [] },
  "ADMIN_ENDPOINTS.BLOG":                   { collection: "blogPosts",           implicit: [] },
  // Bundles are a categoryType on `categories`, not a literal `bundles`
  // collection (SB-UNI-D — the literal collection is dead, zero indices).
  "ADMIN_ENDPOINTS.BUNDLES":                { collection: "categories",          implicit: ["categoryType==bundle"] },
  "ADMIN_ENDPOINTS.CATEGORIES":             { collection: "categories",          implicit: ["categoryType==category"] },
  "ADMIN_ENDPOINTS.FAQS":                   { collection: "faqs",                implicit: [] },
  "ADMIN_ENDPOINTS.STORES":                 { collection: "stores",              implicit: [] },
  "ADMIN_ENDPOINTS.PAYOUTS":                { collection: "payouts",             implicit: [] },
  "ADMIN_ENDPOINTS.EVENTS":                 { collection: "events",              implicit: [] },
  "ADMIN_ENDPOINTS.COUPONS":                { collection: "coupons",             implicit: [] },
  "ADMIN_ENDPOINTS.SECTIONS":               { collection: "homepageSections",    implicit: [] },
  // newsletterRepository actually targets newsletterSubscribers — the
  // literal `newsletter` collection is a dead duplicate, zero indices.
  "ADMIN_ENDPOINTS.NEWSLETTER":             { collection: "newsletterSubscribers", implicit: [] },
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
  // scammerRepository actually targets scammerProfiles — the literal
  // `scammers` collection is a dead duplicate, zero indices.
  "ADMIN_ENDPOINTS.SCAMMERS":               { collection: "scammerProfiles",     implicit: [] },
  "ADMIN_ENDPOINTS.ADDRESSES":              { collection: "addresses",           implicit: [] },
  "ADMIN_ENDPOINTS.GROUPED_LISTINGS":       { collection: "groupedListings",     implicit: [] },
  "ADMIN_ENDPOINTS.ADS":                    { collection: "ads",                 implicit: [] },
  // Implicit categoryType filters
  "ADMIN_ENDPOINTS.BRANDS":                 { collection: "categories",          implicit: ["categoryType==brand"] },
  "ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES":  { collection: "categories",          implicit: ["categoryType==sublisting"] },

  // SELLER_ENDPOINTS.* — previously entirely missing, so every Seller*View.tsx
  // was silently skipped as [UNKNOWN_ENDPOINT] (informational-only) instead
  // of being checked. This was the actual reason the productTitle/endsAt/
  // prizeDrawEndDate field-name bugs across 8 seller views went undetected.
  "SELLER_ENDPOINTS.PRODUCTS":              { collection: "products",            implicit: [] },
  "SELLER_ENDPOINTS.AUCTIONS":              { collection: "products",            implicit: [] },
  "SELLER_ENDPOINTS.COUPONS":               { collection: "coupons",             implicit: [] },
  "SELLER_ENDPOINTS.OFFERS":                { collection: "offers",              implicit: [] },
  "SELLER_ENDPOINTS.PAYOUTS":               { collection: "payouts",             implicit: [] },
  "SELLER_ENDPOINTS.ORDERS":                { collection: "orders",              implicit: [] },
  "SELLER_ENDPOINTS.GROUPED_LISTINGS":      { collection: "groupedListings",     implicit: [] },
  "SELLER_ENDPOINTS.PAYOUT_METHODS":        { collection: "payoutMethods",       implicit: [] },
  "SELLER_ENDPOINTS.SHIPPING_CONFIGS":      { collection: "shippingConfigs",     implicit: [] },
  "SELLER_ENDPOINTS.STORE_CATEGORIES":      { collection: "storeCategories",     implicit: [] },
  // Real collection is snake_case `product_templates` — the camelCase
  // `productTemplates` is a dead naming-bug duplicate, zero indices.
  "SELLER_ENDPOINTS.TEMPLATES":             { collection: "product_templates",   implicit: [] },
  "SELLER_ENDPOINTS.BUNDLES":               { collection: "categories",          implicit: ["categoryType==bundle"] },
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
  // Real collection is scammerProfiles — literal `scammers` is a dead
  // duplicate, zero indices.
  scammerRepository:           "scammerProfiles",
  homepageSectionsRepository:  "homepageSections",
  productFeaturesRepository:   "productFeatures",
  // Real collection is snake_case `product_templates` — camelCase
  // `productTemplates` is a dead naming-bug duplicate, zero indices.
  productTemplateRepository:   "product_templates",
  userRepository:              "users",
  adminAuditLogRepository:     "adminAuditLog",
  addressesRepository:         "addresses",
  // Previously UNKNOWN_REPO (informational-only, unscanned).
  newsletterRepository:        "newsletterSubscribers",
  contactSubmissionsRepository: "contactSubmissions",
  cartRepository:              "carts",
  shipmentsRepository:         "procurementShipments",
  testerChecklistItemRepository: "testerChecklistItems",
  testerChecklistResponseRepository: "testerChecklistResponses",
  // 2026-08-19 sweep — 23 previously-UNKNOWN_REPO entries closed. Every
  // collection name below was verified against the repository's own
  // `super(<CONSTANT>)` call + the constant's definition in the matching
  // schemas/firestore.ts (or schemas/rbac.ts), not guessed from the
  // repository's variable name.
  sessionRepository:           "sessions",
  carouselRepository:          "carouselSlides",
  jobsRepository:              "jobs",
  offerRepository:             "offers",
  // Singleton doc (id "global") — SiteSettingsRepository, no list-style
  // Sieve queries expected, mapped for completeness.
  siteSettingsRepository:      "siteSettings",
  // Singleton doc (id "dashboardRollup") — AnalyticsRollupRepository, no
  // list-style Sieve queries expected, mapped for completeness.
  analyticsRollupRepository:   "analytics",
  supportRepository:           "supportTickets",
  adminNotificationsRepository: "adminNotifications",
  customRolesRepository:       "customRoles",
  shipmentLotsRepository:      "shipmentLots",
  itemRequestsRepository:      "itemRequests",
  reportsRepository:           "reports",
  analyticsAlertsRepository:   "analyticsAlerts",
  analyticsCardsRepository:    "analyticsCards",
  storeCategoriesRepository:   "storeCategories",
  storeGoogleConfigRepository: "storeGoogleConfig",
  groupedListingsRepository:   "groupedListings",
  listingTemplatesRepository:  "listingTemplates",
  payoutMethodsRepository:     "payoutMethods",
  shippingConfigsRepository:   "shippingConfigs",
  catalogueRepository:         "catalogueItems",
  claimedCouponsRepository:    "claimedCoupons",
  // Not currently seen as UNKNOWN_REPO (no filters/sorts call site found
  // yet), but the same store-extensions/rbac repo families as the ones
  // above — mapped proactively so a future call site doesn't regress.
  roleOverridesRepository:     "roleOverrides",
  storeWhatsAppConfigRepository: "storeWhatsAppConfig",
  // classifiedRepository / digitalCodesRepository / liveItemsRepository /
  // prizeDrawsRepository / bundlesRepository removed — none of these exist
  // as real exports. classified/digital-code/live/prize-draw are listingType
  // values on the unified `products` collection (via productRepository);
  // bundles are a categoryType on `categories` (via categoriesRepository).
  // These 5 entries never matched any real call site.
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

// Method-name-agnostic: any `xRepository.someMethod({ ... })` call whose
// argument object literal carries `filters`/`sorts` string props is a query
// call site, regardless of the method name — this closes the coverage gap
// where inline/detail-page routes call custom repository methods (findMany,
// search, listPending, etc.) beyond the original list/listAll/... whitelist.
const RE_REPO_LIST = /(\w+Repository)\.(\w+)\s*\(\s*\{([\s\S]*?)\}\s*[,)]/g;
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

/**
 * A `sieveFilter(FIELD_CONST.NAME, SIEVE_OP.EQ, value)` call.
 *
 * 🛑 This is the builder form, and reading it is not optional.
 *
 * The extractor below used to see string literals ONLY. `AdminPrizeDrawsView`
 * returned the literal `"listingType==prize-draw"` until 2026-08-31, when it
 * adopted the typed builder — and this audit stopped seeing that clause at all,
 * so it could no longer tell whether the view's query needed a composite index.
 * It kept reporting "0 missing indices" on a query it had stopped reading.
 *
 * That is Recurrent Root Cause #84 exactly: adopting the better-typed API
 * removed the caller from the check. Every other view that migrates to
 * `sieveFilter` would have gone quiet the same way, silently, one at a time.
 */
const RE_SIEVE_BUILDER =
  /\bsieve(?:Filter|Sort)\s*\(\s*([A-Z_]+(?:_FIELDS)?\.[A-Z_0-9]+|["'`][\w.]+["'`])\s*,\s*(SIEVE_OP\.[A-Z_]+|["'`][^"'`]+["'`])/g;

/**
 * `SIEVE_OP.EQ` -> `==`. Mirrors `appkit/src/utils/sieve-builder.ts`; a member
 * this map does not know is skipped rather than guessed, because guessing the
 * operator is what decides whether a clause counts as a range — and a wrong
 * range reading produces a fabricated missing-index report.
 */
const SIEVE_OP_VALUES = {
  EQ: "==", NEQ: "!=", GT: ">", LT: "<", GTE: ">=", LTE: "<=",
  CONTAINS: "@=", STARTS: "_=", ENDS: "_-=",
  NOT_CONTAINS: "!@=", NOT_STARTS: "!_=", NOT_ENDS: "!_-=",
};

/**
 * `PRODUCT_FIELDS.LISTING_TYPE` -> `listingType`.
 *
 * Resolved by reading the constant maps rather than by transforming the member
 * name: `CATEGORY_SLUGS` is `categorySlugs`, but `SEO.SLUG` is `seo.slug` and
 * `ID` is `id`, and a SCREAMING_SNAKE -> camelCase transform gets the nested
 * ones wrong in a way that looks right.
 */
let FIELD_CONSTANT_MAP = null;

function loadFieldConstantMap() {
  if (FIELD_CONSTANT_MAP) return FIELD_CONSTANT_MAP;
  FIELD_CONSTANT_MAP = new Map();
  const sources = [
    join(APPKIT_ROOT, "src", "constants", "field-names.ts"),
  ];
  for (const file of sources) {
    let src;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // `NAME: "value",` inside any exported const object. The map is flat and
    // keyed by MEMBER name, so a member defined in two objects with the same
    // spelling resolves the same either way — which is true of every one
    // measured (ID, TITLE, STATUS, CREATED_AT).
    for (const m of src.matchAll(/\b([A-Z_0-9]+)\s*:\s*["'`]([\w.]+)["'`]/g)) {
      if (!FIELD_CONSTANT_MAP.has(m[1])) FIELD_CONSTANT_MAP.set(m[1], m[2]);
    }
  }
  return FIELD_CONSTANT_MAP;
}

function resolveFieldToken(token) {
  const quoted = token.match(/^["'`]([\w.]+)["'`]$/);
  if (quoted) return quoted[1];
  const member = token.split(".").pop();
  return loadFieldConstantMap().get(member) ?? null;
}

function resolveOpToken(token) {
  const quoted = token.match(/^["'`]([^"'`]+)["'`]$/);
  if (quoted) return quoted[1];
  const member = token.split(".").pop();
  return SIEVE_OP_VALUES[member] ?? null;
}

function extractSieveFieldsFromBody(body) {
  // Two forms, both real: a raw Sieve string, and the typed builder.
  const out = [];
  for (const m of body.matchAll(RE_STRING_LITERAL)) {
    const literal = m[1];
    for (const cm of literal.matchAll(RE_SIEVE_CLAUSE)) {
      out.push({ field: cm[1], op: cm[2], isRange: RANGE_OPS.has(cm[2]) });
    }
  }
  for (const m of body.matchAll(RE_SIEVE_BUILDER)) {
    const field = resolveFieldToken(m[1]);
    const op = resolveOpToken(m[2]);
    // An unresolvable constant is REPORTED, not silently dropped — a clause
    // this cannot read is a clause the index check is blind to, which is the
    // failure this whole block exists to end.
    if (!field || !op) {
      unresolvedBuilderTokens.push(`${m[1]} ${m[2]}`);
      continue;
    }
    out.push({ field, op, isRange: RANGE_OPS.has(op) });
  }
  return out;
}

/** Builder clauses this run could not resolve. Printed at the end. */
const unresolvedBuilderTokens = [];

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
  // appkit features + _internal (server jobs/functions/actions also call
  // repo methods, not just raw Firestore chains — audit-functions-query-
  // indices.mjs only catches the latter) + consumer src (API routes, page.tsx
  // detail/edit routes, and server actions all call repository methods).
  const roots = [
    join(APPKIT_ROOT, "src", "features"),
    join(APPKIT_ROOT, "src", "_internal"),
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
      const [, repoName, , body] = m;
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
    // When the query has NO filters, Firestore's single-field auto-indexes
    // handle the sort natively — no composite index required. Skip the
    // orphan check in that case.
    if (
      page.filterClauses.length === 0 &&
      !indexedFields.has(`${page.collection}|${parsed.field}`)
    ) {
      // Allowed: single-field sort with no filter is auto-indexed by Firestore.
    } else if (!indexedFields.has(`${page.collection}|${parsed.field}`)) {
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

// ───────────────────────────────────────────────────────────────────────────────
// 10. Auto-regenerate firestore-route-field-usage.md — never hand-maintained again.
// Written on every run (pass or fail) so it always reflects live scan state,
// not just the last passing run.
// ───────────────────────────────────────────────────────────────────────────────
function writeRouteFieldUsageDoc() {
  const md = [];
  md.push("# Firestore route ↔ field usage");
  md.push("");
  md.push("> **Auto-generated by `appkit/scripts/audit-listing-indices.mjs`** — do not hand-edit.");
  md.push("> Regenerated on every audit run. Run `npm run audit listing-indices` (or `npm run check`) to refresh.");
  md.push("");
  md.push(`Scanned ${pageEntries.length} views/call-sites (DataListingView configs + repository call sites across appkit/src/features, appkit/src/_internal, and the consumer src/ tree).`);
  md.push("");
  md.push(`- Missing composite indices: ${missing.length}`);
  md.push(`- Filter-field orphans: ${filterOrphans.size}`);
  md.push(`- Sort-field orphans: ${sortOrphans.size}`);
  md.push(`- Unsatisfiable queries: ${queryIssues.length}`);
  md.push(`- Unused declared indices: ${unused.length}`);
  md.push("");
  if (missing.length > 0) {
    md.push("## Missing indices");
    md.push("");
    for (const m of missing) {
      const refs = [...m.refs].join(", ");
      md.push(`- \`${m.collection}\`: [${m.fields.map(f => `${f.fieldPath} ${f.order}`).join(", ")}] — referenced by: ${refs}`);
    }
    md.push("");
  }
  if (filterOrphans.size > 0 || sortOrphans.size > 0) {
    md.push("## Orphan fields (referenced by a query but not indexed)");
    md.push("");
    for (const [key, refs] of filterOrphans) md.push(`- filter \`${key}\` — ${[...refs].join(", ")}`);
    for (const [key, refs] of sortOrphans) md.push(`- sort \`${key}\` — ${[...refs].join(", ")}`);
    md.push("");
  }
  md.push("## Route/view summary");
  md.push("");
  md.push("| Ref | Collection | Filters | Sorts |");
  md.push("|---|---|---|---|");
  for (const p of pageEntries) {
    const fields = p.filterClauses.map(c => `${c.field}${c.op}`).join(",") || "—";
    const sorts = p.sortValues.join(",") || "—";
    md.push(`| \`${p.ref}\` | ${p.collection} | ${fields} | ${sorts} |`);
  }
  md.push("");
  if (informational.length > 0) {
    md.push("## Known gaps (informational — not scanned or unresolved)");
    md.push("");
    for (const i of informational) md.push(`- [${i.rule}] \`${i.ref}\` — ${i.message}`);
    md.push("");
  }
  writeFileSync(join(REPO_ROOT, "firestore-route-field-usage.md"), md.join("\n") + "\n", "utf8");
}
writeRouteFieldUsageDoc();

if (blockingCount === 0) {
  console.log("audit-listing-indices: clean ✓");
  if (unused.length > 0 || informational.length > 0) {
    process.stderr.write(out.join("\n") + "\n");
  }
  process.exit(0);
}

if (blockingCount === 0) {
  console.log("audit-listing-indices: clean ✓");
  if (!SUMMARY_ONLY) process.stderr.write(out.join("\n") + "\n");
  process.exit(0);
}

console.error(`audit-listing-indices: ${blockingCount} blocking violation(s).\n`);
process.stderr.write(out.join("\n") + "\n");
process.exit(1);
