import { normalizeError } from "../../../../errors/normalize";
import type { MetadataRoute } from "next";
import { getAdminDb } from "../../../../providers/db-firebase";
import { ROUTES } from "../../../../next/routing/route-map";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import { EVENTS_COLLECTION, EVENT_FIELDS } from "../../../../features/events/schemas/firestore";
import { BLOG_POSTS_COLLECTION, BLOG_POST_FIELDS } from "../../../../features/blog/schemas/firestore";
import { CATEGORIES_COLLECTION, CATEGORY_FIELDS } from "../../../../features/categories/schemas/firestore";
// Imported from the DEFINING module, not the feature barrel (Root Cause #18).
import { isListingCategory } from "../../../../features/categories/constants/listing-categories";
import { STORE_COLLECTION, STORE_FIELDS } from "../../../../features/stores/schemas/firestore";
import { SCAMMER_COLLECTION } from "../../../../features/scams/schemas/firestore";
import { BEYS_COLLECTION } from "../../../../features/beys/schemas/firestore";
import { PART_GLOSSARY_COLLECTION, ALL_PART_SLOTS } from "../../../../features/parts/schemas/firestore";
import { serverLogger } from "../../../../monitoring/server-logger";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import { PRODUCT_DETAIL_LISTING_TYPES } from "./product-detail-types";
import { safeRead } from "../../../../errors/safe-read";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import {
  ALL_BROWSE_PAGES,
  browsePageForPath,
  isBrowsePageEnabled,
} from "../../../shared/listing-types/feature-flags";
import {
  closedSurfacePrefixes,
  hiddenSurfaceRoutes,
  isUnderClosedPrefix,
} from "../../../shared/listing-types/hidden-surfaces";
import { getSurfaceCounts } from "../products/surface-counts";

// Product field strings — matches consumer field-names.ts
const PRODUCT_STATUS = "status";
const PRODUCT_STATUS_PUBLISHED = "published";
const PRODUCT_SLUG = "slug";
const PRODUCT_UPDATED_AT = "updatedAt";

/**
 * Tester-sandbox fixtures must never reach the public sitemap. They are created
 * and destroyed on a cycle by `testDataCleanup` and by each tester run's
 * wipe/seed, so anything Google indexes from them 404s shortly after. 34 of 182 sitemap
 * URLs were disposable test fixtures before this filter existed.
 *
 * 🛑 This MUST be an in-memory filter, never a Firestore inequality on the
 * field. An inequality silently excludes every document that does not have the
 * field at all — which is every real product, store, category and post, since
 * the flag is optional and was added later. Such a query returns ONLY test
 * data. Same trap documented in CLAUDE.md § Tester QA Program.
 *
 * The field must therefore appear in each fetcher's `.select(...)` list, or it
 * comes back undefined and nothing is filtered.
 *
 * The flag is not product-specific — it is set on categories, stores, blog
 * posts and events too — but `PRODUCT_FIELDS` is where the canonical constant
 * lives, so alias it rather than reintroducing a raw string.
 */
const TEST_DATA_FIELD = PRODUCT_FIELDS.IS_TEST_DATA;

/** The only field of a fetched document this predicate cares about. */
interface MaybeTestDataDoc {
  isTestData?: boolean;
}

const isTestDoc = (data: MaybeTestDataDoc): boolean => data.isTestData === true;

/**
 * A sitemap section that throws returns `[]` so a single broken query degrades
 * the sitemap instead of 500-ing the whole route. That trade-off is right, but
 * it is also why `fetchCategoryUrls` could return zero URLs for months without
 * anyone noticing — it was logged at `warn` and looked identical to "this site
 * genuinely has no categories".
 *
 * Log at `error`, and always name the section, so a section dropping to zero is
 * greppable in production logs. `buildSitemap` additionally logs a per-section
 * count digest on every build (see below), and `scripts/deploy.mjs` fails the
 * deploy when any section is empty.
 *
 * NOTE: callers must still call `normalizeError(err)` themselves, in the catch
 * block, BEFORE delegating here. `audit-catch-normalize` requires that call to
 * be lexically inside the `catch` — a helper that normalises on the caller's
 * behalf reads as an unnormalised catch and fails the audit. Keeping the call at
 * the catch site is also what guarantees `unknown` never escapes into downstream
 * logic, which is the rule's actual point.
 */
