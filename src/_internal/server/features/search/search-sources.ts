/**
 * D2 Fix 4 — which collections `/search` spans, and how each row becomes a hit.
 *
 * 🛑 SIX SOURCES, not fifteen. The redirect page maps 15 `SearchResourceType`
 * values, but nine of them are LISTING TYPES inside `products` — auctions,
 * pre-orders, prize-draws, classified, digital-codes, live, art, bundles. One
 * `products` query covers all of them, and a per-type query would be nine
 * fan-outs returning overlapping rows from one collection.
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
] as const;
