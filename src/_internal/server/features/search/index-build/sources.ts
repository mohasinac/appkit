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
import type { FirestoreValue } from "../../../../../schemas/types";
import { pluginFor } from "../../../../shared/listing-types/_registry";
// Defined here, not in `_registry` — imported from the DEFINING module
// (Root Cause #18).
import { ALL_LISTING_TYPES } from "../../../../shared/listing-types/feature-flags";
import type { ListingType } from "../../../../../features/products/types";

/*
 * 🛑 `FirestoreValue`, not `unknown`. `Record<string, unknown>` is what
 * `audit-unknown-leakage` refuses and it is right to: it says nothing about
 * what a document can hold, so every read needs a cast and the cast is where
 * this codebase's boundary bugs live (Root Cause #57, #70, #98).
 * `search-everything.ts` already made this exact choice for the same reason.
 */
export type IndexDocData = Record<string, FirestoreValue>;

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
  /**
   * Resolve the type PER DOCUMENT, when one collection holds several.
   * `products` is the only such collection today: all nine listing types live
   * in it and each has its own detail route.
   */
  readonly typeKeyOf?: (d: IndexDocData) => string;
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
  /*
   * 🛑 ONE ENTRY PER LISTING TYPE, DERIVED from the plugin registry — not one
   * `product` entry for the whole collection.
   *
   * The first draft had a single `{ key: "product", hrefTemplate:
   * "/products/{s}" }`, which is Root Cause #48 rebuilt from scratch: "a
   * per-listing-type detailRoute() that silently defaults to the standard
   * product page". An auction lives at `/auctions/{slug}`, a pre-order at
   * `/pre-orders/{slug}`, a classified at `/classified/{slug}`. Every one of
   * those results would have rendered correctly and navigated to the wrong
   * page — the exact failure that made non-standard listings "revert to
   * standard" the first time.
   *
   * `detailRoute` and `browseRoute` come from `pluginFor`, so a tenth listing
   * type is covered the day it is added rather than the day someone notices.
   * Hand-writing them here would be the eleventh enumeration of that union
   * (Root Cause #61).
   */
  ...ALL_LISTING_TYPES.map((t: ListingType): SearchIndexType => {
    const plugin = pluginFor(t);
    return {
      key: t,
      // `detailRoute` builds a concrete path, so hand it the placeholder and
      // let it produce the template. One source of truth, no second mapping.
      hrefTemplate: plugin.detailRoute("{s}"),
      moreHref: String(plugin.browseRoute),
      // Standard listings are the catalogue's centre of gravity; the rest sit
      // just below so a same-score tie favours the commonest thing.
      weight: t === "standard" ? 1.0 : 0.98,
    };
  }),
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
    /*
     * 🛑 The type key is RESOLVED PER DOCUMENT — see `typeKeyOf`. A source
     * normally maps one collection to one type, but `products` holds all nine
     * listing types and each has its own detail route.
     */
    typeKey: "standard",
    typeKeyOf: (d) => {
      const lt = str(d.listingType);
      return lt && (ALL_LISTING_TYPES as readonly string[]).includes(lt) ? lt : "standard";
    },
    collection: "products",
    where: [["status", "published"]],
    select: ["title", "slug", "brand", "categoryNames", "listingType", "condition", "franchiseSlug"],
    slugOf: (id, d) => str(d.slug) ?? id,
    toRecord: (id, d) => {
      const title = str(d.title);
      if (!title) return null;
      const names = Array.isArray(d.categoryNames) ? (d.categoryNames as string[]) : [];
      /*
       * 🛑 The enum VALUES go in `detail`, which is SEARCHED — the `facets`
       * string is filter-only and never matched as text. Without this,
       * typing "auction" or "sealed" finds nothing, because the only place
       * those words appeared was a facet nobody searches. Humanised, so
       * "pre-order" and "digital code" read as words rather than slugs.
       */
      /*
       * Capitalised, not just de-slugged.
       *
       * This returned the lowercase value, so a shopper's result subtitle read
       * "Beyblade · Victory Valkyrie Boost Variable · standard · new" — two
       * database values sitting in a line of otherwise presentable text, which
       * is the audit's "subtitles print raw field values".
       *
       * 🛑 Casing is FREE here, which is the only reason to do it in the index
       * rather than at the renderer. `prepareIndex` matches through
       * `normalizeSearchText`, which lowercases both the haystack and the
       * query — so "Standard" is still found by typing "standard", and the
       * searchability this field exists for (see the note above) is untouched.
       * The alternative, a second display-only string per record, would grow
       * every row of an index the client downloads.
       */
      const human = (v: unknown) => {
        const words = (str(v) ?? "").replace(/[-_]/g, " ").trim();
        return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
      };
      return {
        title,
        // Leaf-first, so [0] is the most specific label.
        detail: [
          str(d.brand),
          str(names[0]),
          human(d.listingType),
          human(d.condition),
        ]
          .filter(Boolean)
          .join(" · "),
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
    /*
     * 🛑 `aliases` IS IN THE SELECT BECAUSE AN ABBREVIATION IS HOW PEOPLE
     * SEARCH FOR A PART.
     *
     * The wiki states a part's short form outright, and it reaches 1,072 of
     * 2,490 rows: `EWD` is Eternal Wide Defense, `BWD` is Big Wide Defense,
     * `ES` is Eternal Spike. Those are the names printed on the part and the
     * names the community uses — but they lived only in Firestore, because
     * this select carried name/code/classification/slot and nothing else.
     *
     * So the data was there, the page was there, and searching `EWD` found
     * NOTHING. A gap between holding a fact and being able to find it is
     * invisible from either end.
     *
     * 🛑 It must be `aliases`, not `aka`. The generator UNIONS the wiki's
     * `aka` into the pre-existing `aliases` array rather than replacing it,
     * so `aliases` is the superset — selecting `aka` would silently drop
     * every alias the corpus contributed.
     */
    select: ["name", "code", "classification", "slot", "aliases"],
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
      /*
       * The abbreviations, appended to `detail` because that is the only
       * other field the record carries and the matcher reads both.
       *
       * 🛑 Bounded to four and de-duplicated against the name and code. A
       * part can carry a dozen aliases, and the artifact is a public file
       * fetched by every visitor — the whole point of it is that it stays
       * small enough to ship whole. Four covers the abbreviation plus the
       * other vendor's name, which is what anyone actually types.
       */
      const aliases = Array.isArray(d.aliases) ? d.aliases.map(str).filter(Boolean) : [];
      const seen = new Set([name.toLowerCase(), (code ?? "").toLowerCase()]);
      const extra: string[] = [];
      for (const a of aliases) {
        const k = String(a).toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        extra.push(String(a));
        if (extra.length === 4) break;
      }
      return {
        title: name,
        // The classification IS the disambiguation — it is why a user
        // searching "105" can tell three results apart.
        detail: [classification, code, ...extra].filter(Boolean).join(" · "),
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
