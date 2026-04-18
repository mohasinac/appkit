// ─── Repository Interfaces ────────────────────────────────────────────────────
// Segregated per ISP: features that only read never depend on IWriteRepository.

/** Field comparison operators supported by Sieve-style query strings. */
export type WhereOp =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "array-contains"
  | "in"
  | "not-in"
  | "array-contains-any";

/**
 * Provider-agnostic query descriptor.
 * `filters` uses Sieve syntax: "field==value,field2>value2"
 * DB adapters translate this into native query predicates.
 */
export interface SieveQuery {
  /** Sieve filter string, e.g. "status==published,price>100" */
  filters?: string;
  /** Field name to sort by */
  sort?: string;
  /** Sort direction (default: "asc") */
  order?: "asc" | "desc";
  /** 1-based page number (default: 1) */
  page?: number;
  /** Items per page (default: 20) */
  perPage?: number;
}

/** Paginated result envelope returned by IReadRepository.findAll() */
export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ─── Read contract ─────────────────────────────────────────────────────────
export interface IReadRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(query?: SieveQuery): Promise<PagedResult<T>>;
  findWhere(field: keyof T, op: WhereOp, value: unknown): Promise<T[]>;
}

// ─── Write contract ────────────────────────────────────────────────────────
export interface IWriteRepository<T> {
  create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  batchCreate(
    items: Array<Omit<T, "id" | "createdAt" | "updatedAt">>,
  ): Promise<T[]>;
  batchDelete(ids: string[]): Promise<void>;
}

/** Full CRUD repository — combines read + write. */
export interface IRepository<T>
  extends IReadRepository<T>, IWriteRepository<T> {}

/**
 * Repository with real-time subscription support (e.g. Firestore RTDB).
 * Returns an unsubscribe function from both subscribe methods.
 */
export interface IRealtimeRepository<T> extends IRepository<T> {
  subscribe(id: string, cb: (data: T | null) => void): () => void;
  subscribeWhere(
    field: keyof T,
    value: unknown,
    cb: (items: T[]) => void,
  ): () => void;
}

/**
 * Database provider — creates IRepository<T> instances on demand.
 * Registered once in providers.config.ts; feature packages call
 * `getProviders().db.getRepository<T>(collection)` so they never
 * import a concrete adapter (FirebaseRepository, PrismaRepository, …).
 */
export interface IDbProvider {
  getRepository<T>(collection: string): IRepository<T>;
}

// ─── Repository lifecycle hooks ───────────────────────────────────────────────

/**
 * Optional lifecycle hooks that can be attached to any `IRepository<T>`.
 * All hooks are optional. If provided, they are called by the repository
 * wrapper at the appropriate point in the CRUD lifecycle.
 *
 * Register hooks globally via `setRepositoryHooks()` or per-collection via
 * `setCollectionHooks()`.
 *
 * @example
 * ```ts
 * // providers.config.ts
 * import { setRepositoryHooks } from "@mohasinac/appkit/contracts";
 *
 * setRepositoryHooks("products", {
 *   afterRead: (item) => { console.log("read product", item.id); },
 *   beforeCreate: (data) => ({ ...data, source: "letitrip" }),
 *   afterUpdate: (item) => myCache.invalidate(`product:${item.id}`),
 * });
 * ```
 */
export interface RepositoryLifecycleHooks<T> {
  /**
   * Called after a successful `findById` or per-item result in `findAll`.
   * Return value is ignored — use for side-effects only (logging, caching).
   */
  afterRead?: (item: T) => void | Promise<void>;
  /**
   * Called before `create`. Return the (possibly mutated) data to be persisted.
   * If not returned, the original data is used unchanged.
   */
  beforeCreate?: (
    data: Omit<T, "id" | "createdAt" | "updatedAt">,
  ) =>
    | Omit<T, "id" | "createdAt" | "updatedAt">
    | Promise<Omit<T, "id" | "createdAt" | "updatedAt">>;
  /**
   * Called after a successful `create`. Receives the persisted document.
   */
  afterCreate?: (item: T) => void | Promise<void>;
  /**
   * Called before `update`. Return the (possibly mutated) partial to be applied.
   */
  beforeUpdate?: (
    id: string,
    data: Partial<T>,
  ) => Partial<T> | Promise<Partial<T>>;
  /**
   * Called after a successful `update`. Receives the updated document.
   */
  afterUpdate?: (item: T) => void | Promise<void>;
  /**
   * Called before `delete`. Return `false` to cancel the deletion.
   */
  beforeDelete?: (id: string) => boolean | void | Promise<boolean | void>;
  /**
   * Called after a successful `delete`.
   */
  afterDelete?: (id: string) => void | Promise<void>;
}

// ─── Global hooks registry ────────────────────────────────────────────────────

const _hooksRegistry = new Map<string, RepositoryLifecycleHooks<unknown>>();

/**
 * Register lifecycle hooks for a specific Firestore collection (or any
 * collection identifier used by `IDbProvider.getRepository()`).
 *
 * @param collection  The collection name (e.g. "products", "orders").
 * @param hooks       Partial hooks object — only the hooks you provide are applied.
 */
export function setCollectionHooks<T>(
  collection: string,
  hooks: RepositoryLifecycleHooks<T>,
): void {
  _hooksRegistry.set(collection, hooks as RepositoryLifecycleHooks<unknown>);
}

/**
 * Retrieve registered hooks for a collection, or `undefined` if none are set.
 */
export function getCollectionHooks<T>(
  collection: string,
): RepositoryLifecycleHooks<T> | undefined {
  return _hooksRegistry.get(collection) as
    | RepositoryLifecycleHooks<T>
    | undefined;
}

/** Remove hooks for a collection. */
export function removeCollectionHooks(collection: string): void {
  _hooksRegistry.delete(collection);
}

/** Reset all registered hooks (used in tests). */
export function _resetCollectionHooks(): void {
  _hooksRegistry.clear();
}
