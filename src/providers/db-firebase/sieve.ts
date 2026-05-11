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
 *   return this.sieveQuery<ProductDocument>(model, {
 *     title:     { canFilter: true, canSort: true },
 *     price:     { canFilter: true, canSort: true },
 *     createdAt: { canFilter: true, canSort: true },
 *   }, { baseQuery });
 * }
 * ```
 */

import type {
  CollectionReference,
  DocumentData,
  Query,
} from "firebase-admin/firestore";

import { SieveProcessorBase } from "@mohasinac/sievejs/services";
import { createFirebaseAdapter } from "@mohasinac/sievejs/adapters/firebase";

import { FirebaseRepository } from "./base";
import { deserializeTimestamps, getFirestoreCount } from "./helpers";

// --- Types --------------------------------------------------------------------

export type SieveFieldConfig = {
  /** Override the Firestore document field name. Defaults to the key name. */
  path?: string;
  canFilter?: boolean;
  canSort?: boolean;
};

export type SieveFields = Record<string, SieveFieldConfig>;

/**
 * Virtual filter aliases — a clause like `listingType==auction` is expanded
 * into one or more real Sieve clauses (`isAuction==true,isPreOrder==false`)
 * before the model reaches the underlying Sieve processor.
 *
 * The expander receives the raw operator + value the caller used (e.g. `==`,
 * `!=`) and the value string. Return a comma-separated Sieve clause string,
 * or empty string to drop the clause silently.
 */
export type SieveFilterAlias = (value: string, operator: string) => string;
export type SieveFilterAliases = Record<string, SieveFilterAlias>;

/**
 * Expand virtual filter clauses into real Sieve clauses.
 * Pure function — exported for direct use in route helpers + unit testing.
 */
export function expandFilterAliases(
  filters: string | undefined,
  aliases: SieveFilterAliases | undefined,
): string | undefined {
  if (!filters || !aliases) return filters;
  const aliasKeys = Object.keys(aliases);
  if (aliasKeys.length === 0) return filters;
  return filters
    .split(",")
    .map((clause) => clause.trim())
    .filter(Boolean)
    .map((clause) => {
      // Match field, operator (==, !=, <=, >=, <, >, @=*, @=, _=), value.
      const m = clause.match(/^([A-Za-z_][\w.]*)\s*(==|!=|<=|>=|<|>|@=\*?|_=)\s*(.*)$/);
      if (!m) return clause;
      const [, field, op, value] = m;
      const alias = aliases[field];
      if (!alias) return clause;
      const expanded = alias(value, op);
      return expanded || "";
    })
    .filter(Boolean)
    .join(",");
}

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
  const expanded = expandFilterAliases(model.filters, aliases);
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

  const filteredQ = processor.apply(effective, baseQuery, {
    applyPagination: false,
  } as never) as unknown as Query;
  const total = await getFirestoreCount(filteredQ);

  const pagedQ = processor.apply(effective, baseQuery) as unknown as Query;
  const snap = await pagedQ.get();

  const items = snap.docs.map(
    (d) => deserializeTimestamps({ id: d.id, ...d.data() }) as unknown as T,
  );

  const page = Math.max(1, Number(model.page ?? 1));
  const pageSize = Math.min(
    merged.maxPageSize,
    Math.max(1, Number(model.pageSize ?? merged.defaultPageSize)),
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
      adapter: createFirebaseAdapter() as never,
      autoLoadConfig: false,
      options: merged,
      fields,
    } as never);

    // Count (no docs fetched)
    const filteredQ = processor.apply(effective, base, {
      applyPagination: false,
    } as never) as unknown as Query;
    const total = await getFirestoreCount(filteredQ);

    // Paginated result
    const pagedQ = processor.apply(effective, base) as unknown as Query;
    const snap = await pagedQ.get();

    const items = snap.docs.map(
      (d) =>
        deserializeTimestamps({ id: d.id, ...d.data() }) as unknown as TResult,
    );

    const page = Math.max(1, Number(model.page ?? 1));
    const pageSize = Math.min(
      merged.maxPageSize,
      Math.max(1, Number(model.pageSize ?? merged.defaultPageSize)),
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
