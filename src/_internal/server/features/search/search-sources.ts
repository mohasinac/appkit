/**
 * D2 Fix 4 — which collections `/search` spans, and how each row becomes a hit.
 *
 * 🛑 NINE SOURCES, not fifteen. The redirect page maps 15 `SearchResourceType`
 * values, but nine of them are LISTING TYPES inside `products` — auctions,
 * pre-orders, random-lots, classified, digital-codes, live, art, bundles. One
 * `products` query covers all of them, and a per-type query would be nine
 * fan-outs returning overlapping rows from one collection.
 *
 * 🛑 THREE MORE WERE PLANNED FOR THIS PASS AND DELIBERATELY LEFT OUT. Each
 * would have been a source that renders as a working group and matches
 * nothing, which is worse than an absent one:
 *
 *   partGlossary (752 rows) and groupedListings (10) — **0% `searchTxt`
 *     coverage**, measured 2026-10-19. This file's mechanism is a single
 *     `array-contains` push-down on that field, so a source over either
 *     returns zero rows for every query, forever, with a 200. They are the
 *     headline gap and they are answered by the prebuilt client index, which
 *     needs a title and a slug rather than tokens — not by adding a token
 *     writer for 762 documents to serve a query path that index replaces.
 *
 *   coupons — 100% token coverage, but there is no per-coupon public route.
 *     Every hit would link to `/promotions`, which is already this group's
 *     `moreHref`, so eleven rows would all point at one page. The code is
 *     worth finding; a group of identical links is not the way.
 *
 * 🛑 Every field here was read off the live documents, not assumed. `stores`
 * uses `storeName` (not `name`), `faqs` uses `question` + `seo.slug`, and
 * `categories` must be filtered to listing rows because brands and bundles
 * share the collection — the same trap that made the `/products` category
 * facet offer "Takara-Tomy" as a browsable category (A1 item 4).
 */
// Imported from the DEFINING module, not a barrel (Root Cause #18) — and
// never from `@mohasinac/appkit/client`, which is `"use client"` and would
// make ROUTES a client-reference proxy in this server file (Root Cause #76).
import { ROUTES } from "../../../../next/routing/route-map";
import type { SearchSource, SearchHit, SearchDocData } from "./search-everything";

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

const withQ = (base: string, q: string) =>
  q.trim() ? `${base}?q=${encodeURIComponent(q.trim())}` : base;

