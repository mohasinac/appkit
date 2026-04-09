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
