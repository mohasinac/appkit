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
  unavailableClausesFor,
} from "../../../shared/listing-types/_registry";
import type { AvailabilityRow } from "../../../shared/listing-types/availability";
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
   * A clause query saturated its window or failed outright. The tally is then
   * a FLOOR, so a subtraction from `total` yields only an UPPER BOUND on
   * `available` — reported as the total rather than as a number that is
   * quietly too high.
   */
  truncated: boolean;
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
  const clauses = unavailableClausesFor(types);
  if (clauses.length === 0) return { byType, truncated: false };

  const status = scope.status ?? DEFAULT_STATUS;
  const results = await Promise.all(
    clauses.map(async (clause) => {
      // An inequality must be ordered by its own field — Firestore appends it
      // to the `orderBy` implicitly, so any other sort demands a composite
      // index nobody declared (Root Cause #59).
      const sorts =
        clause.op === "lt" && clause.sortField
          ? sortBy(clause.sortField, "DESC")
          : sortBy(PRODUCT_FIELDS.CREATED_AT, "DESC");
      try {
        return await productRepository.list(
          {
            filters: sieveAnd(
              sieveFilter(PRODUCT_FIELDS.STATUS, SIEVE_OP.EQ, status),
              clauseToSieve(clause, now),
            ),
            sorts,
            page: 1,
            pageSize: PUBLIC_PRODUCT_MAX_PAGE_SIZE,
          },
          {
            storeId: scope.storeId,
            categoriesIn: scope.categoriesIn,
            brandName: scope.brandName,
          },
        );
      } catch (error) {
        const e = normalizeError(error);
        // ERROR, not warn: a clause that cannot run is almost always a missing
        // composite index — a permanent, silent skew of every badge on the
        // page rather than a transient blip.
        serverLogger.error(
          `listingTabCounts: unavailable clause failed (${clause.field} ${clause.op}); badges fall back to totals`,
          { field: clause.field, op: clause.op, error: e.message },
        );
        return null;
      }
    }),
  );

  const merged = new Map<string, AvailabilityRow>();
  let truncated = false;
  for (const result of results) {
    if (!result) {
      truncated = true;
      continue;
    }
    const rows = result.items as unknown as AvailabilityRow[];
    if (rows.length >= PUBLIC_PRODUCT_MAX_PAGE_SIZE) truncated = true;
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
  return { byType, truncated };
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
    const totalForTab = typeCounts[String(tab.listingType)];
    total[tab.id] = totalForTab;
    if (totalForTab === undefined || unavailable.truncated) {
      // Unknown beats a number that is quietly too high. Falling back to the
      // total reproduces the pre-2026-10-20 badge rather than inventing one.
      available[tab.id] = totalForTab;
      continue;
    }
    const gone = typesOf(tab).reduce(
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
