/**
 * D2 Fix 4 — CROSS-RESOURCE search.
 *
 * 🛑 `/search` is a pure REDIRECT today: it maps each of 15
 * `SearchResourceType` values to a browse route and `redirect()`s, `noindex`.
 * So there is **no cross-resource search at all** — the dropdown picks which
 * single listing page to send you to, and a buyer searching "dranzer" cannot
 * see that we have a product, an auction, a blog post and an FAQ about it.
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
 * NOT `SearchRepository`. That class builds `title_=${q}` — a case-sensitive
 * STARTS-WITH on `title` alone — so "dranzer" would not find "Beyblade
 * Original Dranzer S" and "flat" would find nothing at all. It is reachable
 * only through `/api/search`, whose own hook (`useSearch`) has zero consumers
 * outside barrel re-exports. Recorded rather than deleted here; see F1.
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
}

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
        let ref = db.collection(src.collection);
        for (const [field, value] of src.where ?? []) ref = ref.where(field, "==", value);
        const snap = await ref
          .where(SEARCH_TXT_FIELD, "array-contains", plan.head)
          .select(...src.select, SEARCH_TXT_FIELD)
          .limit(SCAN)
          .get();

        // AND-refine the remaining terms in memory — one push-down per query is
        // all Firestore gives, so the rest is a filter over a bounded window.
        const matched = snap.docs.filter((d) => {
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
          // count on screen is a floor.
          truncated: snap.docs.length >= SCAN || hits.length > PER_GROUP,
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