export const SEARCH_SOURCES: readonly SearchSource[] = [
  {
    key: "products",
    label: "Listings",
    collection: "products",
    /*
     * 🛑 `status == published` ONLY. Availability is a per-row predicate over
     * nine listing types (section 4.4: "available" is negation-shaped and no query
     * expresses it), so a sold-out row can appear here — and that is correct
     * for a search page, which answers "do you have this" rather than "can I
     * buy it right now". The listing page it links to applies the scope.
     */
    where: [["status", "published"]],
    select: ["title", "slug", "listingType", "categoryNames", "brand"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const title = str(d.title);
      if (!title) return null;
      const names = Array.isArray(d.categoryNames) ? (d.categoryNames as string[]) : [];
      // The chain is stored LEAF-FIRST, so [0] is the most specific label.
      const detail = [str(d.brand), names[0]].filter(Boolean).join(" · ");
      return {
        id,
        title,
        href: `/products/${str(d.slug) ?? id}`,
        ...(detail ? { detail } : {}),
      };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.PRODUCTS, q),
  },
  {
    key: "categories",
    label: "Categories",
    collection: "categories",
    select: ["name", "categoryType", "tier", "categoryNames"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const name = str(d.name);
      if (!name) return null;
      /*
       * 🛑 BRANDS AND BUNDLES SHARE THIS COLLECTION, and a plain listing
       * category OMITS `categoryType` entirely — so this cannot be a query
       * clause and has to be an in-memory test. Exactly the situation that
       * made the `/products` facet offer "Takara-Tomy" and "Burst Battlers
       * Pack" as browsable categories (A1 item 4): 9 of its 11 options were
       * not categories.
       *
       * Brands are their own group below, so they are excluded here rather
       * than dropped.
       */
      const type = str(d.categoryType);
      if (type && type !== "sublisting") return null;
      return { id, title: name, href: `/categories/${id}` };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.CATEGORIES, q),
  },
  {
    key: "brands",
    label: "Brands",
    collection: "categories",
    // The one source with a real discriminator value to filter on.
    where: [["categoryType", "brand"]],
    select: ["name", "brandCountry"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const name = str(d.name);
      if (!name) return null;
      const detail = str(d.brandCountry);
      return { id, title: name, href: `/brands/${id}`, ...(detail ? { detail } : {}) };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.BRANDS, q),
  },
  {
    key: "stores",
    label: "Stores",
    collection: "stores",
    where: [["status", "active"]],
    // 🛑 `storeName`, not `name` — read off the live documents.
    select: ["storeName", "storeCategory"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const name = str(d.storeName);
      if (!name) return null;
      return { id, title: name, href: `/stores/${id}` };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.STORES, q),
  },
  {
    key: "blog",
    label: "Articles",
    collection: "blogPosts",
    where: [["status", "published"]],
    select: ["title", "slug", "category"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const title = str(d.title);
      if (!title) return null;
      const detail = str(d.category);
      return {
        id,
        title,
        href: `/blog/${str(d.slug) ?? id}`,
        ...(detail ? { detail } : {}),
      };
    },
    moreHref: (q) => withQ(ROUTES.BLOG.LIST, q),
  },
  {
    key: "faqs",
    label: "Help & FAQs",
    collection: "faqs",
    where: [["isActive", true]],
    select: ["question", "category", "seo"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const question = str(d.question);
      if (!question) return null;
      const category = str(d.category);
      /*
       * 🛑 `/faqs/[category]`, never a question slug. The route matches on
       * `CATEGORY_KEYS.includes(category)` and falls back to "all", so a slug
       * silently lands the reader on the full index — and the documents DO
       * carry a `seo.slug` of exactly that shape, which makes the wrong link
       * the obvious one. Same trap the authenticity hero slide hit.
       */
      return {
        id,
        title: question,
        href: category ? ROUTES.PUBLIC.FAQ_CATEGORY(category) : ROUTES.PUBLIC.FAQS,
        ...(category ? { detail: category.replace(/_/g, " ") } : {}),
      };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.FAQS, q),
  },
  {
    key: "events",
    label: "Events",
    collection: "events",
    /*
     * 🛑 No `where` clause, and that is forced rather than lazy. Measured on
     * the live collection: `active` 8, `draft` 1, `paused` 1, `ended` 1,
     * `cancelled` 1. The public set is "not draft, not cancelled" — three
     * values — and `where` here applies `==` only, so a single clause would
     * either publish drafts or hide every paused and ended event. Firestore
     * cannot express the negation either (Root Cause #59). Same in-memory
     * shape the `categories` source uses, for the same reason.
     *
     * `ended` stays visible deliberately: a search answers "do you have this",
     * and an event that happened is a real answer with a real page.
     */
    select: ["title", "slug", "type", "status"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const title = str(d.title);
      if (!title) return null;
      const status = str(d.status);
      if (status === "draft" || status === "cancelled") return null;
      const detail = str(d.type);
      return {
        id,
        title,
        href: ROUTES.PUBLIC.EVENT_DETAIL(str(d.slug) ?? id),
        ...(detail ? { detail: detail.replace(/_/g, " ") } : {}),
      };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.EVENTS, q),
  },
  {
    key: "reviews",
    label: "Reviews",
    collection: "reviews",
    // All 79 live rows are `approved`; the clause is still explicit, because a
    // rejected review surfacing publicly is the failure that matters here.
    where: [["status", "approved"]],
    /*
     * 🛑 `productTitle` as the detail, NEVER `userName`. The field exists on
     * the document and is deliberately absent from `buildReviewSearchTxt`
     * because it is encrypted; `maskPublicReview` is what the public read path
     * uses. A search hit is a public surface and has no business carrying a
     * reviewer's name even in a subtitle.
     */
    select: ["title", "productTitle", "status"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const title = str(d.title);
      if (!title) return null;
      const detail = str(d.productTitle);
      return {
        id,
        title,
        href: ROUTES.PUBLIC.REVIEW_DETAIL(id),
        ...(detail ? { detail } : {}),
      };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.REVIEWS, q),
  },
  {
    key: "scammers",
    label: "Scam reports",
    collection: "scammerProfiles",
    /*
     * 🛑 `verified` ONLY, and this clause is the whole point of the source.
     * Measured live: `verified` 3, `pending_review` 1, `rejected` 1. Surfacing
     * an unverified or rejected accusation in site-wide search publishes an
     * allegation the moderation queue has not accepted — against a named
     * person, with their phone and UPI on the page. The scam registry is
     * deliberately public and plaintext-indexed for SEO, which makes getting
     * this clause right more load-bearing here than anywhere else, not less.
     */
    where: [["status", "verified"]],
    /*
     * 🛑 `displayNames` is an ARRAY, not a string — read off the live
     * documents, which is what this file's header asks for and what caught it.
     * A `str(d.displayName)` would have returned null for every row and the
     * group would simply never have appeared.
     */
    select: ["displayNames", "scamType", "slug"],
    toHit: (id: string, d: SearchDocData): SearchHit | null => {
      const names = Array.isArray(d.displayNames) ? (d.displayNames as string[]) : [];
      const title = str(names[0]);
      if (!title) return null;
      const detail = str(d.scamType);
      return {
        id,
        title,
        href: ROUTES.PUBLIC.SCAM_DETAIL(str(d.slug) ?? id),
        ...(detail ? { detail: detail.replace(/_/g, " ") } : {}),
      };
    },
    moreHref: (q) => withQ(ROUTES.PUBLIC.SCAMS, q),
  },
] as const;
