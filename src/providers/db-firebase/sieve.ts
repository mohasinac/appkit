/**
 * FirebaseSieveRepository<T>
 *
 * Extends `FirebaseRepository<T>` with a full Sieve DSL query (filters, sorts,
 * page, pageSize) pushed entirely to Firestore — no in-memory iteration.
 *
 * Uses `@mohasinac/sievejs` for parsing the Sieve filter / sort grammar.
 *
 * Usage in subclasses:
 * ```ts
 * async list(model: SieveModel, baseQuery?: CollectionReference | Query) {
 * return this.sieveQuery<ProductDocument>(model, {
 * title: { canFilter: true, canSort: true },
 * price: { canFilter: true, canSort: true },
 * createdAt: { canFilter: true, canSort: true },
 * }, { baseQuery });
 * }
 * ```
 *
 * ## Known Sieve ↔ Firestore incompatibilities
 *
 * These Sieve DSL features are silently unsupported or produce wrong results
 * when translated to Firestore queries. Document them here to avoid surprise.
 *
 * ### 1. String-contains `@=*` (case-insensitive full-text)
 * Sieve's `title@=*query` is a substring/CI match. Firestore has no native
 * LIKE or ILIKE operator. The Firebase adapter maps it to `>=` / `<` prefix
 * range tricks that only work for prefix matches on ASCII strings, not
 * arbitrary substrings. Use a Firebase Function or in-memory post-filter for
 * real substring search; never rely on `@=*` to match mid-string.
 *
 * ### 2. OR across different fields (`|` pipe between clauses)
 * Sieve's `field1==v1|field2==v2` (OR across two different fields) is
 * translated to `whereOr` by the stock Firebase adapter. Firestore's Admin SDK
 * v6+ supports `Query.where(Filter.or(...))`, but the stock adapter version
 * bundled with sievejs may emit an unsupported form. The enhanced adapter in
 * this file only upgrades single-field OR groups (same-field equality → `in`
 * query). Multi-field OR is still unsupported — apply it in memory.
 *
 * ### 3. OR on the same field (`field==v1|v2`) → Firestore `in`
 * The custom `createEnhancedFirebaseAdapter` in this file upgrades these to
 * Firestore `.where(field, "in", [v1, v2])`. Firestore supports up to 30
 * values in an `in` clause. More than 30 values will throw. The stock adapter
 * would have emitted a `whereOr` call that fails entirely.
 *
 * ### 4. Multi-field `orderBy` without a matching composite index
 * Firestore requires a composite index for every combination of `where` +
 * `orderBy` fields. Sieve sorts like `-createdAt,price` translate to two
 * `orderBy` calls; if the Firestore collection has no index for that
 * combination the query throws `FAILED_PRECONDITION`. Add the index to
 * `appkit/firebase/base/firestore.indexes.json` and deploy before shipping.
 *
 * ### 5. Inequality filter + `orderBy` on a different field
 * Firestore's rule: if you have an inequality filter (`!=`, `<`, `>`, `<=`,
 * `>=`) on field A, the first `orderBy` must also be on field A. Sieve queries
 * like `price>=100 & sorts=-createdAt` translate to an inequality on `price`
 * with `orderBy createdAt`, which Firestore rejects. Work-arounds:
 *   (a) move the inequality filter to the Firebase Function path where it can
 *       be handled server-side, (b) apply it in-memory in the fallback path,
 *       (c) restructure the sort to use the same field as the filter.
 *
 * ### 6. Dot-notation nested field filters (`address.city==Delhi`)
 * Sieve parses the field name verbatim; the Firebase adapter passes it as the
 * Firestore field path. Firestore Admin SDK supports dot-notation for nested
 * fields, so `address.city==Delhi` works — but only if the field is indexed.
 * Add nested-field indexes explicitly; Firestore does not auto-index nested
 * paths in composite indexes declared at the root level.
 */

