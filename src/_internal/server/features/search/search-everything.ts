/**
 * D2 Fix 4 — CROSS-RESOURCE search.
 *
 * 🛑 CORRECTED 2026-10-19 — this header asserted the opposite of the truth.
 *
 * It read: "`/search` is a pure REDIRECT today … there is no cross-resource
 * search at all." That described the state this module was WRITTEN to fix,
 * and it stayed on the file after the fix shipped — so the one document
 * explaining the feature told every later reader the feature did not exist.
 *
 * What is true now: `/search` is a real grouped results page, the header
 * reaches it, and this module is TIER 2 — the authenticated, server-side
 * half. The public half is a prebuilt artifact searched in the browser at
 * zero Firestore reads, and this one is what serves a viewer's OWN records
 * (`scoped-sources.ts`) and what the kill switch falls back to when the
 * artifact is unavailable.
 *
 * That fallback is the reason this file is not deleted.
 *
 * ── WHY THIS IS AFFORDABLE ─────────────────────────────────────────────────
 *
 * N bounded parallel queries, which is exactly the shape section 4.4's availability
 * fan-out already uses (five clauses, 250 docs worst case). Every public
 * collection carries `searchTxt` at **100% coverage** — measured 2026-10-12:
 * products 71/71, stores 4/4, categories 416/416, blogPosts 20/20, events
 * 12/12, faqs 85/85 — so each group is one `array-contains` push-down on the
 * longest term plus an in-memory AND-refine, the same mechanism every listing
 * page uses.
 *
 * One `Promise.all`, so the whole page is ONE round trip's latency rather than
 * six, and Rule #6's budget is about sequential round trips.
 *
 * ── 🛑 NO PRICES, AND THAT IS A DESIGN DECISION ────────────────────────────
 *
 * The result rows carry a title, a type and a URL — never an amount. Prices
 * are hidden from signed-out visitors, and a cross-resource page is the one
 * surface where gating every row would be most of the markup. Showing names
 * and linking through is honest, needs no `<GatedPrice>` wrapper, and cannot
 * leak: there is nothing to leak.
 *
 * ── 🛑 WHAT IT DOES NOT REUSE, AND WHY ─────────────────────────────────────
 *
 * NOT `SearchRepository`. That class built `title_=${q}` — a case-sensitive
 * STARTS-WITH on `title` alone — so "dranzer" would not find "Beyblade
 * Original Dranzer S" and "flat" would find nothing at all. It was reachable
 * only through `/api/search`, whose own hook (`useSearch`) had zero consumers
 * outside barrel re-exports. The whole dead subsystem — `SearchRepository`,
 * `/api/search`, `useSearch`, `SearchView`/`SearchFiltersRow`/
 * `SearchResultsSection`, the legacy `search-actions.ts`/`data.ts`/
 * `actions.ts` chain — was deleted in the Wave 10 cleanup, kept only as this
 * historical note on why `searchEverything` never called it.
 */
import { planSearchTxt } from "../../../../utils/search-txt-query";
/*
 * 🛑 `FirestoreValue`, not `unknown`. `Record<string, unknown>` is what
 * `audit-unknown-leakage` refuses and it is right to: it says nothing about
 * what a document can hold, so every read needs a cast and the cast is where
 * this codebase's boundary bugs live (Root Cause #57, #70, #98). The codebase
 * already has the honest type and `countersReconcile` already uses it for the
 * same purpose.
 */
import type { FirestoreValue } from "../../../../schemas/types";
import { parseSearchTxtQuery, SEARCH_TXT_FIELD } from "../../../../utils/search-txt";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";

/** One matched row, deliberately minimal. */
export interface SearchHit {
  id: string;
  title: string;
  /** Where clicking goes. Built by the caller's route map, never guessed. */
  href: string;
  /** A one-line qualifier — the category path, the store name, the FAQ category. */
  detail?: string;
}

export interface SearchGroup {
  /** Stable key — `products`, `categories`, … matching the route map. */
  key: string;
  label: string;
  hits: SearchHit[];
  /**
   * 🛑 `true` when the bounded fetch SATURATED, so the group's count is a
   * FLOOR and must render as "6+" rather than "6". Same honesty rule as
   * `truncated` on the listing queries — a saturated fetch reporting an exact
   * total is a confident wrong number.
   */
  truncated: boolean;
  /** The listing page for this resource, pre-filtered by the same query. */
  moreHref: string;
}