function sitemapSectionFailed(label: string, err: unknown): [] {
  serverLogger.error(`sitemap: section "${label}" failed and returned 0 URLs`, { section: label, error: err });
  return [];
}

export interface SitemapOptions {
  baseUrl: string;
}

/**
 * Read every document a query matches, in pages.
 *
 * 🛑 WHY: three category fetchers below carried a bare `.limit(500)` and then
 * filtered in memory, so past 500 active rows the sitemap emitted an
 * **unpredictable subset** — and `scripts/deploy.mjs` only asserts a section is
 * non-ZERO, so truncation passes the deploy gate silently. The taxonomy this
 * plan seeds takes `categories` from 58 to ~330 rows, which is still under 500
 * today; the point is that crossing it would be invisible.
 *
 * `MAX_SITEMAP_DOCS` is a real ceiling, kept well under the 50,000-URL
 * sitemap-file limit, and crossing it is LOGGED rather than swallowed — the
 * opposite of a bare `.limit()`, which cannot tell you it truncated.
 *
 * An explicit `orderBy("__name__")` is required: `startAfter(docSnapshot)`
 * needs a defined sort to page against, and a `where`-only query's implicit
 * document order is not something to rely on across pages.
 */
const SITEMAP_PAGE_SIZE = 500;
const MAX_SITEMAP_DOCS = 10_000;

async function readAllDocs(
  query: FirebaseFirestore.Query,
  label: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const out: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  for (;;) {
    let page = query.orderBy("__name__").limit(SITEMAP_PAGE_SIZE);
    if (cursor) page = page.startAfter(cursor);

    const snap = await page.get();
    if (snap.empty) break;

    out.push(...snap.docs);
    if (out.length >= MAX_SITEMAP_DOCS) {
      serverLogger.error(
        `sitemap: section "${label}" hit the ${MAX_SITEMAP_DOCS}-document ceiling and is TRUNCATED`,
        { section: label, scanned: out.length },
      );
      return out.slice(0, MAX_SITEMAP_DOCS);
    }
    if (snap.size < SITEMAP_PAGE_SIZE) break;
    cursor = snap.docs[snap.docs.length - 1]!;
  }

  return out;
}

