/**
 * The price-index SEARCH tool — resolve a query to leaves, return their bands.
 *
 * ## 🛑 A search tool, not a list
 *
 * The first cut of this surface was going to be a browsable list of every leaf
 * with a band. That is the wrong shape for the question people actually have,
 * which is always about ONE thing: *what does Dragoon G go for?* A list of 216
 * model leaves answers that by making the reader scan, and it gets worse as the
 * catalogue grows — the taxonomy is heading to ~330 nodes. So the empty state
 * is a search box, and results arrive only for a query.
 *
 * It also keeps the cost bounded by construction rather than by a page size: a
 * list has to paginate the whole forest, while a search reads one query plus a
 * single multi-get.
 *
 * ## What a result carries
 *
 *   the category          name, path, cover image, so the reader can confirm
 *                         they matched the thing they meant
 *   min / median / mean   three different answers to "what is it worth", all
 *                         three kept because they disagree in a way that is
 *                         information (see `PriceIndexBand.mean`)
 *   max                   the ceiling someone actually paid
 *   lastSold              the MOST RECENT sale, which is the single most
 *                         decision-relevant number and the one a band hides
 *   byCondition           because condition is the dominant price variable in
 *                         collectibles, and a band spanning `new` and `poor`
 *                         is an average of two different markets
 *
 * ## 🛑 Public, deliberately, against the standing price gate
 *
 * § "Guest price gating" hides prices from signed-out visitors, and this page
 * does not. That is a decision rather than an oversight, and the reasoning is
 * specific: the gate exists because a live ASK can be scraped at scale to
 * reconstruct our catalogue and its valuations, and a band of COMPLETED SALES
 * is a different object — it is aggregate, it is a day stale by design, and it
 * is the strongest content we can publish because it is a fact about our own
 * marketplace rather than a price list.
 *
 * What is NOT published here: any individual listing's price, any seller
 * identity, any buyer identity, and any sale count below the confidence
 * threshold.
 */

import { categoriesRepository } from "../../../../features/categories/repository/categories.repository";
import {
  priceIndexRepository,
  PRICE_INDEX_MIN_CONFIDENT_SAMPLES,
  type PriceIndexBand,
  type PriceIndexConditionBand,
} from "../../../../features/categories/repository/price-index.repository";

/**
 * How many leaves one query may resolve to.
 *
 * 🛑 Small on purpose. A reader looking up one bey wants the right leaf near
 * the top, not thirty near-misses — and every result is a document in the
 * multi-get, so this is also the read bound. Eight is enough to disambiguate
 * "dragoon" across its generations without becoming a list.
 */
export const PRICE_INDEX_SEARCH_LIMIT = 8;

/** Minimum query length. Shorter than this matches most of the taxonomy. */
export const PRICE_INDEX_MIN_QUERY_LENGTH = 2;

export interface PriceIndexSearchResultBand {
  listingType: string;
  min: number;
  median: number;
  mean: number;
  max: number;
  sampleSize: number;
  /**
   * 🛑 Whether the figures above may be shown as figures at all.
   *
   * Below `PRICE_INDEX_MIN_CONFIDENT_SAMPLES` the renderer must show the sample
   * size and NO headline number — a median of two sales is a coin flip
   * presented as data. Computed here rather than left to the client so the
   * threshold cannot drift between the job, this projection and the view.
   */
  confident: boolean;
  lastSold?: { amount: number; at: string; via?: string };
  byCondition?: Array<{
    condition: string;
    min: number;
    median: number;
    mean: number;
    max: number;
    sampleSize: number;
    confident: boolean;
    lastSold?: { amount: number; at: string };
  }>;
}

export interface PriceIndexSearchResult {
  categoryId: string;
  name: string;
  slug: string;
  /** " › "-joined ancestry, so a reader can tell two same-named leaves apart. */
  path?: string;
  coverImage?: string;
  /** Absent when this leaf has no completed sales in the window. */
  bands?: PriceIndexSearchResultBand[];
  windowDays?: number;
  computedAt?: string;
}