import type {
  CollectionReference,
  DocumentData,
  Query,
} from "firebase-admin/firestore";

import { SieveProcessorBase } from "@mohasinac/sievejs/services";
import { createFirebaseAdapter } from "@mohasinac/sievejs/adapters/firebase";

interface AdapterCondition {
  field: string;
  value: JsonValue;
  parsedOperator: string;
  operatorIsNegated: boolean;
  operatorIsCaseInsensitive: boolean;
  ignoreNullsOnNotEqual?: boolean;
}

/**
 * Wraps the stock Firebase adapter and upgrades OR groups where all conditions
 * are equality checks on the same field into a Firestore `in` query.
 *
 * Background: Sieve parses `field==v1|v2` as a single term with two values
 * (OR semantics). The stock adapter tries `whereOr` which Firestore Admin SDK
 * doesn't support. Firestore's `.where(field, "in", [v1, v2])` is the correct
 * equivalent and supports up to 30 values.
 */
function createEnhancedFirebaseAdapter() {
  const base = createFirebaseAdapter();
  return {
    ...base,
    applyFilterGroup(
      query: CollectionReference | Query,
      group: AdapterCondition[],
    ): CollectionReference | Query {
      if (
        group.length > 1 &&
        group.every(
          (c) =>
            c.parsedOperator === "equals" &&
            !c.operatorIsNegated &&
            !c.operatorIsCaseInsensitive &&
            c.field === group[0].field,
        )
      ) {
        return (query as Query).where(
          group[0].field,
          "in",
          group.map((c) => c.value),
        );
      }
      return base.applyFilterGroup(query, group as never) as CollectionReference | Query;
    },
  };
}

import { FirebaseRepository } from "./base";
import { deserializeTimestamps, getFirestoreCount } from "./helpers";
import {
  expandFilterAliases as _expandFilterAliases,
  type SieveFilterAlias,
  type SieveFilterAliases,
} from "./filter-aliases";
import type { JsonValue } from "@mohasinac/appkit";

// Re-export the pure alias helper + types so consumers that already imported
// from `./sieve` keep working. Anyone who only needs the alias machinery
// should prefer importing from `./filter-aliases` directly — that path has
// zero runtime deps and is client-safe.
export {
  _expandFilterAliases as expandFilterAliases,
  type SieveFilterAlias,
  type SieveFilterAliases,
};

// --- Types --------------------------------------------------------------------

export type SieveFieldConfig = {
  /** Override the Firestore document field name. Defaults to the key name. */
  path?: string;
  canFilter?: boolean;
  canSort?: boolean;
};

export type SieveFields = Record<string, SieveFieldConfig>;

export interface SieveModel {
  /** Comma-delimited filter expressions, e.g. `status==published,price>=100` */
  filters?: string;
  /** Comma-delimited sort fields, `-` prefix = descending, e.g. `-createdAt,title` */
  sorts?: string;
  page?: number | string;
  pageSize?: number | string;
}

export interface SieveOptions {
  caseSensitive?: boolean;
  defaultPageSize?: number;
  maxPageSize?: number;
  throwExceptions?: boolean;
  /**
   * Optional virtual-field expansions applied to `model.filters` before the
   * Sieve processor sees the string. Each entry maps an alias key to a
   * function that returns the real Sieve clauses for that key. See
   * `expandFilterAliases` for the parser contract.
   */
  aliases?: SieveFilterAliases;
}

export interface SieveResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Backward-compatible aliases used by consumer repos during migration.
export type FirebaseSieveFieldConfig = SieveFieldConfig;
export type FirebaseSieveFields = SieveFields;
export type FirebaseSieveOptions = SieveOptions;
export type FirebaseSieveResult<T> = SieveResult<T>;

const SIEVE_DEFAULTS: Omit<Required<SieveOptions>, "aliases"> = {
  caseSensitive: false,
  defaultPageSize: 20,
  maxPageSize: 100,
  throwExceptions: false,
};