function staticPages(baseUrl: string): MetadataRoute.Sitemap {
  const page = (path: string, changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"], priority: number) =>
    ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: changeFreq, priority });
  return [
    page(String(ROUTES.HOME), "daily", 1.0),
    // "daily", not "hourly". These two are the highest-priority URLs in the
    // sitemap AND the entry points into the deepest faceted URL space
    // (tab x sortKey x page), so an hourly hint invites recrawl of that whole
    // surface at a rate a catalogue this size cannot justify — new listings
    // arrive daily, not hourly. `changeFrequency` is only a hint and Google has
    // said it largely disregards it, so treat this as removing a bad signal
    // rather than as a lever: priority is unchanged and neither page loses
    // indexability. 2026-09-14, Vercel usage reduction.
    page(String(ROUTES.PUBLIC.PRODUCTS), "daily", 0.9),
    page(String(ROUTES.PUBLIC.AUCTIONS), "daily", 0.9),
    page(String(ROUTES.PUBLIC.CATEGORIES), "weekly", 0.8),
    page(String(ROUTES.PUBLIC.BRANDS), "weekly", 0.7),
    page(String(ROUTES.BLOG.LIST), "daily", 0.7),
    page(String(ROUTES.PUBLIC.EVENTS), "daily", 0.7),
    page(String(ROUTES.PUBLIC.SELLERS), "weekly", 0.6),
    page(String(ROUTES.PUBLIC.ABOUT), "monthly", 0.5),
    page(String(ROUTES.PUBLIC.CONTACT), "monthly", 0.5),
    page(String(ROUTES.PUBLIC.FAQS), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.TERMS), "yearly", 0.3),
    page(String(ROUTES.PUBLIC.PRIVACY), "yearly", 0.3),
    page(String(ROUTES.PUBLIC.SECURITY), "yearly", 0.4),
    page(String(ROUTES.PUBLIC.HELP), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.STORES), "weekly", 0.7),
    page(String(ROUTES.PUBLIC.PROMOTIONS), "daily", 0.6),
    page(String(ROUTES.PUBLIC.REVIEWS), "daily", 0.5),
    page(String(ROUTES.PUBLIC.SELLER_GUIDE), "monthly", 0.5),
    page(String(ROUTES.PUBLIC.COOKIE_POLICY), "yearly", 0.2),
    page(String(ROUTES.PUBLIC.REFUND_POLICY), "yearly", 0.3),
    page(String(ROUTES.PUBLIC.SHIPPING_POLICY), "yearly", 0.3),
    page(String(ROUTES.PUBLIC.PRE_ORDERS), "daily", 0.7),
    page(String(ROUTES.PUBLIC.BUNDLES), "weekly", 0.6),
    page(String(ROUTES.PUBLIC.RANDOM_LOTS), "daily", 0.7),
    /*
     * 🛑 `/classified`, `/digital-codes` and `/live` are NOT listed, and must
     * not be re-added. All three index pages were reduced to redirect stubs
     * that export `robots: { index: false, follow: false }` and immediately
     * `redirect()` to `/products?listingType=…`. Submitting a URL that
     * declares itself noindex is a direct contradiction — we ask Google to
     * crawl it and then tell it not to keep it. Their DETAIL pages are still
     * submitted by `fetchClassifiedUrls`/`fetchDigitalCodeUrls`/`fetchLiveUrls`
     * below; it is only the dead index that goes.
     */
    page(String(ROUTES.PUBLIC.ART), "weekly", 0.6),
    /*
     * Hubs that exist, are linked, and were never submitted.
     * `/franchise` is the index for a whole `categoryType`; `/parts` is the
     * Beyblade parts gallery — both are real pages with real content and both
     * were absent from the sitemap entirely (measured 2026-10-24).
     */
    page(String(ROUTES.PUBLIC.FRANCHISE), "weekly", 0.6),
    page(String(ROUTES.PUBLIC.PARTS), "weekly", 0.6),
    /*
     * `daily`, matching the other one-of-a-kind types rather than `/art`'s
     * weekly: most spares are quantity 1, so the page turns over as fast as
     * classifieds do.
     */
    page(String(ROUTES.PUBLIC.SPARES), "daily", 0.6),
    page(String(ROUTES.PUBLIC.FEES), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_AUCTIONS_WORK), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_PRE_ORDERS_WORK), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_OFFERS_WORK), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_CHECKOUT_WORKS), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_ORDERS_WORK), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_REVIEWS_WORK), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_PAYOUTS_WORK), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.SCAMS), "daily", 0.8),
    page(String(ROUTES.PUBLIC.SCAM_TYPES), "monthly", 0.7),
    page(String(ROUTES.PUBLIC.SCAM_REPORT), "monthly", 0.6),
    page(String(ROUTES.PUBLIC.SCAM_FAQS), "weekly", 0.7),
  ];
}

async function fetchProductUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_STATUS, "==", PRODUCT_STATUS_PUBLISHED)
      .where("listingType", "in", [...PRODUCT_DETAIL_LISTING_TYPES])
      .select(PRODUCT_SLUG, PRODUCT_UPDATED_AT, TEST_DATA_FIELD)
      .limit(5000)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data[PRODUCT_SLUG] as string | undefined) ?? doc.id;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.PRODUCT_DETAIL(slug)}`,
          lastModified: (data[PRODUCT_UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "daily" as const,
          priority: 0.8,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("product", err);
  }
}

async function fetchListingTypeUrls(
  baseUrl: string,
  listingType: string,
  buildUrl: (slug: string) => string,
  label: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_STATUS, "==", PRODUCT_STATUS_PUBLISHED)
      .where("listingType", "==", listingType)
      .select(PRODUCT_SLUG, PRODUCT_UPDATED_AT, TEST_DATA_FIELD)
      .limit(2000)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data[PRODUCT_SLUG] as string | undefined) ?? doc.id;
        return {
          url: `${baseUrl}${buildUrl(slug)}`,
          lastModified: (data[PRODUCT_UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "daily" as const,
          priority: 0.7,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed(label, err);
  }
}

const fetchPreOrderUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "pre-order", (slug) => ROUTES.PUBLIC.PRE_ORDER_DETAIL(slug), "pre-order");

const fetchPrizeDrawUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "random-lots", (slug) => ROUTES.PUBLIC.RANDOM_LOTS_DETAIL(slug), "random-lots");

const fetchClassifiedUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "classified", (slug) => ROUTES.PUBLIC.CLASSIFIED_DETAIL(slug), "classified");

const fetchDigitalCodeUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "digital-code", (slug) => ROUTES.PUBLIC.DIGITAL_CODE_DETAIL(slug), "digital-code");

const fetchLiveUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "live", (slug) => ROUTES.PUBLIC.LIVE_DETAIL(slug), "live");

async function fetchAuctionUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_STATUS, "==", PRODUCT_STATUS_PUBLISHED)
      .where("listingType", "==", "auction")
      .select(PRODUCT_SLUG, PRODUCT_UPDATED_AT, TEST_DATA_FIELD)
      .limit(2000)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data[PRODUCT_SLUG] as string | undefined) ?? doc.id;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.AUCTION_DETAIL(slug)}`,
          lastModified: (data[PRODUCT_UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "daily" as const,
          priority: 0.8,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("auction", err);
  }
}