export interface SearchEverythingResult {
  q: string;
  /** Parsed terms — empty for a query that normalises away, e.g. "!!!". */
  terms: string[];
  groups: SearchGroup[];
  totalHits: number;
}

/** Per group, so one slow or failing collection cannot dominate the page. */
const PER_GROUP = 6;
/** The bounded window each push-down reads before the in-memory refine. */
const SCAN = 60;

export interface SearchSource {
  key: string;
  label: string;
  /** The collection to scan. */
  collection: string;
  /** Fields to project — a search page needs a title and a link, not a document. */
  select: readonly string[];
  /** Build a hit from a projected document. */
  toHit: (id: string, data: SearchDocData) => SearchHit | null;
  /** The pre-filtered listing page. */
  moreHref: (q: string) => string;
  /** Extra equality narrowing, e.g. `status == published`. */
  where?: ReadonlyArray<readonly [string, unknown]>;
  /**
   * The bounded window this source reads before the in-memory refine.
   *
   * Defaults to `SCAN` (60). Scoped sources pass 20: an owner clause
   * (`userId == uid`) has already collapsed the candidate set, so a 60-doc
   * window is 40 reads spent proving there was nothing else.
   */
  scanLimit?: number;
  /**
   * How this source FINDS rows. Discriminated so TypeScript forces every
   * source to answer, which is what makes `audit-scoped-search-ownership`
   * R2 checkable rather than advisory.
   *
   *   `search-txt`      the `array-contains` push-down. Requires the
   *                     collection to carry `searchTxt`.
   *   `bounded-memory`  read the owner's bounded window and filter in
   *                     memory, with no token push-down at all.
   *
   * 🛑 A PII-bearing collection must be `bounded-memory`. `searchTxt` is
   * plaintext, edge-n-gram-expanded and stored on the document — giving
   * `addresses` a token push-down would write a prefix-expanded index over
   * a person's name and street, which is the precise thing § Searching PII
   * refuses (a 1-character prefix has 36 possible values; the frequency
   * distribution unpicks from there). Decrypting a bounded owner-scoped
   * window in memory re-derives a bound ownership already gives, and adds
   * no leak surface.
   */
  mode?: "search-txt" | "bounded-memory";
  /**
   * For `bounded-memory`: does this row match? Receives the DECRYPTED
   * document, so a repository that decrypts on read is the intended caller.
   * Every term must match (AND), consistent with the push-down path.
   */
  matches?: (data: SearchDocData, terms: readonly string[]) => boolean;
  /** Ordering for `bounded-memory`, since there is no token clause to sort by. */
  orderBy?: readonly [string, "asc" | "desc"];
}

/**
 * 🛑 The ceiling on what ONE viewer's scoped search may read.
 *
 * Σ `scanLimit` across the widest role, checked by
 * `audit-scoped-search-ownership` R4 — which PRINTS THE ARITHMETIC on
 * failure, because "the budget is exceeded" is useless without knowing by
 * which source and how much.
 *
 * 400 against Rule #6's ~3-round-trip guidance is defensible because the
 * sources run in ONE `Promise.all`: it is one round trip of fan-out, not
 * twelve sequential ones. The number that matters is documents read.
 */
export const SCOPED_SCAN_BUDGET = 400;

/** A projected Firestore document's fields. */
export type SearchDocData = Record<string, FirestoreValue>;

/** A projected document — the only shape this module reads. */
interface SearchDoc {
  id: string;
  data(): SearchDocData;
}

/*
 * 🛑 The chained builder is typed as itself, not `any`. Firestore's own
 * `Query` narrows on every call, and typing the links `any` loses `SearchDoc`
 * at `.get()` — which is how `d` and `h` became implicit `any` and
 * `audit-unknown-leakage`'s sibling rule would have had something to say.
 */
interface SearchQueryRef {
  where(field: string, op: string, value: unknown): SearchQueryRef;
  select(...fields: string[]): SearchQueryRef;
  limit(n: number): SearchQueryRef;
  /**
   * Only `bounded-memory` sources use this. The push-down path deliberately
   * does not order: an `orderBy` beside an `array-contains` demands a
   * composite index per source, and a missing one throws
   * `FAILED_PRECONDITION` into the per-source catch, where it renders as an
   * empty group — i.e. silently (Root Cause #59).
   */
  orderBy(field: string, direction: "asc" | "desc"): SearchQueryRef;
  get(): Promise<{ docs: SearchDoc[] }>;
}

