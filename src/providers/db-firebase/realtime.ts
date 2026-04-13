/**
 * FirebaseRealtimeRepository<T>
 *
 * Abstract base implementing `IRealtimeRepository<T>` from `@mohasinac/contracts`
 * against Firebase Realtime Database (Admin SDK).
 *
 * Realtime DB does not support Firestore-style queries; `findAll()` loads the
 * entire collection node.  Use this only for small, high-churn datasets (e.g.
 * presence, chat, live-bid prices).
 *
 * Usage:
 * ```ts
 * class PresenceRepository extends FirebaseRealtimeRepository<PresenceEntry> {
 *   constructor() { super("presence"); }
 * }
 * ```
 */

import type {
  IRealtimeRepository,
  PagedResult,
  SieveQuery,
  WhereOp,
} from "../../contracts";
import type { DocumentData } from "firebase-admin/firestore";
import { getAdminRealtimeDb } from "./admin";

export abstract class FirebaseRealtimeRepository<
  T extends DocumentData,
> implements IRealtimeRepository<T> {
  protected readonly path: string;

  constructor(rtdbPath: string) {
    this.path = rtdbPath;
  }

  protected get rtdb() {
    return getAdminRealtimeDb();
  }

  protected nodeRef(id?: string) {
    return id ? this.rtdb.ref(`${this.path}/${id}`) : this.rtdb.ref(this.path);
  }

  // ── IReadRepository ────────────────────────────────────────────────────────

  async findById(id: string): Promise<T | null> {
    const snap = await this.nodeRef(id).get();
    if (!snap.exists()) return null;
    return { id, ...snap.val() } as unknown as T;
  }

  async findAll(query?: SieveQuery): Promise<PagedResult<T>> {
    const snap = await this.nodeRef().get();
    if (!snap.exists()) {
      return {
        data: [],
        total: 0,
        page: 1,
        perPage: query?.perPage ?? 20,
        totalPages: 0,
      };
    }

    const raw = snap.val() as Record<string, Omit<T, "id">>;
    let data: T[] = Object.entries(raw).map(
      ([id, val]) => ({ id, ...val }) as unknown as T,
    );

    // Basic server-side sort (RTDB has no native multi-field sort)
    if (query?.sort) {
      const key = query.sort as keyof T;
      const dir = query.order === "desc" ? -1 : 1;
      data = data.slice().sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * dir;
      });
    }

    const total = data.length;
    const perPage = Math.max(1, query?.perPage ?? 20);
    const page = Math.max(1, query?.page ?? 1);
    const offset = (page - 1) * perPage;
    const totalPages =
      total === 0 ? 0 : Math.max(1, Math.ceil(total / perPage));

    return {
      data: data.slice(offset, offset + perPage),
      total,
      page,
      perPage,
      totalPages,
    };
  }

  async findWhere(field: keyof T, _op: WhereOp, value: unknown): Promise<T[]> {
    // RTDB Admin SDK supports orderByChild + equalTo for == only
    const snap = await this.nodeRef()
      .orderByChild(field as string)
      .equalTo(value as string | number | boolean | null)
      .get();
    if (!snap.exists()) return [];
    const raw = snap.val() as Record<string, Omit<T, "id">>;
    return Object.entries(raw).map(
      ([id, val]) => ({ id, ...val }) as unknown as T,
    );
  }

  // ── IWriteRepository ───────────────────────────────────────────────────────

  async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const now = Date.now();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const ref = await this.nodeRef().push(payload);
    return { id: ref.key as string, ...payload } as unknown as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const payload = { ...data, updatedAt: Date.now() };
    await this.nodeRef(id).update(payload as object);
    const snap = await this.nodeRef(id).get();
    return { id, ...snap.val() } as unknown as T;
  }

  async delete(id: string): Promise<void> {
    await this.nodeRef(id).remove();
  }

  async batchCreate(
    items: Array<Omit<T, "id" | "createdAt" | "updatedAt">>,
  ): Promise<T[]> {
    return Promise.all(items.map((item) => this.create(item)));
  }

  async batchDelete(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(id)));
  }

  // ── IRealtimeRepository ───────────────────────────────────────────────────

  /**
   * Subscribe to a single RTDB node.
   * Returns an unsubscribe function.
   *
   * NOTE: The Admin SDK `onValue` callback runs in-process but is not browser-side.
   * For browser real-time, use the client SDK directly.
   */
  subscribe(id: string, cb: (data: T | null) => void): () => void {
    const ref = this.nodeRef(id);
    const handler = (snap: {
      exists(): boolean;
      val(): Record<string, unknown> | null;
    }) => {
      cb(snap.exists() ? ({ id, ...snap.val() } as unknown as T) : null);
    };
    ref.on("value", handler as never);
    return () => ref.off("value", handler as never);
  }

  subscribeWhere(
    field: keyof T,
    value: unknown,
    cb: (items: T[]) => void,
  ): () => void {
    const ref = this.nodeRef()
      .orderByChild(field as string)
      .equalTo(value as string | number | boolean | null);

    const handler = (snap: {
      exists(): boolean;
      val(): Record<string, Record<string, unknown>> | null;
    }) => {
      if (!snap.exists()) {
        cb([]);
        return;
      }
      const raw = snap.val()!;
      cb(Object.entries(raw).map(([id, v]) => ({ id, ...v }) as unknown as T));
    };
    ref.on("value", handler as never);
    return () => ref.off("value", handler as never);
  }
}