async function fetchEventUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(EVENTS_COLLECTION)
      .where(EVENT_FIELDS.STATUS, "==", EVENT_FIELDS.STATUS_VALUES.ACTIVE)
      .select(EVENT_FIELDS.UPDATED_AT, EVENT_FIELDS.SLUG, TEST_DATA_FIELD)
      .limit(500)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = typeof data[EVENT_FIELDS.SLUG] === "string" ? (data[EVENT_FIELDS.SLUG] as string) : undefined;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.EVENT_DETAIL(slug ?? doc.id)}`,
          lastModified: (data[EVENT_FIELDS.UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "daily" as const,
          priority: 0.7,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("event", err);
  }
}

// `categories` is a discriminated-union collection. Each discriminator renders
// at a different public route, so each needs its own filtered query; querying
// the collection without a categoryType filter (an older bug here) mapped
// brand/bundle rows onto the wrong /categories/{slug} URL.
//
// 🛑 The union is `"category" | "sublisting" | "brand" | "bundle"` — see
// CategoryType in features/categories/types/index.ts. There is NO "listing"
// value and there never was. This function used to be called with "listing"
// for the plain-category case, which matched zero documents, so ~47 category
// pages were missing from the sitemap for as long as that call existed — with
// no error, because a zero-row query is indistinguishable from "no categories".
//
// It is still only safe to use this helper for discriminators that are actually
// STORED. A plain listing category OMITS `categoryType` entirely (that is the
// convention every seeded listing category follows), so no equality can select
// it — see fetchCategoryUrls below, which inverts the test instead.
async function fetchCategoryTypeUrls(
  baseUrl: string,
  categoryType: string,
  buildUrl: (slug: string) => string,
  label: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const docs = await readAllDocs(
      db
        .collection(CATEGORIES_COLLECTION)
        .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", categoryType)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .select(CATEGORY_FIELDS.SLUG, CATEGORY_FIELDS.UPDATED_AT, TEST_DATA_FIELD),
      label,
    );
    return docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data[CATEGORY_FIELDS.SLUG] as string | undefined) ?? doc.id;
        return {
          url: `${baseUrl}${buildUrl(slug)}`,
          lastModified: (data[CATEGORY_FIELDS.UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed(label, err);
  }
}

/**
 * Plain listing categories — the /categories/{slug} pages.
 *
 * These CANNOT be selected by an equality on `categoryType`, because a plain
 * listing category omits the field entirely rather than storing "category".
 * `.where(CATEGORY_TYPE, "==", <anything>)` therefore excludes every one of
 * them, and a Firestore `!=` would be worse still — it silently drops documents
 * that lack the field, which is exactly the set we want.
 *
 * So: select on `isActive` alone (the one predicate that IS stored on every
 * row) and reject the three discriminated kinds in memory. `categoryType` must
 * stay in the `.select()` list or it comes back undefined and nothing is
 * rejected.
 *
 * ## 🛑 Only STOCKED categories and ROOTS are submitted
 *
 * Measured against production 2026-10-24: the taxonomy holds **4,698
 * categories and exactly 20 of them have any item at all** (10 of those are
 * leaves). The sitemap was submitting **4,658** of them — 97.6% of all 4,773
 * URLs — and a random sample of 30 found **30 with zero product links and an
 * empty-state message**. Google Search Console at that moment: **12 indexed
 * pages, 249 not indexed**.
 *
 * Asking Google to crawl 4,658 empty pages is a site-level quality signal and
 * a crawl-budget sink, and `next.config.js` already records the same set as
 * ~95,000 uncached origin renders, roughly 43% of the billing cycle.
 *
 * The rule is therefore:
 *   - **stocked** — the rollup says it or a descendant has something, OR
 *   - **tier 0** — a root hub, which `CategoryDetailPageView` renders as a
 *     tier-grouped index of its descendants, so it is a real page even with no
 *     direct stock and it is the entry point a visitor drills down from.
 *
 * Ancestors of a stocked leaf come along automatically: `totalProductCount` is
 * a ROLLUP, so every node on the path to stock is non-zero and the drill-down
 * chain stays crawlable. That is the property that makes this safe — pruning
 * by a per-node count instead would sever the path.
 *
 * Empty leaves are not orphaned by this. They stay reachable, and they
 * canonicalise to their `/parts/…` or `/beys/…` entry in the parts database,
 * which is where their actual content lives.
 *
 * 🛑 `metrics` must stay in the `.select()` list, and a row with NO counter is
 * EXCLUDED rather than assumed stocked — 33 of 4,698 rows carry no numeric
 * counter (the reconciler has never visited them). Treating "unknown" as
 * "stocked" would quietly re-admit the empty pages this exists to remove, so
 * the count is logged instead of being silently absorbed.
 */
interface CategoryMetricsShape {
  totalProductCount?: number;
  totalAuctionCount?: number;
}

/** A rollup of zero, or no rollup at all, means nothing to show. */
function hasStock(metrics: CategoryMetricsShape | undefined): boolean {
  return (metrics?.totalProductCount ?? 0) + (metrics?.totalAuctionCount ?? 0) > 0;
}

async function fetchCategoryUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const docs = await readAllDocs(
      db
        .collection(CATEGORIES_COLLECTION)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .select(
          CATEGORY_FIELDS.SLUG,
          CATEGORY_FIELDS.UPDATED_AT,
          CATEGORY_FIELDS.CATEGORY_TYPE,
          CATEGORY_FIELDS.TIER,
          CATEGORY_FIELDS.METRICS,
          TEST_DATA_FIELD,
        ),
      "category",
    );
    let uncounted = 0;
    const kept = docs
      .filter((doc) => {
        const data = doc.data();
        if (isTestDoc(data)) return false;
        if (
          !isListingCategory({
            categoryType: data[CATEGORY_FIELDS.CATEGORY_TYPE] as string | undefined,
          })
        ) {
          return false;
        }
        const metrics = data[CATEGORY_FIELDS.METRICS] as CategoryMetricsShape | undefined;
        if (metrics?.totalProductCount === undefined && metrics?.totalAuctionCount === undefined) {
          uncounted++;
        }
        return data[CATEGORY_FIELDS.TIER] === 0 || hasStock(metrics);
      });
    if (uncounted > 0) {
      serverLogger.warn(
        `sitemap: ${uncounted} active categories have no rollup counter and were judged empty`,
        { section: "category", uncounted },
      );
    }
    return kept
      .map((doc) => {
        const data = doc.data();
        const slug = (data[CATEGORY_FIELDS.SLUG] as string | undefined) ?? doc.id;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.CATEGORY_DETAIL(slug)}`,
          lastModified: (data[CATEGORY_FIELDS.UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("category", err);
  }
}

