import { normalizeError } from "../../../../errors/normalize";
import type { MetadataRoute } from "next";
import { getAdminDb } from "../../../../providers/db-firebase";
import { ROUTES } from "../../../../next/routing/route-map";
import { PRODUCT_COLLECTION } from "../../../..";
import { EVENTS_COLLECTION, EVENT_FIELDS } from "../../../../features/events";
import { BLOG_POSTS_COLLECTION, BLOG_POST_FIELDS } from "../../../../features/blog";
import { CATEGORIES_COLLECTION, CATEGORY_FIELDS } from "../../../../features/categories";
import { STORE_COLLECTION, STORE_FIELDS } from "../../../../features/stores";
import { SCAMMER_COLLECTION } from "../../../../features/scams/schemas/firestore";
import { serverLogger } from "../../../../monitoring/server-logger";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";

// Product field strings — matches consumer field-names.ts
const PRODUCT_STATUS = "status";
const PRODUCT_STATUS_PUBLISHED = "published";
const PRODUCT_SLUG = "slug";
const PRODUCT_UPDATED_AT = "updatedAt";

/**
 * Tester-sandbox fixtures must never reach the public sitemap. They are created
 * and destroyed on a cycle by `testerSandboxCleanup` and by each tester run's
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

function staticPages(baseUrl: string): MetadataRoute.Sitemap {
  const page = (path: string, changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"], priority: number) =>
    ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: changeFreq, priority });
  return [
    page(String(ROUTES.HOME), "daily", 1.0),
    page(String(ROUTES.PUBLIC.PRODUCTS), "hourly", 0.9),
    page(String(ROUTES.PUBLIC.AUCTIONS), "hourly", 0.9),
    page(String(ROUTES.PUBLIC.CATEGORIES), "weekly", 0.8),
    page(String(ROUTES.PUBLIC.BRANDS), "weekly", 0.7),
    page(String(ROUTES.PUBLIC.BLOG), "daily", 0.7),
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
    page(String(ROUTES.PUBLIC.PRIZE_DRAWS), "daily", 0.7),
    page(String(ROUTES.PUBLIC.CLASSIFIED), "daily", 0.6),
    page(String(ROUTES.PUBLIC.DIGITAL_CODES), "daily", 0.6),
    page(String(ROUTES.PUBLIC.LIVE), "hourly", 0.7),
    page(String(ROUTES.PUBLIC.ART), "weekly", 0.6),
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

// "art" and "stickers" listing types render at the same PRODUCT_DETAIL route
// as "standard" (see route-map.ts's ART comment) — no dedicated detail page.
const PRODUCT_DETAIL_LISTING_TYPES = ["standard", "art", "stickers"];

async function fetchProductUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_STATUS, "==", PRODUCT_STATUS_PUBLISHED)
      .where("listingType", "in", PRODUCT_DETAIL_LISTING_TYPES)
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
  fetchListingTypeUrls(baseUrl, "prize-draw", (slug) => ROUTES.PUBLIC.PRIZE_DRAW_DETAIL(slug), "prize-draw");

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
    const snap = await db
      .collection(CATEGORIES_COLLECTION)
      .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", categoryType)
      .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
      .select(CATEGORY_FIELDS.SLUG, CATEGORY_FIELDS.UPDATED_AT, TEST_DATA_FIELD)
      .limit(500)
      .get();
    return snap.docs
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
 */
const NON_LISTING_CATEGORY_TYPES = new Set(["brand", "bundle", "sublisting"]);

async function fetchCategoryUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(CATEGORIES_COLLECTION)
      .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
      .select(
        CATEGORY_FIELDS.SLUG,
        CATEGORY_FIELDS.UPDATED_AT,
        CATEGORY_FIELDS.CATEGORY_TYPE,
        TEST_DATA_FIELD,
      )
      .limit(500)
      .get();
    return snap.docs
      .filter((doc) => {
        const data = doc.data();
        if (isTestDoc(data)) return false;
        const kind = data[CATEGORY_FIELDS.CATEGORY_TYPE];
        return typeof kind !== "string" || !NON_LISTING_CATEGORY_TYPES.has(kind);
      })
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

export async function buildSitemap({ baseUrl }: SitemapOptions): Promise<MetadataRoute.Sitemap> {
  const [
    productUrls,
    categoryUrls,
    brandUrls,
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
  ] = await Promise.all([
    fetchProductUrls(baseUrl),
    fetchCategoryUrls(baseUrl),
    fetchBrandUrls(baseUrl),
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
  };
  const empty = Object.entries(sections)
    .filter(([, n]) => n === 0)
    .map(([name]) => name);
  const total = Object.values(sections).reduce((a, b) => a + b, 0);

  if (empty.length > 0) {
    serverLogger.warn(`sitemap: ${empty.length} section(s) produced 0 URLs`, { empty, sections, total });
  } else {
    serverLogger.info("sitemap: built", { sections, total });
  }

  return [
    ...staticUrls,
    ...categoryUrls,
    ...brandUrls,
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
  ];
}