export interface PriceIndexSearchResponse {
  query: string;
  results: PriceIndexSearchResult[];
  /** True when the query matched more leaves than were returned. */
  truncated: boolean;
  /**
   * 🛑 The confidence threshold, published so the page can explain itself.
   * A page that hides a number without saying why reads as broken data.
   */
  minConfidentSamples: number;
}

const toIso = (v: unknown): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  // Firestore Timestamp, when a document arrives unmapped from a raw getAll.
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  return undefined;
};

function toConditionRows(
  byCondition: Record<string, PriceIndexConditionBand> | undefined,
): PriceIndexSearchResultBand["byCondition"] {
  if (!byCondition) return undefined;
  const rows = Object.entries(byCondition)
    .map(([condition, b]) => ({
      condition,
      min: b.min,
      median: b.median,
      mean: b.mean,
      max: b.max,
      sampleSize: b.sampleSize,
      confident: b.sampleSize >= PRICE_INDEX_MIN_CONFIDENT_SAMPLES,
      ...(b.lastSold ? { lastSold: { amount: b.lastSold.amount, at: toIso(b.lastSold.at)! } } : {}),
    }))
    /*
     * Ordered by sample size, so the condition we know most about leads.
     * 🛑 Deliberately NOT by price: ordering by median would put a single
     * ₹9,000 mint sale above forty ₹900 used ones and read as the going rate.
     */
    .sort((a, b) => b.sampleSize - a.sampleSize);
  return rows.length > 0 ? rows : undefined;
}

function toBandRow(listingType: string, b: PriceIndexBand): PriceIndexSearchResultBand {
  return {
    listingType,
    min: b.min,
    median: b.median,
    // `mean` is absent on bands written before it existed. `median` is the
    // honest stand-in rather than 0, which would render as a real ₹0 average.
    mean: b.mean ?? b.median,
    max: b.max,
    sampleSize: b.sampleSize,
    confident: b.sampleSize >= PRICE_INDEX_MIN_CONFIDENT_SAMPLES,
    ...(b.lastSold
      ? {
          lastSold: {
            amount: b.lastSold.amount,
            at: toIso(b.lastSold.at)!,
            ...(b.lastSold.via ? { via: b.lastSold.via } : {}),
          },
        }
      : {}),
    ...(toConditionRows(b.byCondition) ? { byCondition: toConditionRows(b.byCondition) } : {}),
  };
}

/**
 * Resolve a query to leaves and attach each one's band.
 *
 * Cost: one `searchTxt` push-down query plus ONE multi-get. Both bounded.
 */
export async function searchPriceIndex(rawQuery: string): Promise<PriceIndexSearchResponse> {
  const query = (rawQuery ?? "").trim();
  const base: PriceIndexSearchResponse = {
    query,
    results: [],
    truncated: false,
    minConfidentSamples: PRICE_INDEX_MIN_CONFIDENT_SAMPLES,
  };
  if (query.length < PRICE_INDEX_MIN_QUERY_LENGTH) return base;

  /*
   * The search goes through `categoriesRepository.list(..., { search })`, which
   * pushes the longest term down as an `array-contains` on `searchTxt` and
   * AND-refines the rest — the same path `/api/admin/categories` uses since A1.
   *
   * 🛑 That is what makes "dragon g" work: `buildCategorySearchTxt` indexes
   * mechanical misspelling variants, and `parseSearchTxtQuery` applies the SAME
   * normaliser to the query, so the two halves meet on tokens rather than on
   * substrings.
   */
  const found = await categoriesRepository.list(
    { page: "1", pageSize: String(PRICE_INDEX_SEARCH_LIMIT + 1) },
    { search: query },
  );
  const items = found.items ?? [];

  /*
   * 🛑 Brands and bundles are filtered IN MEMORY, not by a query clause.
   *
   * A plain listing category OMITS `categoryType` entirely — the convention
   * CLAUDE.md records — so `where("categoryType","==","category")` matches
   * nothing and `!=` excludes every document lacking the field, i.e. all the
   * real ones. This is the same trap that made the `/products` category facet
   * offer "Takara-Tomy" as a browsable category (A1).
   */
  const listingRows = items.filter((c) => {
    const t = (c as { categoryType?: string }).categoryType;
    return !t || t === "category" || t === "sublisting";
  });
  const page = listingRows.slice(0, PRICE_INDEX_SEARCH_LIMIT);

  const results = await buildBandsForLeaves(page);

  return {
    ...base,
    results,
    truncated: listingRows.length > PRICE_INDEX_SEARCH_LIMIT,
  };
}

