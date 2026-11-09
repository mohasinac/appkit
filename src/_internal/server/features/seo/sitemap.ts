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
import { serverLogger } from "../../../../monitoring/server-logger";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import { PRODUCT_DETAIL_LISTING_TYPES } from "./product-detail-types";
import { safeRead } from "../../../../errors/safe-read";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import {
  ALL_BROWSE_PAGES,
  ALL_LISTING_TYPES,
  browsePageForPath,
  isBrowsePageListed,
  isListingTypeEnabled,
  isListingTypeListed,
} from "../../../shared/listing-types/feature-flags";
import { pluginFor } from "../../../shared/listing-types/_registry";
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

/**
 * Every section this builder can emit. The names are the same keys the
 * per-section count digest logs and `scripts/deploy.mjs` asserts against, so
 * there is one vocabulary for "which part of the sitemap".
 */
export const SITEMAP_SECTIONS = [
  "static",
  "category",
  "brand",
  "franchise",
  "bundle",
  "group",
  "blog",
  "product",
  "collectorDrop",
  "preOrder",
  "clearance",
  "classified",
  "digitalCode",
  "live",
  "event",
  "store",
  "scammer",
] as const;

export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

export interface SitemapOptions {
  baseUrl: string;
  /**
   * Emit ONLY these sections. Omit for all of them, which is what the main
   * shop wants.
   *
   * ## 🛑 Why this exists, and why it is not a nice-to-have
   *
   * The blog and events surfaces now live on their own deployments
   * (`blogs.`/`events.`). Each needs a sitemap carrying **its own** URLs on
   * **its own** host, and the shop needs to stop advertising them — because the
   * moment the shop 301s `/blog/*` to the subdomain, every `/blog` URL left in
   * the shop's sitemap becomes a redirecting entry.
   *
   * That is not a hypothetical. This file's own note at the `disabledRoutes`
   * filter records the measured version: on 2026-10-27 the production sitemap
   * advertised **17 `/blog` URLs and one `/reviews` URL** that already 404'd at
   * the edge — 18 crawl errors on pages we had explicitly asked Google to
   * fetch. And `seo.server.ts` in the consumer records the worse outcome, when
   * half the URL surface followed one host and half another: *every URL in the
   * sitemap 307-redirected and Google dropped the site.*
   *
   * So a host must be able to say "my sitemap is these sections and nothing
   * else", and the two halves must be derived from one list rather than two
   * hand-maintained ones. Hence an allowlist here instead of a second sitemap
   * builder in each extracted app.
   *
   * 🛑 A section NOT selected is not fetched at all — the point is to avoid the
   * Firestore reads too, not merely to filter the result. A subdomain querying
   * the entire product catalogue to throw it away would make every sitemap
   * request pay for sixteen collections it never emits.
   *
   * 🛑 `static` is a section like any other, so an allowlist that omits it
   * emits no static pages. That is deliberate: the shop's static pages
   * (`/about`, `/contact`, the browse routes) belong to the shop, and a
   * subdomain advertising them under its own host would be inventing URLs that
   * do not exist there.
   */
  sections?: readonly SitemapSection[];
  /**
   * Emit everything EXCEPT these. Mutually exclusive with `sections` in
   * practice; if both are given, `sections` is applied first and this narrows
   * it further.
   *
   * This is the shop's half of the split — `excludeSections: ["blog", "event"]`
   * — and it is spelled as an exclusion rather than a 15-name allowlist so that
   * a NEW section added to this file is carried by the shop automatically. An
   * allowlist there would silently drop the next surface somebody adds, which
   * is the same "measured as empty → looks intentional" failure the digest
   * below exists to catch.
   */
  excludeSections?: readonly SitemapSection[];
  /**
   * Skip the SHOP's surface-visibility policy — for a host that OWNS the
   * sections it is emitting.
   *
   * ## 🛑 Why this is necessary and not a loophole
   *
   * `keep()` below withholds any URL under a closed browse section, an
   * unlisted listing-type route, or a `closedSurfacePrefix` derived from
   * `siteSettings.disabledRoutes`. That is exactly right for the shop: a
   * surface it has switched off must not be advertised.
   *
   * It is exactly WRONG for an extracted subdomain, and the reason is almost
   * funny: the shop disables `/blog` **because the blog moved to
   * `blogs.<domain>`**. The subdomain then reads the same settings document,
   * sees `/blog` disabled, and withholds its own content.
   *
   * Measured on 2026-11-09, from the blogs build log:
   *
   *   sitemap: built  {"sections":{"blog":16},"total":0}
   *
   * Sixteen posts fetched, every one filtered out, and a valid empty
   * `<urlset>` served with HTTP 200. The pages themselves rendered perfectly
   * throughout — only the sitemap was gone.
   *
   * 🛑 It does NOT skip the section scope. `sections`/`excludeSections` still
   * apply, so this cannot be used to make one host emit another's URLs. It
   * only stops the SHOP's visibility flags from governing a host the shop does
   * not serve.
   *
   * 🛑 Leave it UNSET on the shop. There, those flags are the whole point.
   */
  ownsSections?: boolean;
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
    page(String(ROUTES.PUBLIC.COLLECTOR_DROPS), "daily", 0.9),
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
    page(String(ROUTES.PUBLIC.CLEARANCE), "daily", 0.7),
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
     * Hub that exists, is linked, and was never submitted — the index for a
     * whole `categoryType`, a real page with real content (measured
     * 2026-10-24). `/parts` (the Beyblade parts gallery) used to be listed
     * here too; that gallery was removed from this site in favour of the
     * existing wiki.letitrip.in, which covers the same ground.
     */
    page(String(ROUTES.PUBLIC.FRANCHISE), "weekly", 0.6),
    /*
     * `daily`, matching the other one-of-a-kind types rather than `/art`'s
     * weekly: most spares are quantity 1, so the page turns over as fast as
     * classifieds do.
     */
    page(String(ROUTES.PUBLIC.SPARES), "daily", 0.6),
    page(String(ROUTES.PUBLIC.FEES), "monthly", 0.4),
    page(String(ROUTES.PUBLIC.HOW_COLLECTOR_DROPS_WORK), "monthly", 0.4),
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

const fetchClearanceUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "clearance", (slug) => ROUTES.PUBLIC.CLEARANCE_DETAIL(slug), "clearance");

const fetchClassifiedUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "classified", (slug) => ROUTES.PUBLIC.CLASSIFIED_DETAIL(slug), "classified");

const fetchDigitalCodeUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "digital-code", (slug) => ROUTES.PUBLIC.DIGITAL_CODE_DETAIL(slug), "digital-code");

const fetchLiveUrls = (baseUrl: string) =>
  fetchListingTypeUrls(baseUrl, "live", (slug) => ROUTES.PUBLIC.LIVE_DETAIL(slug), "live");

async function fetchCollectorDropUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_STATUS, "==", PRODUCT_STATUS_PUBLISHED)
      .where("listingType", "==", "collector-drop")
      .select(PRODUCT_SLUG, PRODUCT_UPDATED_AT, TEST_DATA_FIELD)
      .limit(2000)
      .get();
    return snap.docs
      .filter((doc) => !isTestDoc(doc.data()))
      .map((doc) => {
        const data = doc.data();
        const slug = (data[PRODUCT_SLUG] as string | undefined) ?? doc.id;
        return {
          url: `${baseUrl}${ROUTES.PUBLIC.COLLECTOR_DROP_DETAIL(slug)}`,
          lastModified: (data[PRODUCT_UPDATED_AT] as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
          changeFrequency: "daily" as const,
          priority: 0.8,
        };
      });
  } catch (err) {
    void normalizeError(err);
    return sitemapSectionFailed("collector-drop", err);
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
  totalCollectorDropCount?: number;
}

