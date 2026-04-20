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

const SIEVE_DEFAULTS: Required<SieveOptions> = {
  caseSensitive: false,
  defaultPageSize: 20,
  maxPageSize: 100,
  throwExceptions: false,
};

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
  const merged = { ...SIEVE_DEFAULTS, ...(options ?? {}) };

  const processor = new SieveProcessorBase({
    adapter: createFirebaseAdapter() as never,
    autoLoadConfig: false,
    options: merged,
    fields,
  } as never);

  const filteredQ = processor.apply(model, baseQuery, {
    applyPagination: false,
  } as never) as unknown as Query;
  const total = await getFirestoreCount(filteredQ);

  const pagedQ = processor.apply(model, baseQuery) as unknown as Query;
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
    const { baseQuery, ...sieveOptions } = options ?? {};
    const merged = { ...SIEVE_DEFAULTS, ...sieveOptions };
    const base = baseQuery ?? this.getCollection();

    const processor = new SieveProcessorBase({
      adapter: createFirebaseAdapter() as never,
      autoLoadConfig: false,
      options: merged,
      fields,
    } as never);

    // Count (no docs fetched)
    const filteredQ = processor.apply(model, base, {
      applyPagination: false,
    } as never) as unknown as Query;
    const total = await getFirestoreCount(filteredQ);

    // Paginated result
    const pagedQ = processor.apply(model, base) as unknown as Query;
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
