/*
 * WHY: Category, brand and store detail pages each show a listing-type tab bar
 *      and hide a tab whose scope holds nothing. Before this module they each
 *      hand-wrote their own per-type count map, and all three had drifted:
 *      category and brand counted 6 of 10 tabs (classifieds / digital-codes /
 *      live / art fell through to `undefined` and could therefore NEVER hide),
 *      while the store page counted all 9 through eleven copy-pasted queries.
 *      That is Recurrent Root Cause #61 — an enumeration of `ListingType` kept
 *      by hand in more than one place always drifts.
 * WHAT: One function that derives the buckets it counts from the SAME tab array
 *       the tab bar renders, so a tenth listing type is counted automatically.
 *
 * EXPORTS:
 *   ListingTabScope       — the surface's scope (category / brand / store)
 *   ListingTabCounts      — tabSlug -> count, `undefined` meaning "unknown"
 *   ListingTabCountResult — the AVAILABLE and TOTAL maps, see below
 *   listingTabCounts      — resolve every tab's counts in one parallel batch
 *
 * @tag domain:products,categories,stores
 * @tag layer:server
 * @tag pattern:derived-from-registry
 * @tag access:server-only
 * @tag consumers:CategoryDetailPageView,BrandDetailPageView,StoreDetailLayoutView
 * @tag sideEffects:none
 */

import { categoriesRepository, productRepository } from "../../../../repositories";
import { serverLogger } from "../../../../monitoring";
import { normalizeError } from "../../../../errors/normalize";
import { sieveAnd, sieveFilter, SIEVE_OP, sortBy } from "../../../../utils/sieve-builder";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import {
  isListingRowAvailable,
  pluginFor,
} from "../../../shared/listing-types/_registry";
import type {
  AvailabilityRow,
  UnavailableClause,
} from "../../../shared/listing-types/availability";
import { normalizeListingType } from "../../../../features/products/utils/listing-type";
import { clauseToSieve, PUBLIC_PRODUCT_MAX_PAGE_SIZE } from "./list-public";
import type { ListingTab } from "../../../../features/products/constants/listing-tabs";
import type { ListingType } from "../../../../features/products/types/index";
import type { CategoryDocument } from "../../../../features/categories/schemas";

/**
 * Which slice of the catalogue a tab bar is counting. Exactly one of the three
 * scoping fields is set in practice, but the shape is shared so all three
 * surfaces go through one code path.
 */
export interface ListingTabScope {
  /**
   * Category ids to match against `categorySlugs`. Products are tagged with
   * their FULL ancestor chain, so this should be the page's own id alone —
   * expanding descendants is both unnecessary and, past 30 entries, illegal
   * (see `ProductRepository.MAX_ARRAY_CONTAINS_ANY`).
   */
  categoriesIn?: string[];
  /**
   * Brand DISPLAY NAME, not slug. `BrandDetailPageView` matches products on the
   * free-text `brand` field, so the count must use the same field or it would
   * disagree with the rows the tab then shows.
   */
  brandName?: string;
  storeId?: string;
  /** Publication state to count. Defaults to `published`. */
  status?: string;
}

/**
 * tabSlug -> number of rows, or `undefined` when that count could not be
 * resolved.
 *
 * `undefined` is load-bearing: callers hide a tab at zero, so a failed query
 * that reported 0 would hide a tab holding real inventory. Callers must treat
 * `undefined` as "keep the tab visible" (Root Cause #59).
 */
export type ListingTabCounts = Record<string, number | undefined>;

/**
 * The two numbers a tab bar needs, and they are NOT the same number.
 *
 * 🛑 A badge showing `total` while the panel below it defaults to the
 * AVAILABLE scope is a tab that advertises rows it will not render. That was
 * live: a category holding one `prizeRevealStatus: "closed"` draw showed
 * "Prize Draws 1" above "No prize draws found." — accurate counting of the
 * wrong question, Root Cause #72's family.
 *
 *   `available` — what the default scope will render. The BADGE.
 *   `total`     — every published row in scope, across all availability
 *                 scopes. The hide-at-zero decision, and the "N ended —
 *                 view All" hint under an empty panel.
 *
 * 🛑 Hiding must stay keyed on `total`. A tab whose rows have all ended still
 * has a browsable archive behind the Ended/All scopes; hiding it at
 * `available === 0` would make that archive unreachable.
 */
export interface ListingTabCountResult {
  available: ListingTabCounts;
  total: ListingTabCounts;
}

const DEFAULT_STATUS = "published";

/** Bundles a category owns, resolved by the same rule the bundles tab renders. */
async function countBundles(
  scope: ListingTabScope,
): Promise<number | undefined> {
  try {
    const rows = await categoriesRepository.listByType("bundle", {
      activeOnly: true,
      limit: 100,
    });
    return rows.filter((row) => bundleMatchesScope(row, scope)).length;
  } catch (error) {
    void normalizeError(error);
    serverLogger.warn("listingTabCounts: bundle count failed; tab stays visible");
    return undefined;
  }
}

