/**
 * UserHistoryRepository — one document per user at top-level `history/history-{userSlug}`.
 *
 * Doc shape: { userId: string, items: UserHistoryItem[], updatedAt: Date }
 * - id === slug === `history-{userSlug}` (LetItRip id-equals-slug convention)
 * - userSlug === user.uid (per users-seed-data.ts: id === uid === slug)
 * - items ordered newest-first (position 0 = most recent)
 * - soft cap HISTORY_MAX (50); silent FIFO evict on overflow (no error)
 * - re-visit semantics: removes existing entry for productId and unshifts new at position 0
 * - all mutations run inside a Firestore transaction (concurrent-write safe)
 */

import { getAdminDb } from "../../../providers/db-firebase";
import { serverLogger } from "../../../monitoring";
import {
  HISTORY_COLLECTION,
  HISTORY_DOC_ID,
  HISTORY_MAX,
} from "../../../constants/limits";

export type HistoryProductType = "product" | "auction" | "preorder";

export interface HistoryItemSnapshot {
  title?: string;
  thumb?: string;
  price?: number;
  storeId?: string;
  storeName?: string;
}

export interface UserHistoryItem {
  productId: string;
  productType: HistoryProductType;
  viewedAt: Date;
  productSnapshot?: HistoryItemSnapshot;
}

export interface HistoryDocument {
  userId: string;
  items: UserHistoryItem[];
  updatedAt: Date;
}

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
    return (raw as { toDate: () => Date }).toDate();
  }
  if (typeof raw === "string" || typeof raw === "number") return new Date(raw);
  return new Date();
}

function normaliseItems(raw: unknown): UserHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      productId: String(r.productId ?? ""),
      productType: (r.productType as HistoryProductType) ?? "product",
      viewedAt: toDate(r.viewedAt),
      productSnapshot: (r.productSnapshot ?? undefined) as HistoryItemSnapshot | undefined,
    }))
    .filter((i) => i.productId);
}

export class UserHistoryRepository {
  private docRef(userSlug: string) {
    return getAdminDb()
      .collection(HISTORY_COLLECTION)
      .doc(HISTORY_DOC_ID(userSlug));
  }

  async getHistory(userSlug: string): Promise<UserHistoryItem[]> {
    try {
      const snap = await this.docRef(userSlug).get();
      if (!snap.exists) return [];
      return normaliseItems(snap.data()?.items);
    } catch (error) {
      serverLogger.error("UserHistoryRepository.getHistory error", {
        userSlug,
        error,
      });
      throw error;
    }
  }

  async countByUser(userSlug: string): Promise<number> {
    const snap = await this.docRef(userSlug).get();
    if (!snap.exists) return 0;
    const items = snap.data()?.items;
    return Array.isArray(items) ? items.length : 0;
  }

  /**
   * Track a visit: remove any existing entry for this productId, unshift the new
   * entry at position 0, then FIFO-trim the tail down to HISTORY_MAX. Silent — no
   * error if the array overflows.
   */
  async track(
    userSlug: string,
    item: Omit<UserHistoryItem, "viewedAt"> & { viewedAt?: Date },
  ): Promise<number> {
    const db = getAdminDb();
    const ref = this.docRef(userSlug);
    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const items: UserHistoryItem[] = snap.exists
          ? normaliseItems(snap.data()?.items)
          : [];
        const filtered = items.filter((i) => i.productId !== item.productId);
        const newItem: UserHistoryItem = {
          productId: item.productId,
          productType: item.productType,
          viewedAt: item.viewedAt ?? new Date(),
          productSnapshot: item.productSnapshot,
        };
        const next = [newItem, ...filtered].slice(0, HISTORY_MAX);
        tx.set(ref, {
          userId: userSlug,
          items: next,
          updatedAt: new Date(),
        });
        return next.length;
      });
    } catch (error) {
      serverLogger.error("UserHistoryRepository.track error", {
        userSlug,
        productId: item.productId,
        error,
      });
      throw error;
    }
  }

  /**
   * Bulk-merge guest history into the user's doc. Each input item dedupes by
   * productId (newer viewedAt wins), then FIFO-trim to HISTORY_MAX. Used on login.
   */
  async merge(
    userSlug: string,
    incoming: Array<Omit<UserHistoryItem, "viewedAt"> & { viewedAt?: Date }>,
  ): Promise<number> {
    const db = getAdminDb();
    const ref = this.docRef(userSlug);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing: UserHistoryItem[] = snap.exists
        ? normaliseItems(snap.data()?.items)
        : [];
      const merged = new Map<string, UserHistoryItem>();
      // Existing first
      for (const it of existing) merged.set(it.productId, it);
      // Incoming overwrites if newer viewedAt
      for (const it of incoming) {
        const newOne: UserHistoryItem = {
          productId: it.productId,
          productType: it.productType,
          viewedAt: it.viewedAt ?? new Date(),
          productSnapshot: it.productSnapshot,
        };
        const prev = merged.get(newOne.productId);
        if (!prev || newOne.viewedAt > prev.viewedAt) {
          merged.set(newOne.productId, newOne);
        }
      }
      const next = Array.from(merged.values())
        .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())
        .slice(0, HISTORY_MAX);
      tx.set(ref, {
        userId: userSlug,
        items: next,
        updatedAt: new Date(),
      });
      return next.length;
    });
  }

  async removeOne(userSlug: string, productId: string): Promise<void> {
    const db = getAdminDb();
    const ref = this.docRef(userSlug);
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const items = normaliseItems(snap.data()?.items);
        const next = items.filter((i) => i.productId !== productId);
        if (next.length === items.length) return;
        tx.set(ref, {
          userId: userSlug,
          items: next,
          updatedAt: new Date(),
        });
      });
    } catch (error) {
      serverLogger.error("UserHistoryRepository.removeOne error", {
        userSlug,
        productId,
        error,
      });
      throw error;
    }
  }

  async clearForUser(userSlug: string): Promise<void> {
    try {
      await this.docRef(userSlug).set({
        userId: userSlug,
        items: [],
        updatedAt: new Date(),
      });
    } catch (error) {
      serverLogger.error("UserHistoryRepository.clearForUser error", {
        userSlug,
        error,
      });
      throw error;
    }
  }

  /** Admin: returns one row per user. */
  async findAllSummaries(): Promise<
    { userId: string; itemCount: number; updatedAt: Date }[]
  > {
    const snap = await getAdminDb().collection(HISTORY_COLLECTION).get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      const items = Array.isArray(data?.items) ? data.items : [];
      return {
        userId: String(data?.userId ?? doc.id.replace(/^history-/, "")),
        itemCount: items.length,
        updatedAt: toDate(data?.updatedAt),
      };
    });
  }
}

export const historyRepository = new UserHistoryRepository();