const fetchBrandUrls = (baseUrl: string) =>
  fetchCategoryTypeUrls(baseUrl, "brand", (slug) => ROUTES.PUBLIC.BRAND_DETAIL(slug), "brand");

const fetchBundleUrls = (baseUrl: string) =>
  fetchCategoryTypeUrls(baseUrl, "bundle", (slug) => ROUTES.PUBLIC.BUNDLE_DETAIL(slug), "bundle");

/**
 * `/franchise/{slug}` — what a product is FROM, where a brand is who made it.
 *
 * `"franchise"` has been a real `CategoryType` with a real detail route since
 * 2026-10-14, and this call simply did not exist: **zero** franchise URLs were
 * ever submitted (measured 2026-10-24). `fetchCategoryTypeUrls` already filters
 * on `isActive`, which is the behaviour wanted here rather than an accident —
 * 7 of the 8 franchises are deliberately inactive because an unstocked facet
 * "renders as a card in the grid that opens an empty page", so only the stocked
 * one is advertised while the rest still resolve for the `/franchise/*` links
 * `CharacterHotspot` ships.
 */
const fetchFranchiseUrls = (baseUrl: string) =>
  fetchCategoryTypeUrls(baseUrl, "franchise", (slug) => ROUTES.PUBLIC.FRANCHISE_DETAIL(slug), "franchise");