/** A rollup of zero, or no rollup at all, means nothing to show. */
function hasStock(metrics: CategoryMetricsShape | undefined): boolean {
  return (metrics?.totalProductCount ?? 0) + (metrics?.totalCollectorDropCount ?? 0) > 0;
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
        if (metrics?.totalProductCount === undefined && metrics?.totalCollectorDropCount === undefined) {
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


export async function buildSitemap({
  baseUrl,
  sections: only,
  excludeSections,
  ownsSections = false,
}: SitemapOptions): Promise<MetadataRoute.Sitemap> {
  /*
   * Which sections this host emits. See `SitemapOptions.sections` for why a
   * host must be able to answer this at all.
   *
   * 🛑 `wants()` gates the FETCH, not the output. An unselected section issues
   * no Firestore query — a subdomain must not pay for sixteen collections it
   * throws away on every sitemap request.
   */
  const excluded = new Set(excludeSections ?? []);
  const allowed = only ? new Set(only) : null;
  const wants = (s: SitemapSection) =>
    !excluded.has(s) && (allowed === null || allowed.has(s));
  /** `[]` for a section this host does not emit, without running its query. */
  const ifWanted = <T>(s: SitemapSection, run: () => Promise<T[]>): Promise<T[]> =>
    wants(s) ? run() : Promise.resolve([]);

  const [
    productUrls,
    categoryUrls,
    brandUrls,
    franchiseUrls,
    bundleUrls,
    groupedListingUrls,
    eventUrls,
    blogUrls,
    collectorDropUrls,
    preOrderUrls,
    clearanceUrls,
    classifiedUrls,
    digitalCodeUrls,
    liveUrls,
    storeUrls,
    scammerUrls,
  ] = await Promise.all([
    ifWanted("product", () => fetchProductUrls(baseUrl)),
    ifWanted("category", () => fetchCategoryUrls(baseUrl)),
    ifWanted("brand", () => fetchBrandUrls(baseUrl)),
    ifWanted("franchise", () => fetchFranchiseUrls(baseUrl)),
    ifWanted("bundle", () => fetchBundleUrls(baseUrl)),
    ifWanted("group", () => fetchGroupedListingUrls(baseUrl)),
    ifWanted("event", () => fetchEventUrls(baseUrl)),
    ifWanted("blog", () => fetchBlogPostUrls(baseUrl)),
    ifWanted("collectorDrop", () => fetchCollectorDropUrls(baseUrl)),
    ifWanted("preOrder", () => fetchPreOrderUrls(baseUrl)),
    ifWanted("clearance", () => fetchClearanceUrls(baseUrl)),
    ifWanted("classified", () => fetchClassifiedUrls(baseUrl)),
    ifWanted("digitalCode", () => fetchDigitalCodeUrls(baseUrl)),
    ifWanted("live", () => fetchLiveUrls(baseUrl)),
    ifWanted("store", () => fetchStoreUrls(baseUrl)),
    ifWanted("scammer", () => fetchScammerUrls(baseUrl)),
  ]);
  const staticUrls = wants("static") ? staticPages(baseUrl) : [];

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
    collectorDrop: collectorDropUrls.length,
    preOrder: preOrderUrls.length,
    clearance: clearanceUrls.length,
    classified: classifiedUrls.length,
    digitalCode: digitalCodeUrls.length,
    live: liveUrls.length,
    event: eventUrls.length,
    store: storeUrls.length,
    scammer: scammerUrls.length,
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
  /*
   * 🛑 `isBrowsePageListed`, not `isBrowsePageEnabled` — this `closed` set is
   * the SITEMAP's own filter (separate from `hiddenSurfacePaths`/
   * `closedPrefixes` below, which deliberately mirror the edge 404 gate and
   * must not diverge from it). `"unlisted"` sections keep serving at 200 —
   * the edge gate stays on `isBrowsePageEnabled` semantics via
   * `closedSurfacePrefixes` — they just stop being advertised here.
   */
  const closed = new Set(
    ALL_BROWSE_PAGES.filter((p) => !isBrowsePageListed(p, settings)),
  );
  /*
   * The listing-type equivalent of `closed` above — a type that is enabled
   * (still serves at 200, so NOT in `hiddenSurfaceRoutes`) but set to
   * `"unlisted"` loses its sitemap entry without losing its edge-gate status.
   * Mirrors `hiddenSurfaceRoutes`' own routeOf/second-pass shape so a shared
   * browse route (a route with more than one claimant type) only withdraws once every type
   * on it is unlisted, not the moment the first one is.
   */
  const routeOfType = (type: (typeof ALL_LISTING_TYPES)[number]): string =>
    String(pluginFor(type).browseRoute ?? "");
  const unlistedTypeRoutes = new Set<string>();
  for (const type of ALL_LISTING_TYPES) {
    if (!isListingTypeEnabled(type, settings)) continue; // already in hiddenSurfacePaths
    if (isListingTypeListed(type, settings)) continue;
    const route = routeOfType(type);
    if (route) unlistedTypeRoutes.add(route);
  }
  for (const type of ALL_LISTING_TYPES) {
    if (isListingTypeListed(type, settings)) unlistedTypeRoutes.delete(routeOfType(type));
  }

  /*
   * The same treatment for a listing-type surface that is switched off or
   * measured as holding nothing — `/collector-drops`, `/art`, `/spares`, …
   *
   * 🛑 BROWSE ROUTES ONLY, matched on the exact path. Detail URLs are NOT
   * dropped here and that is deliberate: art-and-stickers, spares and standard
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
    /*
     * A host that OWNS its sections is not governed by the shop's visibility
     * flags — see `ownsSections`. The section scope above still applies.
     */
    if (ownsSections) return true;
    const path = entry.url.startsWith("http")
      ? new URL(entry.url).pathname
      : entry.url;
    const normalisedPath = path.replace(/\/+$/, "") || "/";
    if (hiddenSurfacePaths.has(normalisedPath)) return false;
    if (unlistedTypeRoutes.has(normalisedPath)) return false;
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
    ...collectorDropUrls,
    ...preOrderUrls,
    ...clearanceUrls,
    ...classifiedUrls,
    ...digitalCodeUrls,
    ...liveUrls,
    ...eventUrls,
    ...storeUrls,
    ...scammerUrls,
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
  /*
   * 🛑 A section this host does not EMIT is dropped from the digest entirely,
   * not reported as zero.
   *
   * The comment above this block is the reason, and it was written about the
   * `closed` case: *"a warning that fires every build for a reason everyone
   * knows about is how the next real zero gets ignored. 'Closed on purpose'
   * and 'broken' must not look the same in the log."* Section scoping is the
   * same hazard one axis over — without this, the blogs deployment would warn
   * about fifteen empty sections on every single sitemap request, and the shop
   * would warn about `blog` and `event` forever. Two permanent false alarms is
   * how the alarm stops being read.
   *
   * Deleting the key rather than zeroing it also keeps the digest honest for
   * `scripts/deploy.mjs`, which asserts these counts against the deployed
   * sitemap: a section that is absent from the response should be absent here
   * too, not present-and-zero.
   */
  for (const name of Object.keys(sections)) {
    if (!wants(name as SitemapSection)) delete sections[name];
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
  /*
   * Logged so a host's scope is visible in production, not just in its source.
   * "Why is /blog missing from the sitemap" is otherwise answerable only by
   * reading the caller.
   */
  if (only || excludeSections?.length) {
    serverLogger.info("sitemap: section scope applied", {
      ...(only ? { only: [...only] } : {}),
      ...(excludeSections?.length ? { excluded: [...excludeSections] } : {}),
      emitting: Object.keys(sections),
    });
  }
  if (empty.length > 0) {
    serverLogger.warn(`sitemap: ${empty.length} section(s) produced 0 URLs`, { empty, sections, total });
  } else {
    serverLogger.info("sitemap: built", { sections, total });
  }

  return all;
}