/** Apply alias expansion to a model in-place-safe (returns a new model). */
function withAliasesExpanded(
  model: SieveModel,
  aliases: SieveFilterAliases | undefined,
): SieveModel {
  if (!aliases) return model;
  const expanded = _expandFilterAliases(model.filters, aliases);
  if (expanded === model.filters) return model;
  return { ...model, filters: expanded };
}

/**
 * Apply Sieve DSL to a CollectionReference/Query without requiring repository subclassing.
 */
export async function applySieveToFirestore<T extends DocumentData>(params: {
  baseQuery: CollectionReference | Query;
  model: SieveModel;
  fields: SieveFields;
  options?: SieveOptions;
}): Promise<SieveResult<T>> {
  const { baseQuery, model, fields, options } = params;
  const { aliases, ...rest } = options ?? {};
  const merged = { ...SIEVE_DEFAULTS, ...rest };
  const effective = withAliasesExpanded(model, aliases);

  const processor = new SieveProcessorBase({
    adapter: createFirebaseAdapter() as never,
    autoLoadConfig: false,
    options: merged,
    fields,
  } as never);

  const page = Math.max(1, Number(model.page ?? 1));
  const pageSize = Math.min(
    merged.maxPageSize,
    Math.max(1, Number(model.pageSize ?? merged.defaultPageSize)),
  );

  // Apply filters + sorts once; count without reading docs.
  const filteredQ = processor.apply(effective, baseQuery, {
    applyPagination: false,
  } as never) as unknown as Query;
  const total = await getFirestoreCount(filteredQ);

  // Apply pagination on top of the already-filtered query — avoids re-applying
  // the full Sieve DSL from the base.
  const pagedQ = filteredQ.offset((page - 1) * pageSize).limit(pageSize);
  const snap = await pagedQ.get();

  const items = snap.docs.map(
    (d) => deserializeTimestamps({ id: d.id, ...d.data() }) as unknown as T,
  );

  const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

// --- Class --------------------------------------------------------------------

export abstract class FirebaseSieveRepository<
  T extends DocumentData,
> extends FirebaseRepository<T> {
  /**
   * Run a Sieve DSL query against Firestore at the DB layer.
   *
   * @param model     Parsed from HTTP query-string params.
   * @param fields    Per-field filter / sort allowlist.
   * @param options   Override defaults or supply a pre-filtered `baseQuery`.
   */
  protected async sieveQuery<TResult extends DocumentData = T>(
    model: SieveModel,
    fields: SieveFields,
    options?: SieveOptions & { baseQuery?: CollectionReference | Query },
  ): Promise<SieveResult<TResult>> {
    const { baseQuery, aliases, ...sieveOptions } = options ?? {};
    const merged = { ...SIEVE_DEFAULTS, ...sieveOptions };
    const base = baseQuery ?? this.getCollection();
    const effective = withAliasesExpanded(model, aliases);

    const processor = new SieveProcessorBase({
      adapter: createEnhancedFirebaseAdapter() as never,
      autoLoadConfig: false,
      options: merged,
      fields,
    } as never);

    const page = Math.max(1, Number(model.page ?? 1));
    const pageSize = Math.min(
      merged.maxPageSize,
      Math.max(1, Number(model.pageSize ?? merged.defaultPageSize)),
    );

    // Apply filters + sorts once; count without reading docs.
    const filteredQ = processor.apply(effective, base, {
      applyPagination: false,
    } as never) as unknown as Query;
    const total = await getFirestoreCount(filteredQ);

    // Apply pagination on top of the already-filtered query — avoids re-applying
    // the full Sieve DSL from the base.
    const pagedQ = filteredQ.offset((page - 1) * pageSize).limit(pageSize);
    const snap = await pagedQ.get();

    const items = snap.docs.map(
      (d) =>
        deserializeTimestamps({ id: d.id, ...d.data() }) as unknown as TResult,
    );

    const totalPages =
      total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }
}