/**
 * `groupedListings` documents. `listSitemapGroupedListings` has existed since
 * the feature was built, but there was no public page for it to point at until
 * `/groups/{slug}` — so it was never wired into the sitemap.
 */
async function fetchGroupedListingUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const { listSitemapGroupedListings } = await import("../grouped/data");
    const groups = await listSitemapGroupedListings();
    return groups.map((g) => ({
      url: `${baseUrl}${ROUTES.PUBLIC.GROUP_DETAIL(g.slug)}`,
      lastModified: g.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch (err) {
    void normalizeError(err);
    // This catch used to swallow silently — no log at all, so a failure here was
    // indistinguishable from "this site has no grouped listings".
    return sitemapSectionFailed("grouped-listing", err);
  }
}

async function fetchBlogPostUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(BLOG_POSTS_COLLECTION)
      .where(BLOG_POST_FIELDS.STATUS, "==", BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED)
      .select(
        BLOG_POST_FIELDS.SLUG,
        BLOG_POST_FIELDS.PUBLISHED_AT,
        BLOG_POST_FIELDS.UPDATED_AT,
        TEST_DATA_FIELD,
      )
      .limit(1000)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data[BLOG_POST_FIELDS.SLUG] as string | undefined) ?? doc.id;
        const lastModified =
          (data[BLOG_POST_FIELDS.UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ??
          (data[BLOG_POST_FIELDS.PUBLISHED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ??
          new Date();
        return {
          url: `${baseUrl}${ROUTES.BLOG.ARTICLE(slug)}`,
          lastModified,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("blog-post", err);
  }
}

async function fetchStoreUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(STORE_COLLECTION)
      .where(STORE_FIELDS.STATUS, "==", STORE_FIELDS.STATUS_VALUES.ACTIVE)
      .where(STORE_FIELDS.IS_PUBLIC, "==", true)
      .select(STORE_FIELDS.STORE_SLUG, STORE_FIELDS.UPDATED_AT, TEST_DATA_FIELD)
      .limit(1000)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data[STORE_FIELDS.STORE_SLUG] as string | undefined) ?? doc.id;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.STORE_DETAIL(slug)}`,
          lastModified: (data[STORE_FIELDS.UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("store", err);
  }
}

async function fetchScammerUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(SCAMMER_COLLECTION)
      .where(PRODUCT_FIELDS.STATUS, "==", "verified")
      .select("seo", "updatedAt", TEST_DATA_FIELD)
      .limit(2000)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data.seo as { slug?: string } | undefined)?.slug ?? doc.id;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.SCAM_DETAIL(slug)}`,
          lastModified: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("scammer", err);
  }
}

/**
 * `/beys/{slug}` — 1,988 model reference pages, and `/parts/{slot}/{code}` —
 * 2,488 part pages. Both carry real measured data (type, system, weight, spin,
 * release code, WBO legality, which models use a part) and both had **zero**
 * sitemap URLs, while 4,658 empty category pages were submitted. The index was
 * precisely inverted.
 *
 * They are submitted together with their prerendering (`static-params.ts`), not
 * before it: a page whose `<title>` still streams into `<body>` is not ready to
 * be advertised.
 */