interface MinimalDb {
  collection(name: string): SearchQueryRef;
}

/**
 * Run every source in parallel and group the results.
 *
 * 🛑 A source that THROWS yields an empty group and is logged — it never takes
 * the page down. But the group is still RETURNED with `truncated: false` and no
 * hits, which is indistinguishable from "nothing matched"… so the failure is
 * logged loudly, because that is the one thing this cannot show the visitor
 * without inventing an error state for a page that mostly worked.
 */
export async function searchEverything(
  db: MinimalDb,
  q: string,
  sources: readonly SearchSource[],
): Promise<SearchEverythingResult> {
  const plan = planSearchTxt(q);
  const terms = parseSearchTxtQuery(q ?? "");

  /*
   * 🛑 A query that normalises to nothing returns NOTHING, never everything.
   * `"!!!"` and `"—"` have no tokens, and emitting no clause would make the
   * push-down match every document in every collection — which is exactly the
   * bug A2 fixed on `/api/products`, where `"!!!"` returned the whole
   * published catalogue AS SEARCH RESULTS.
   */
  if (!plan.head) {
    return { q: q ?? "", terms, groups: [], totalHits: 0 };
  }

  const groups = await Promise.all(
    sources.map(async (src): Promise<SearchGroup> => {
      const base: SearchGroup = {
        key: src.key,
        label: src.label,
        hits: [],
        truncated: false,
        moreHref: src.moreHref(q),
      };
      try {
        const scan = src.scanLimit ?? SCAN;
        const boundedMemory = src.mode === "bounded-memory";

        let ref = db.collection(src.collection);
        for (const [field, value] of src.where ?? []) ref = ref.where(field, "==", value);

        /*
         * 🛑 The two modes differ in ONE clause and in nothing else.
         *
         * `bounded-memory` omits the `array-contains` push-down and does not
         * project `searchTxt` — because the collections that use it do not
         * have one, deliberately (see `mode`). Everything downstream —
         * `toHit`, the PER_GROUP slice, the `truncated` floor — is shared, so
         * the two paths cannot drift in how they REPORT, only in how they
         * find.
         */
        const snap = boundedMemory
          ? await (src.orderBy
              ? ref.orderBy(src.orderBy[0], src.orderBy[1])
              : ref
            )
              .select(...src.select)
              .limit(scan)
              .get()
          : await ref
              .where(SEARCH_TXT_FIELD, "array-contains", plan.head)
              .select(...src.select, SEARCH_TXT_FIELD)
              .limit(scan)
              .get();

        // AND-refine the remaining terms in memory — one push-down per query is
        // all Firestore gives, so the rest is a filter over a bounded window.
        const matched = boundedMemory
          ? snap.docs.filter((d) => src.matches?.(d.data(), terms) ?? false)
          : snap.docs.filter((d) => {
              const txt = (d.data()[SEARCH_TXT_FIELD] as string[] | undefined) ?? [];
              return plan.rest.every((t) => txt.includes(t));
            });

        const hits = matched
          .map((d) => src.toHit(d.id, d.data()))
          .filter((h): h is SearchHit => h !== null);

        return {
          ...base,
          hits: hits.slice(0, PER_GROUP),
          // Saturated window OR more matches than we show — either way the
          // count on screen is a floor. Compared against THIS source's own
          // limit, not the module default: a scoped source scanning 20 that
          // returned 20 is saturated even though 20 < SCAN.
          truncated: snap.docs.length >= scan || hits.length > PER_GROUP,
        };
      } catch (err) {
        const e = normalizeError(err);
        serverLogger.warn("searchEverything: a source failed and renders as empty", {
          source: src.key,
          collection: src.collection,
          error: e.message,
        });
        return base;
      }
    }),
  );

  const withHits = groups.filter((g) => g.hits.length > 0);
  return {
    q: q ?? "",
    terms,
    groups: withHits,
    totalHits: withHits.reduce((n, g) => n + g.hits.length, 0),
  };
}