/**
 * Does a bundle belong to the scope being counted?
 *
 * A bundle row carries `brandSlug` and `createdByStoreId` but has no category
 * field of its own, so category membership is derived from the categories its
 * MEMBER products are filed under — mirrored onto `bundleCategorySlugs` for
 * index-friendly reads. Per Root Cause #42 the mirror is never trusted alone:
 * when it is absent the bundle is treated as unscoped rather than as excluded,
 * because silently dropping a bundle whose mirror one write path forgot is the
 * exact failure that entry documents.
 */
function bundleMatchesScope(
  bundle: CategoryDocument,
  scope: ListingTabScope,
): boolean {
  if (scope.storeId) return bundle.createdByStoreId === scope.storeId;
  if (scope.brandName) return true; // brand pages filter by slug at the call site
  if (scope.categoriesIn && scope.categoriesIn.length > 0) {
    const mirror = bundle.bundleCategorySlugs;
    if (!mirror || mirror.length === 0) return true;
    return mirror.some((slug) => scope.categoriesIn!.includes(slug));
  }
  return true;
}

/** `listingType` -> how many rows in scope the availability predicate rejects. */
interface UnavailableTally {
  byType: Map<ListingType, number>;
  /**
   * Types whose tally is a FLOOR rather than a count, because a clause they
   * depend on failed or saturated its window. Subtracting a floor yields an
   * UPPER BOUND, so these report the total instead of a number that is
   * quietly too high.
   *
   * 🛑 PER TYPE, not one global flag. The equality clauses are index-free
   * (Firestore merge-joins them), but the auction clause is an inequality and
   * needs a composite index per scope — so under a global flag one missing
   * index would cost accurate badges on all NINE types. Narrow degradation is
   * the difference between a feature that mostly works and one that is inert.
   */
  unknown: Set<ListingType>;
}

/**
 * How many rows in scope are NOT available, per listing type.
 *
 * ── 🛑 WHY THIS IS NOT AN AGGREGATE COUNT ─────────────────────────────────
 *
 * Two independent reasons, either of which alone is disqualifying.
 *
 * 1. Unavailability is an OR across DIFFERENT fields (`availableQuantity == 0`
 *    OR `isSold == true` OR `prizeRevealStatus == closed` …). Firestore cannot
 *    express that in one query, and counting each clause separately and adding
 *    them double-counts every row matching two of them.
 *
 * 2. A clause selects a SUPERSET, deliberately. `madeToOrder` is pointedly NOT
 *    a clause (see the note in `availability.ts`), so a print-on-demand sticker
 *    sitting at `availableQuantity: 0` matches `availableQuantity == 0` and is
 *    nevertheless AVAILABLE. Only `isListingRowAvailable` knows that, and it is
 *    a per-row predicate. Measured on the category that prompted this work,
 *    a clause-count would have badged "Art & Stickers 2" over three available
 *    rows — trading one wrong number for another.
 *
 * So this is Path C of `listPublicProducts` reused in miniature: one bounded
 * query per DISTINCT clause, in parallel, merged and deduped by id, then every
 * surviving row confirmed with the real predicate. Nine listing types collapse
 * to five clauses, so the whole tab bar costs ~5 × 50 documents in one parallel
 * round — the same fan-out and the same budget that scope already spends.
 *
 * 🛑 The queries are NOT narrowed to the tab's listing types. Firestore permits
 * one array operator per query and the category scope already spends it on
 * `categorySlugs array-contains-any`, so adding `listingType in (…)` risks an
 * INVALID_ARGUMENT for no gain: unavailable rows are sparse, and tallying each
 * row by its own `listingType` afterwards answers every tab from one pass.
 */