async function fetchBeyUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const docs = await readAllDocs(
      getAdminDb().collection(BEYS_COLLECTION).select(PRODUCT_UPDATED_AT, TEST_DATA_FIELD),
      "bey",
    );
    return docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => ({
      url: `${baseUrl}${ROUTES.PUBLIC.BEY_DETAIL(doc.id)}`,
      lastModified:
        (doc.data()[PRODUCT_UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ??
        new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("bey", err);
  }
}

async function fetchPartUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const docs = await readAllDocs(
      getAdminDb().collection(PART_GLOSSARY_COLLECTION).select(PRODUCT_UPDATED_AT, TEST_DATA_FIELD),
      "part",
    );
    const slots = new Set<string>(ALL_PART_SLOTS as readonly string[]);
    return docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        // Document id is `{slot}--{tail}`, and the route segment IS the slot.
        const sep = doc.id.indexOf("--");
        if (sep === -1) return null;
        const classification = doc.id.slice(0, sep);
        const code = doc.id.slice(sep + 2);
        if (!code || !slots.has(classification)) return null;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.PART_DETAIL(classification, code)}`,
          lastModified:
            (doc.data()[PRODUCT_UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ??
            new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.4,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("part", err);
  }
}

export async function buildSitemap({ baseUrl }: SitemapOptions): Promise<MetadataRoute.Sitemap> {
  const [
    productUrls,
    categoryUrls,
    brandUrls,
    franchiseUrls,
    bundleUrls,
    groupedListingUrls,
    eventUrls,
    blogUrls,
    auctionUrls,
    preOrderUrls,
    prizeDrawUrls,
    classifiedUrls,
    digitalCodeUrls,
    liveUrls,
    storeUrls,
    scammerUrls,
    beyUrls,
    partUrls,
  ] = await Promise.all([
    fetchProductUrls(baseUrl),
    fetchCategoryUrls(baseUrl),
    fetchBrandUrls(baseUrl),
    fetchFranchiseUrls(baseUrl),
    fetchBundleUrls(baseUrl),
    fetchGroupedListingUrls(baseUrl),
    fetchEventUrls(baseUrl),
    fetchBlogPostUrls(baseUrl),
    fetchAuctionUrls(baseUrl),
    fetchPreOrderUrls(baseUrl),
    fetchPrizeDrawUrls(baseUrl),
    fetchClassifiedUrls(baseUrl),
    fetchDigitalCodeUrls(baseUrl),
    fetchLiveUrls(baseUrl),
    fetchStoreUrls(baseUrl),
    fetchScammerUrls(baseUrl),
    fetchBeyUrls(baseUrl),
    fetchPartUrls(baseUrl),
  ]);
  const staticUrls = staticPages(baseUrl);

  // Per-section count digest. A section that drops to zero is otherwise
  // indistinguishable from a site that genuinely has none of that thing — which
  // is exactly how `category: 0` survived unnoticed while every other section
  // worked (the query filtered on a `categoryType` value that does not exist).
  //
  // `scripts/deploy.mjs` asserts the same counts against the deployed sitemap
  // and fails the deploy on an empty section; this log is the production-side
  // record for when a section empties out later, between deploys.
  const sections: Record<string, number> = {
    static: staticUrls.length,
    category: categoryUrls.length,
    brand: brandUrls.length,
    franchise: franchiseUrls.length,
    bundle: bundleUrls.length,
    group: groupedListingUrls.length,
    blog: blogUrls.length,
    product: productUrls.length,
    auction: auctionUrls.length,
    preOrder: preOrderUrls.length,
    prizeDraw: prizeDrawUrls.length,
    classified: classifiedUrls.length,
    digitalCode: digitalCodeUrls.length,
    live: liveUrls.length,
    event: eventUrls.length,
    store: storeUrls.length,
    scammer: scammerUrls.length,
    bey: beyUrls.length,
    part: partUrls.length,
  };
  /*
   * Drop every URL belonging to a CLOSED browse section.
   *
   * 🛑 A single filter over the assembled list, not a condition threaded
   * through the eighteen fetchers above. Section URLs are emitted from several
   * of them plus `staticPages`, so gating from the inside is five edits and
   * five chances to miss the sixth — and `browsePageForPath` is the same rule
   * the navbar and the footer use, so the sitemap cannot end up disagreeing
   * with the chrome about which sections exist.
   *
   * Advertising a URL that answers 404 is worse than omitting it: it is Root
   * Cause #81's host/sitemap disagreement in miniature, and it spends crawl
   * budget on pages we have deliberately withdrawn.
   *
   * 🛑 Applied BEFORE the per-section digest below. The digest is what
   * `scripts/deploy.mjs` asserts against, so counting pre-filter would log
   * URLs the response does not carry.
   */
  const settings = await safeRead(() => siteSettingsRepository.findById("global"), {
    route: "sitemap.xml",
    key: "sitemap.siteSettings",
    // Fails OPEN: an unreadable settings document is not evidence that a
    // section was closed, and silently dropping the catalogue from the sitemap
    // on a transient Firestore error is the expensive direction of this guess.
    fallback: null,
  });
  const closed = new Set(
    ALL_BROWSE_PAGES.filter((p) => !isBrowsePageEnabled(p, settings)),
  );

  /*
   * The same treatment for a listing-type surface that is switched off or
   * measured as holding nothing — `/auctions`, `/art`, `/spares`, …
   *
   * 🛑 BROWSE ROUTES ONLY, matched on the exact path. Detail URLs are NOT
   * dropped here and that is deliberate: art, stickers, spares and standard
   * all detail at `/products/{slug}`, so a path test cannot tell them apart,
   * and a prefix rule would silently delist the entire standard catalogue the
   * day `spares` emptied. An empty type contributes no detail URLs anyway —
   * its fetcher returns none — so the exact-path rule loses nothing real.
   *
   * 🛑 Fails OPEN twice: `settings` is already `safeRead`-wrapped above, and
   * `getSurfaceCounts` returns `undefined` on any failure, which
   * `isListingSurfaceVisible` reads as visible. An unmeasured surface stays in
   * the sitemap rather than being withdrawn by a job that has not run.
   */
  const counts = await getSurfaceCounts();
  /*
   * 🛑 ONE definition, shared with the edge gate. These two loops used to live
   * here and are now `hiddenSurfaceRoutes` — because `toPublicSiteSettings`
   * needs the same answer to tell `src/proxy.ts` which browse routes to 404,
   * and a sitemap that advertises a URL the edge 404s is a crawl error on a
   * page we asked Google to fetch.
   */
  const hiddenSurfacePaths = new Set(hiddenSurfaceRoutes(settings, counts));
  /*
   * 🛑 `disabledRoutes` WAS NEVER APPLIED HERE, and it showed. Measured against
   * the production sitemap on 2026-10-27, with `disabledRoutes: ["/blog",
   * "/reviews"]` live and both paths already 404ing at the edge, the sitemap
   * advertised **17 `/blog` URLs and one `/reviews` URL**.
   *
   * That is 18 crawl errors on pages we explicitly asked Google to fetch — the
   * precise failure the `closed` filter below exists to prevent, on the one
   * axis it did not cover. The browse-page half was handled because
   * `browsePageForPath` is prefix-aware; the hand-disabled half had no reader.
   *
   * `closedSurfacePrefixes` is the SAME function `toPublicSiteSettings` feeds
   * to `src/proxy.ts`, so the list of URLs this withholds and the list the edge
   * 404s are now derived once and cannot drift (the whole reason
   * `hiddenSurfaceRoutes` was extracted in the first place).
   */
  const closedPrefixes = closedSurfacePrefixes(settings);

  const keep = (entry: MetadataRoute.Sitemap[number]) => {
    const path = entry.url.startsWith("http")
      ? new URL(entry.url).pathname
      : entry.url;
    if (hiddenSurfacePaths.has(path.replace(/\/+$/, "") || "/")) return false;
    if (isUnderClosedPrefix(path, closedPrefixes)) return false;
    if (closed.size === 0) return true;
    const page = browsePageForPath(path);
    return page === null || !closed.has(page);
  };

  const all = [
    ...staticUrls,
    ...categoryUrls,
    ...brandUrls,
    ...franchiseUrls,
    ...bundleUrls,
    ...groupedListingUrls,
    ...blogUrls,
    ...productUrls,
    ...auctionUrls,
    ...preOrderUrls,
    ...prizeDrawUrls,
    ...classifiedUrls,
    ...digitalCodeUrls,
    ...liveUrls,
    ...eventUrls,
    ...storeUrls,
    ...scammerUrls,
    ...beyUrls,
    ...partUrls,
  ].filter(keep);

  /*
   * Recount AFTER the filter, and exclude a deliberately-closed section from
   * the "produced 0 URLs" alarm.
   *
   * 🛑 Without this the feature would make its own monitoring cry wolf: the
   * warning exists because `category: 0` once survived unnoticed for months,
   * and a warning that fires every build for a reason everyone knows about is
   * how the next real zero gets ignored. "Closed on purpose" and "broken" must
   * not look the same in the log.
   */
  const sectionPage: Record<string, string | null> = {
    category: "categories",
    brand: "brands",
    franchise: "franchise",
    store: "stores",
  };
  for (const name of Object.keys(sections)) {
    const page = sectionPage[name];
    if (page && closed.has(page as (typeof ALL_BROWSE_PAGES)[number])) sections[name] = 0;
  }
  const empty = Object.entries(sections)
    .filter(([name, n]) => n === 0 && !closed.has(sectionPage[name] as never))
    .map(([name]) => name);
  const total = all.length;

  if (closed.size > 0) {
    serverLogger.info("sitemap: browse section(s) closed, URLs withheld", {
      closed: [...closed],
    });
  }
  if (empty.length > 0) {
    serverLogger.warn(`sitemap: ${empty.length} section(s) produced 0 URLs`, { empty, sections, total });
  } else {
    serverLogger.info("sitemap: built", { sections, total });
  }

  return all;
}
