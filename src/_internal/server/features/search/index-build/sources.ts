/*
 * WHY: What goes into the public search artifact — an unauthenticated,
 *      immutable, CDN-cached body downloaded by every visitor who searches.
 * WHAT: The membership allowlist and the per-collection record mapping.
 *
 * ## 🛑 MEMBERSHIP IS AN ALLOWLIST. It is deliberately NOT `LISTERS`.
 *
 * `listingProcessor.ts`'s `LISTERS` is a tempting source registry — one entry
 * per collection, already routed through the Sieve adapter, with its own
 * header inviting "a one-line addition". It is the wrong list. Counted
 * 2026-10-19 it holds **20** entries, and four of them are **`users`,
 * `payouts`, `orders`, `notifications`**. "Index everything LISTERS knows
 * about" is one line away from publishing every customer's name to every
 * browser, permanently, for the life of that artifact version.
 *
 * So this file names what is public, and `LISTERS` is only used to READ it.
 * `audit-search-index-artifact` R6 asserts the intersection of this list with
 * the PII and private registries is empty, with "add `users` → must fail" as
 * its negative control.
 *
 * ## 🛑 Every field here was read off the LIVE documents
 *
 * The same rule `search-sources.ts` states, and it earned its keep again:
 * `scammerProfiles` carries `displayNames` (an ARRAY) not `displayName`, and
 * a string read would have produced a null title for every row — the group
 * would simply never have appeared. `partGlossary`'s page needs TWO path
 * segments and its document id already encodes them as `${slot}--${code}`.
 *
 * ## What a record carries, and what it must never carry
 *
 * Title, a one-line detail, a slug and optional facets. No amount of any kind
 * (§ Guest price gating cannot reach an unauthenticated artifact) and no PII.
 *
 * @tag domain:search
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:index-build/build,searchIndexBuild
 * @tag sideEffects:none
 */

import type { SearchIndexType } from "../../../../shared/search/index-record";

/** A projected document's fields, as read from Firestore. */
export type IndexDocData = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** One record under construction. `null` drops the document from the index. */
export interface BuiltRecord {
  readonly title: string;
  readonly detail: string;
  readonly facets?: string;
}

export interface IndexSource {
  /** Matches a `SearchIndexType.key`. */
  readonly typeKey: string;
  readonly collection: string;
  /** Fields to project. A builder reads documents, not whole collections. */
  readonly select: readonly string[];
  /**
   * Extra equality narrowing applied as a query clause. Only use this for a
   * value every public row genuinely carries — otherwise filter in `toRecord`,
   * because a Firestore equality on an absent field matches nothing and an
   * inequality excludes every document lacking it.
   */
  readonly where?: ReadonlyArray<readonly [string, unknown]>;
  /**
   * The record's stable identity, and the artifact's patch key.
   *
   * 🛑 SEPARATE from `toRecord` on purpose. An incremental build must be able
   * to key a document it is REMOVING — one that just became unpublished — and
   * at that moment `toRecord` has returned null and cannot supply a slug. With
   * the slug folded into `toRecord` the two paths keyed differently (doc id on
   * the way out, slug on the way in), which agrees only where slug === id: so
   * every changed product would have been ADDED as a duplicate rather than
   * replaced, while categories and stores looked fine.
   */
  readonly slugOf: (id: string, d: IndexDocData) => string | null;
  readonly toRecord: (id: string, d: IndexDocData) => BuiltRecord | null;
}

/**
 * The type table shipped inside the artifact.
 *
 * 🛑 No `label`. The client maps `key` to a translated string; a heading baked
 * in here could not be localised. Weights are a ranking nudge between types
 * that scored equally, not a statement about importance.
 */
export const INDEX_TYPES: readonly SearchIndexType[] = [
  { key: "product", hrefTemplate: "/products/{s}", moreHref: "/products", weight: 1.0 },
  { key: "category", hrefTemplate: "/categories/{s}", moreHref: "/categories", weight: 0.95 },
  { key: "brand", hrefTemplate: "/brands/{s}", moreHref: "/brands", weight: 0.9 },
  { key: "part", hrefTemplate: "/parts/{s}", moreHref: "/parts", weight: 0.9 },
  { key: "model", hrefTemplate: "/categories/{s}", moreHref: "/categories", weight: 0.85 },
  { key: "store", hrefTemplate: "/stores/{s}", moreHref: "/stores", weight: 0.8 },
  { key: "blog", hrefTemplate: "/blog/{s}", moreHref: "/blog", weight: 0.7 },
  { key: "event", hrefTemplate: "/events/{s}", moreHref: "/events", weight: 0.7 },
  { key: "faq", hrefTemplate: "/faqs/{s}", moreHref: "/faqs", weight: 0.6 },
  { key: "review", hrefTemplate: "/reviews/{s}", moreHref: "/reviews", weight: 0.5 },
  { key: "group", hrefTemplate: "/groups/{s}", moreHref: "/products", weight: 0.5 },
  { key: "scammer", hrefTemplate: "/scams/{s}", moreHref: "/scams", weight: 0.5 },
  /* `/promotions` has no per-coupon page, so `{s}` is absent on purpose and
   * `hrefFor`'s replace is a no-op. Eleven rows all landing on one page would
   * be noise in the federated GROUP (which is why `search-sources.ts` omits
   * coupons), but in the index it is the difference between a code being
   * findable and not. */
  { key: "coupon", hrefTemplate: "/promotions", moreHref: "/promotions", weight: 0.4 },
];