/**
 * The ONE multi-get, shared by the search path above and the ids-only path
 * below — the actual band-shaping logic (sort by sample size, omit an empty
 * `bands` array, the "no sales recorded" vs "zero sales" distinction) must
 * answer identically regardless of how the category list was resolved.
 */
async function buildBandsForLeaves(
  leaves: ReadonlyArray<{ id: string; name: string; slug: string; path?: string; display?: { coverImage?: string } }>,
): Promise<PriceIndexSearchResult[]> {
  const bandsByLeaf = await priceIndexRepository.getManyForLeaves(leaves.map((c) => c.id));

  return leaves.map((c) => {
    const doc = bandsByLeaf.get(c.id);
    const bands = doc
      ? Object.entries(doc.byListingType ?? {})
          .map(([t, b]) => toBandRow(t, b))
          /*
           * Most-traded listing type first. A named-model leaf holds the bey,
           * its stickers and its spare parts, and the bey is what somebody
           * searching the model name means.
           */
          .sort((a, b) => b.sampleSize - a.sampleSize)
      : [];
    return {
      categoryId: c.id,
      name: c.name,
      slug: c.slug,
      ...(c.path ? { path: c.path } : {}),
      ...(c.display?.coverImage ? { coverImage: c.display.coverImage } : {}),
      // 🛑 Omitted rather than `[]` when there are no sales. An empty array
      // renders as "we looked and found zero sales"; absence renders as "no
      // sales recorded yet". Only the second is a statement we can make.
      ...(bands.length > 0 ? { bands } : {}),
      ...(doc ? { windowDays: doc.windowDays, computedAt: toIso(doc.computedAt) } : {}),
    };
  });
}

/**
 * Tier 1 adoption — the client already resolved candidate leaves LOCALLY via
 * the public search artifact (`useSiteSearch({ types: ["model", "category"] })`),
 * at zero Firestore reads. This is the ONLY query this path still needs: one
 * multi-get, bounded by however many ids the client resolved (capped the
 * same as the search path, so a crafted request cannot demand an unbounded
 * `getAll`).
 *
 * 🛑 Deliberately NOT filtering brand/bundle categoryType here — the CALLER
 * already did that at index-build time (`PUBLIC_INDEX_SOURCES`'s category
 * source only emits real listing leaves under the "model"/"category" type
 * keys), so re-deriving the same filter from a bare id list would be a
 * second, independently-maintained copy of a rule that already lives in one
 * place. If that assumption is ever wrong, the cost is a band shown for a
 * brand/bundle row — cosmetic, not a leak, since no money figure is ever
 * attached to a document that does not already have sales recorded.
 */
export async function getPriceIndexBandsForIds(
  rawIds: readonly string[],
): Promise<PriceIndexSearchResult[]> {
  const ids = [...new Set(rawIds.filter((id) => typeof id === "string" && id.length > 0))].slice(
    0,
    PRICE_INDEX_SEARCH_LIMIT,
  );
  if (ids.length === 0) return [];

  const docs = await categoriesRepository.getManyByIds(ids);
  const leaves = docs.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    path: c.path,
    display: c.display,
  }));

  return buildBandsForLeaves(leaves);
}
