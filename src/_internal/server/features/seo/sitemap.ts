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
      .select(PRODUCT_SLUG, PRODUCT_UPDATED_AT)
      .limit(5000)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn("sitemap: failed to fetch product URLs", { error: err });
    return [];
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
      .select(PRODUCT_SLUG, PRODUCT_UPDATED_AT)
      .limit(2000)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn(`sitemap: failed to fetch ${label} URLs`, { error: err });
    return [];
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
      .select(PRODUCT_SLUG, PRODUCT_UPDATED_AT)
      .limit(2000)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn("sitemap: failed to fetch auction URLs", { error: err });
    return [];
  }
}

async function fetchEventUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(EVENTS_COLLECTION)
      .where(EVENT_FIELDS.STATUS, "==", EVENT_FIELDS.STATUS_VALUES.ACTIVE)
      .select(EVENT_FIELDS.UPDATED_AT, EVENT_FIELDS.SLUG)
      .limit(500)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn("sitemap: failed to fetch event URLs", { error: err });
    return [];
  }
}

// categories is a discriminated-union collection (categoryType: "listing" |
// "brand" | "bundle" — see CLAUDE.md's SB-UNI-C/SB-UNI-D). Each discriminator
// renders at a different public route, so each needs its own filtered query;
// querying the collection without a categoryType filter (the prior bug here)
// mapped brand/bundle rows onto the wrong /categories/{slug} URL.
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
      .select(CATEGORY_FIELDS.SLUG, CATEGORY_FIELDS.UPDATED_AT)
      .limit(500)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn(`sitemap: failed to fetch ${label} URLs`, { error: err });
    return [];
  }
}

const fetchCategoryUrls = (baseUrl: string) =>
  fetchCategoryTypeUrls(baseUrl, "listing", (slug) => ROUTES.PUBLIC.CATEGORY_DETAIL(slug), "category");

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
    return [];
  }
}

async function fetchBlogPostUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(BLOG_POSTS_COLLECTION)
      .where(BLOG_POST_FIELDS.STATUS, "==", BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED)
      .select(BLOG_POST_FIELDS.SLUG, BLOG_POST_FIELDS.PUBLISHED_AT, BLOG_POST_FIELDS.UPDATED_AT)
      .limit(1000)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn("sitemap: failed to fetch blog post URLs", { error: err });
    return [];
  }
}

async function fetchStoreUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(STORE_COLLECTION)
      .where(STORE_FIELDS.STATUS, "==", STORE_FIELDS.STATUS_VALUES.ACTIVE)
      .where(STORE_FIELDS.IS_PUBLIC, "==", true)
      .select(STORE_FIELDS.STORE_SLUG, STORE_FIELDS.UPDATED_AT)
      .limit(1000)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn("sitemap: failed to fetch store URLs", { error: err });
    return [];
  }
}

async function fetchScammerUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(SCAMMER_COLLECTION)
      .where(PRODUCT_FIELDS.STATUS, "==", "verified")
      .select("seo", "updatedAt")
      .limit(2000)
      .get();
    return snap.docs.map((doc) => {
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
    serverLogger.warn("sitemap: failed to fetch scammer URLs", { error: err });
    return [];
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
  return [
    ...staticPages(baseUrl),
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
