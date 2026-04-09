/**
 * FirebaseRepository<T>
 *
 * Generic abstract base class implementing `IRepository<T>` from
 * `@mohasinac/contracts` against Firebase Firestore (Admin SDK).
 *
 * Usage:
 * ```ts
 * import { FirebaseRepository } from "@mohasinac/db-firebase";
 * import type { Product } from "@/types";
 *
 * export class ProductRepository extends FirebaseRepository<Product> {
 *   constructor() { super("products"); }
 * }
 * ```
 *
 * `findAll(query?)` maps the provider-agnostic `SieveQuery` from
 * `@mohasinac/contracts` to Firestore native queries (no in-memory fan-out).
 */

import type {
  CollectionReference,
  DocumentData,
  DocumentSnapshot,
  Firestore,
  Query,
  WriteBatch,
} from "firebase-admin/firestore";
import type {
  IRepository,
  PagedResult,
  SieveQuery,
  WhereOp,
} from "@mohasinac/contracts";
import { getAdminDb } from "./admin.js";
import { prepareForFirestore, deserializeTimestamps } from "./helpers.js";

export class FirebaseRepository<
  T extends DocumentData,
> implements IRepository<T> {
  protected readonly collection: string;

  constructor(collectionName: string) {
    this.collection = collectionName;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  protected get db(): Firestore {
    return getAdminDb();
  }

  protected getCollection(): CollectionReference {
    return this.db.collection(this.collection);
  }

  /** Single adapter boundary: DocumentSnapshot → typed entity. */
  protected mapDoc<D = T>(snap: DocumentSnapshot): D {
    return deserializeTimestamps({
      id: snap.id,
      ...(snap.data() ?? {}),
    }) as unknown as D;
  }

  // ── IReadRepository ────────────────────────────────────────────────────────

  async findById(id: string): Promise<T | null> {
    const snap = await this.getCollection().doc(id).get();
    if (!snap.exists) return null;
    return this.mapDoc(snap);
  }

  async findAll(query?: SieveQuery): Promise<PagedResult<T>> {
    const page = Math.max(1, query?.page ?? 1);
    const perPage = Math.max(1, Math.min(query?.perPage ?? 20, 500));

    let q: Query = this.getCollection();

    // ── Sort ──────────────────────────────────────────────────────────────────
    // SieveQuery.sort supports a leading "-" prefix for descending order
    // (e.g. "-createdAt" means ORDER BY createdAt DESC).
    if (query?.sort) {
      const rawSort = query.sort;
      const descPrefix = rawSort.startsWith("-");
      const sortField = descPrefix ? rawSort.slice(1) : rawSort;
      const sortDir = descPrefix
        ? "desc"
        : query.order === "desc"
          ? "desc"
          : "asc";
      q = q.orderBy(sortField, sortDir);
    }

    // ── Basic Sieve filter parsing ────────────────────────────────────────────
    // Supports: ==, !=, <, <=, >, >=, @= (array-contains)
    if (query?.filters) {
      const clauses = query.filters
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const clause of clauses) {
        const match = clause.match(
          /^([^<>=!@]+)\s*(==|!=|<=|>=|<|>|@=)\s*(.+)$/,
        );
        if (!match) continue;
        const [, fieldRaw, opToken, valueRaw] = match;
        const field = fieldRaw.trim();
        const op = TOKEN_TO_OP[opToken.trim()] ?? "==";
        const value = coerceValue(valueRaw.trim());
        q = (q as Query).where(field, op, value);
      }
    }

    // ── Count ─────────────────────────────────────────────────────────────────
    const countSnap = await q.count().get();
    const total: number = countSnap.data().count;

    // ── Paginate ──────────────────────────────────────────────────────────────
    const offset = (page - 1) * perPage;
    const pagedSnap = await q.offset(offset).limit(perPage).get();

    const data = pagedSnap.docs.map((d) => this.mapDoc(d));
    const totalPages =
      total === 0 ? 0 : Math.max(1, Math.ceil(total / perPage));

    return { data, total, page, perPage, totalPages };
  }

  async findWhere(field: keyof T, op: WhereOp, value: unknown): Promise<T[]> {
    const snap = await (this.getCollection() as Query)
      .where(field as string, op, value)
      .get();
    return snap.docs.map((d) => this.mapDoc(d));
  }

  // ── IWriteRepository ───────────────────────────────────────────────────────

  async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const now = new Date();
    const payload = prepareForFirestore({
      ...(data as Record<string, unknown>),
      createdAt: now,
      updatedAt: now,
    });
    const ref = await this.getCollection().add(payload);
    const snap = await ref.get();
    return this.mapDoc(snap);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const payload = prepareForFirestore({
      ...(data as Record<string, unknown>),
      updatedAt: new Date(),
    });
    await this.getCollection()
      .doc(id)
      .update(payload as Record<string, unknown>);
    const snap = await this.getCollection().doc(id).get();
    if (!snap.exists) throw new Error(`Document not found after update: ${id}`);
    return this.mapDoc(snap);
  }

  async delete(id: string): Promise<void> {
    await this.getCollection().doc(id).delete();
  }

  async batchCreate(
    items: Array<Omit<T, "id" | "createdAt" | "updatedAt">>,
  ): Promise<T[]> {
    const now = new Date();
    const batch: WriteBatch = this.db.batch();
    const refs = items.map((item) => {
      const ref = this.getCollection().doc();
      const payload = prepareForFirestore({
        ...(item as Record<string, unknown>),
        createdAt: now,
        updatedAt: now,
      });
      batch.set(ref, payload);
      return ref;
    });
    await batch.commit();

    // Fetch created docs in one round-trip
    const snaps = await Promise.all(refs.map((r) => r.get()));
    return snaps.map((s) => this.mapDoc(s));
  }

  async batchDelete(ids: string[]): Promise<void> {
    const batch: WriteBatch = this.db.batch();
    for (const id of ids) {
      batch.delete(this.getCollection().doc(id));
    }
    await batch.commit();
  }

  // ── Extended helpers (not in IRepository contract) ────────────────────────

  /** Find by ID or throw `Error` with a descriptive message. */
  async findByIdOrFail(id: string): Promise<T> {
    const doc = await this.findById(id);
    if (!doc) throw new Error(`Document not found: ${this.collection}/${id}`);
    return doc;
  }

  /** Find first document where `field == value`. */
  async findOneBy(field: string, value: unknown): Promise<T | null> {
    const snap = await this.getCollection()
      .where(field, "==", value)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return this.mapDoc(snap.docs[0]);
  }

  /** Count all documents in the collection. */
  async count(): Promise<number> {
    const snap = await this.getCollection().count().get();
    return snap.data().count;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const TOKEN_TO_OP: Record<string, FirebaseFirestore.WhereFilterOp> = {
  "==": "==",
  "!=": "!=",
  "<": "<",
  "<=": "<=",
  ">": ">",
  ">=": ">=",
  "@=": "array-contains",
};

/** Best-effort scalar coercion for sieve filter values. */
function coerceValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  const n = Number(raw);
  if (!Number.isNaN(n) && raw !== "") return n;
  return raw;
}