const facet = (pairs: ReadonlyArray<readonly [string, unknown]>): string | undefined => {
  const parts = pairs
    .filter(([, v]) => typeof v === "string" && v)
    .map(([k, v]) => `${k}:${v as string}`);
  return parts.length > 0 ? parts.join("|") : undefined;
};

export const PUBLIC_INDEX_SOURCES: readonly IndexSource[] = [
  {
    typeKey: "product",
    collection: "products",
    where: [["status", "published"]],
    select: ["title", "slug", "brand", "categoryNames", "listingType", "condition", "franchiseSlug"],
    slugOf: (id, d) => str(d.slug) ?? id,
    toRecord: (id, d) => {
      const title = str(d.title);
      if (!title) return null;
      const names = Array.isArray(d.categoryNames) ? (d.categoryNames as string[]) : [];
      return {
        title,
        // Leaf-first, so [0] is the most specific label.
        detail: [str(d.brand), str(names[0])].filter(Boolean).join(" · "),
        facets: facet([
          ["lt", d.listingType],
          ["cn", d.condition],
          ["fr", d.franchiseSlug],
        ]),
      };
    },
  },
  {
    typeKey: "category",
    collection: "categories",
    /*
     * 🛑 No `where` on `categoryType`. A plain listing category OMITS the
     * field entirely — the convention CLAUDE.md records — so `== "category"`
     * matches nothing and `!=` excludes every real row. Brands are their own
     * type below and are rejected here rather than dropped.
     */
    select: ["name", "slug", "categoryType", "path", "isActive"],
    slugOf: (id) => id,
    toRecord: (id, d) => {
      const name = str(d.name);
      if (!name) return null;
      const type = str(d.categoryType);
      if (type && type !== "sublisting") return null;
      if (d.isActive === false) return null;
      return { title: name, detail: str(d.path) ?? "", slug: id };
    },
  },
  {
    typeKey: "brand",
    collection: "categories",
    where: [["categoryType", "brand"]],
    select: ["name", "brandCountry", "isActive"],
    slugOf: (id) => id,
    toRecord: (id, d) => {
      const name = str(d.name);
      if (!name) return null;
      if (d.isActive === false) return null;
      return { title: name, detail: str(d.brandCountry) ?? "", slug: id };
    },
  },
  {
    typeKey: "part",
    collection: "partGlossary",
    select: ["name", "code", "classification", "slot"],
    slugOf: (id) => (id.includes("--") ? id.replace("--", "/") : null),
    toRecord: (id, d) => {
      const name = str(d.name);
      if (!name) return null;
      /*
       * 🛑 TWO path segments, and the document id already encodes them.
       * `ROUTES.PUBLIC.PART_DETAIL` is `/parts/{classification}/{code}`, and
       * the route-map comment explains why a code alone cannot be a URL:
       * "`105` is a Metal Fight spin-track height, a bare number in Burst is
       * a disc, and `1-60` is a Beyblade X ratchet." The id is
       * `${slot}--${code}` (e.g. `armour--1b`), so splitting it is the one
       * derivation guaranteed to agree with the page that exists.
       */
      if (!id.includes("--")) return null;
      const code = str(d.code);
      const classification = str(d.classification);
      return {
        title: name,
        // The classification IS the disambiguation — it is why a user
        // searching "105" can tell three results apart.
        detail: [classification, code].filter(Boolean).join(" · "),
      };
    },
  },
  {
    typeKey: "model",
    collection: "modelComposition",
    select: ["name", "system", "categoryId"],
    slugOf: (_id, d) => str(d.categoryId),
    toRecord: (_id, d) => {
      const name = str(d.name);
      if (!name) return null;
      /*
       * 🛑 A composition has no page of its own — it is rendered on its model
       * CATEGORY page, reached by `categoryId`. Measured in `parts/data.ts`:
       * 210 of 259 join. The 49 that do not are DROPPED rather than linked to
       * a guess, because a search result that navigates to the wrong bey is
       * worse than one that does not exist. The builder reports the count.
       */
      const categoryId = str(d.categoryId);
      if (!categoryId) return null;
      return { title: name, detail: str(d.system) ?? "", slug: categoryId };
    },
  },
  {
    typeKey: "store",
    collection: "stores",
    where: [["status", "active"]],
    // `storeName`, not `name` — read off the live documents.
    select: ["storeName", "storeCategory"],
    slugOf: (id) => id,
    toRecord: (id, d) => {
      const name = str(d.storeName);
      if (!name) return null;
      return { title: name, detail: str(d.storeCategory) ?? "", slug: id };
    },
  },
  {
    typeKey: "blog",
    collection: "blogPosts",
    where: [["status", "published"]],
    select: ["title", "slug", "category", "excerpt"],
    slugOf: (id, d) => str(d.slug) ?? id,
    toRecord: (id, d) => {
      const title = str(d.title);
      if (!title) return null;
      return {
        title,
        detail: str(d.category) ?? (str(d.excerpt) ?? "").slice(0, 90),
      };
    },
  },
  {
    typeKey: "event",
    collection: "events",
    // Three public statuses, one `==` — so it is filtered in memory, the same
    // reason `search-sources.ts` gives.
    select: ["title", "slug", "type", "status"],
    slugOf: (id, d) => str(d.slug) ?? id,
    toRecord: (id, d) => {
      const title = str(d.title);
      if (!title) return null;
      const status = str(d.status);
      if (status === "draft" || status === "cancelled") return null;
      return { title, detail: (str(d.type) ?? "").replace(/_/g, " "), slug: str(d.slug) ?? id };
    },
  },
  {
    typeKey: "faq",
    collection: "faqs",
    where: [["isActive", true]],
    select: ["question", "category"],
    slugOf: (_id, d) => str(d.category),
    toRecord: (_id, d) => {
      const question = str(d.question);
      const category = str(d.category);
      // `/faqs/[category]`, never a question slug — the route matches on the
      // category key and silently falls back to "all" for anything else.
      if (!question || !category) return null;
      return { title: question, detail: category.replace(/_/g, " "), slug: category };
    },
  },
  {
    typeKey: "review",
    collection: "reviews",
    where: [["status", "approved"]],
    // 🛑 `productTitle`, never `userName`. The field exists on the document
    // and is deliberately absent from `buildReviewSearchTxt` because it is
    // encrypted; a public artifact must not carry a reviewer's name.
    select: ["title", "productTitle"],
    slugOf: (id) => id,
    toRecord: (id, d) => {
      const title = str(d.title);
      if (!title) return null;
      return { title, detail: str(d.productTitle) ?? "", slug: id };
    },
  },
  {
    typeKey: "group",
    collection: "groupedListings",
    where: [["isActive", true]],
    select: ["title", "slug", "groupTheme", "visibilityStatus"],
    slugOf: (id, d) => str(d.slug) ?? id,
    toRecord: (id, d) => {
      const title = str(d.title);
      if (!title) return null;
      if (str(d.visibilityStatus) !== "visible") return null;
      return { title, detail: str(d.groupTheme) ?? "", slug: str(d.slug) ?? id };
    },
  },
  {
    typeKey: "scammer",
    collection: "scammerProfiles",
    /*
     * 🛑 `verified` ONLY. Live: verified 3, pending_review 1, rejected 1.
     * Publishing an unaccepted allegation against a named person — with their
     * phone and UPI on the destination page — into an artifact every browser
     * downloads is the most consequential clause in this file.
     */
    where: [["status", "verified"]],
    select: ["displayNames", "scamType", "slug"],
    slugOf: (id, d) => str(d.slug) ?? id,
    toRecord: (id, d) => {
      const names = Array.isArray(d.displayNames) ? (d.displayNames as string[]) : [];
      const title = str(names[0]);
      if (!title) return null;
      return {
        title,
        detail: (str(d.scamType) ?? "").replace(/_/g, " "),
      };
    },
  },
  {
    typeKey: "coupon",
    collection: "coupons",
    select: ["code", "name", "validity"],
    slugOf: (_id, d) => str(d.code),
    toRecord: (_id, d) => {
      const code = str(d.code);
      if (!code) return null;
      const validity = d.validity as { isActive?: boolean } | undefined;
      if (validity?.isActive === false) return null;
      // No amount — the discount VALUE is money and stays out. The code and
      // its name are what someone types.
      return { title: code, detail: str(d.name) ?? "", slug: code };
    },
  },
];

/** Index into `INDEX_TYPES` for a source's type key. */
export function typeIndexFor(typeKey: string): number {
  return INDEX_TYPES.findIndex((t) => t.key === typeKey);
}