async function unavailableByType(
  scope: ListingTabScope,
  types: readonly ListingType[],
  now: Date,
): Promise<UnavailableTally> {
  const byType = new Map<ListingType, number>();
  const unknown = new Set<ListingType>();

  /*
   * One entry per DISTINCT clause, remembering which types depend on it, so a
   * clause that cannot run takes down only those types' badges.
   */
  const distinct = new Map<
    string,
    { clause: UnavailableClause; types: Set<ListingType> }
  >();
  for (const type of types) {
    for (const clause of pluginFor(type).unavailableClauses) {
      const key = clause.field + "|" + clause.op + "|" + String(clause.value);
      const entry = distinct.get(key) ?? { clause, types: new Set<ListingType>() };
      entry.types.add(type);
      distinct.set(key, entry);
    }
  }
  if (distinct.size === 0) return { byType, unknown };

  const status = scope.status ?? DEFAULT_STATUS;
  const results = await Promise.all(
    [...distinct.values()].map(async (entry) => {
      const { clause } = entry;
      /*
       * 🛑 NO SORT on an equality clause — load-bearing, not an omission.
       *
       * A tally does not care about order, and adding `orderBy createdAt`
       * turns a query Firestore can merge-join from single-field indexes into
       * one demanding a composite index PER CLAUSE PER SCOPE: fifteen new
       * indexes on a collection already carrying 223, every one of them write
       * amplification on every product write. Measured against the live
       * project: all four equality clauses run index-free without the sort and
       * return FAILED_PRECONDITION with it.
       *
       * An inequality is the exception Firestore forces — its first `orderBy`
       * must be its own field (Root Cause #59) — so that one clause does need
       * an index, which is exactly why `unknown` is tracked per type.
       */
      const sorts =
        clause.op === "lt" && clause.sortField
          ? sortBy(clause.sortField, "DESC")
          : undefined;
      try {
        const result = await productRepository.list(
          {
            filters: sieveAnd(
              sieveFilter(PRODUCT_FIELDS.STATUS, SIEVE_OP.EQ, status),
              clauseToSieve(clause, now),
            ),
            ...(sorts ? { sorts } : {}),
            page: 1,
            pageSize: PUBLIC_PRODUCT_MAX_PAGE_SIZE,
          },
          {
            storeId: scope.storeId,
            categoriesIn: scope.categoriesIn,
            brandName: scope.brandName,
          },
        );
        return { entry, result };
      } catch (error) {
        const e = normalizeError(error);
        // ERROR, not warn: a clause that cannot run is almost always a missing
        // composite index — a permanent, silent skew of the badges that depend
        // on it rather than a transient blip. The fields are named so the log
        // says which index to create.
        serverLogger.error(
          "listingTabCounts: unavailable clause failed; those badges fall back to totals",
          {
            field: clause.field,
            op: clause.op,
            types: [...entry.types],
            error: e.message,
          },
        );
        return { entry, result: null };
      }
    }),
  );

  const merged = new Map<string, AvailabilityRow>();
  for (const { entry, result } of results) {
    if (!result) {
      for (const type of entry.types) unknown.add(type);
      continue;
    }
    const rows = result.items as unknown as AvailabilityRow[];
    // A saturated window means there are more unavailable rows than were seen,
    // so the tally is a floor for every type this clause serves.
    if (rows.length >= PUBLIC_PRODUCT_MAX_PAGE_SIZE) {
      for (const type of entry.types) unknown.add(type);
    }
    for (const row of rows) {
      const id = typeof row.id === "string" ? row.id : JSON.stringify(row.id);
      if (!merged.has(id)) merged.set(id, row);
    }
  }

  for (const row of merged.values()) {
    // The clause matched a superset; this is the real answer.
    if (isListingRowAvailable(row, now)) continue;
    const type = normalizeListingType(row);
    byType.set(type, (byType.get(type) ?? 0) + 1);
  }
  return { byType, unknown };
}

/** The listing types one tab spans — `"art|stickers"` is a pipe OR-group. */
function typesOf(tab: ListingTab): ListingType[] {
  return String(tab.listingType).split("|").filter(Boolean) as ListingType[];
}

/**
 * Count every tab in `tabs` within `scope`, in one parallel batch.
 *
 * The listing-type buckets come from each tab's own `listingType` field — which
 * already carries `"art|stickers"` as a pipe OR-group — so this function never
 * enumerates the `ListingType` union itself and cannot drift from it.
 *
 * `stores` is not counted here: only the category page has that tab and it
 * already resolves its store list eagerly to render the tab body.
 */
export async function listingTabCounts(
  tabs: readonly ListingTab[],
  scope: ListingTabScope,
  opts?: { now?: Date },
): Promise<ListingTabCountResult> {
  const now = opts?.now ?? new Date();
  const listingTabs = tabs.filter((tab) => Boolean(tab.listingType));
  const wantsBundles = tabs.some((tab) => tab.collection === "bundles");
  const allTypes = [...new Set(listingTabs.flatMap(typesOf))];

  const [typeCounts, bundleCount, unavailable] = await Promise.all([
    productRepository.countByListingTypes(
      listingTabs.map((tab) => String(tab.listingType)),
      {
        status: scope.status ?? DEFAULT_STATUS,
        storeId: scope.storeId,
        categoriesIn: scope.categoriesIn,
        brandName: scope.brandName,
      },
    ),
    wantsBundles ? countBundles(scope) : Promise.resolve(undefined),
    unavailableByType(scope, allTypes, now),
  ]);

  const total: ListingTabCounts = {};
  const available: ListingTabCounts = {};
  for (const tab of listingTabs) {
    const tabTypes = typesOf(tab);
    const totalForTab = typeCounts[String(tab.listingType)];
    total[tab.id] = totalForTab;
    if (
      totalForTab === undefined ||
      tabTypes.some((t) => unavailable.unknown.has(t))
    ) {
      // Falling back to the total reproduces the pre-split badge rather than
      // inventing a number — and it keeps the hint silent, because the hint
      // only speaks when both figures are known.
      available[tab.id] = totalForTab;
      continue;
    }
    const gone = tabTypes.reduce(
      (sum, type) => sum + (unavailable.byType.get(type) ?? 0),
      0,
    );
    available[tab.id] = Math.max(0, totalForTab - gone);
  }
  if (wantsBundles) {
    // A bundle has no availability scope of its own — the bundles tab renders
    // active bundle ROWS, not products, so the two numbers are one number.
    total.bundles = bundleCount;
    available.bundles = bundleCount;
  }
  return { available, total };
}
