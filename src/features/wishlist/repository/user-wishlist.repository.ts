/**
 * UserWishlistRepository — one document per user at top-level `wishlists/wishlist-{userSlug}`.
 *
 * Doc shape: { userId: string, items: UserWishlistItem[], updatedAt: Date }
 * - id === slug === `wishlist-{userSlug}` (LetItRip id-equals-slug convention)
 * - userSlug === user.uid (per users-seed-data.ts: id === uid === slug)
 * - items ordered newest-first (addedAt desc)
 * - hard cap WISHLIST_MAX (20); idempotent re-add is a no-op; over-cap throws WishlistFullError
 * - all mutations run inside a Firestore transaction (concurrent-write safe)
 */

import { getAdminDb } from "../../../providers/db-firebase";
import type { JsonValue } from "@mohasinac/appkit";
import { serverLogger } from "../../../monitoring";
import {
  WISHLIST_COLLECTION,
  WISHLIST_DOC_ID,
  WISHLIST_MAX,
} from "../../../constants/limits";

export interface WishlistItemSnapshot {
  title?: string;
  thumb?: string;
  currentPrice?: number;
}

export interface UserWishlistItem {
  productId: string;
  productType?: "product" | "auction" | "preorder";
  addedAt: Date;
  priceAtAdd?: number;
  productSnapshot?: WishlistItemSnapshot;
}

export interface WishlistDocument {
  userId: string;
  items: UserWishlistItem[];
  updatedAt: Date;
}

export class WishlistFullError extends Error {
  readonly code = "WISHLIST_FULL" as const;
  readonly limit = WISHLIST_MAX;
  readonly current: number;
  constructor(current: number) {
    super(`Wishlist full (${current}/${WISHLIST_MAX})`);
    this.name = "WishlistFullError";
    this.current = current;
  }
}

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
    return (raw as { toDate: () => Date }).toDate();
  }
  if (typeof raw === "string" || typeof raw === "number") return new Date(raw);
  return new Date();
}

function normaliseItems(raw: unknown): UserWishlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, JsonValue> => !!r && typeof r === "object")
    .map((r) => ({
      productId: String(r.productId ?? ""),
      productType: r.productType as UserWishlistItem["productType"],
      addedAt: toDate(r.addedAt),
      priceAtAdd: typeof r.priceAtAdd === "number" ? r.priceAtAdd : undefined,
      productSnapshot: (r.productSnapshot ?? undefined) as WishlistItemSnapshot | undefined,
    }))
    .filter((i) => i.productId);
}

export class UserWishlistRepository {
  private docRef(userSlug: string) {
    return getAdminDb()
      .collection(WISHLIST_COLLECTION)
      .doc(WISHLIST_DOC_ID(userSlug));
  }

  async getWishlistItems(userSlug: string): Promise<UserWishlistItem[]> {
    try {
      const snap = await this.docRef(userSlug).get();
      if (!snap.exists) return [];
      const items = normaliseItems(snap.data()?.items);
      // TS10: drop entries whose product no longer exists (was deleted/unpublished).
      return await this.filterExistingProducts(items);
    } catch (error) {
      serverLogger.error("UserWishlistRepository.getWishlistItems error", {
        userSlug,
        error,
      });
      throw error;
    }
  }

  private async filterExistingProducts(
    items: UserWishlistItem[],
  ): Promise<UserWishlistItem[]> {
    if (items.length === 0) return items;
    const db = getAdminDb();
    const checks = await Promise.all(
      items.map(async (item) => {
        try {
          const doc = await db.collection("products").doc(item.productId).get();
          return doc.exists ? item : null;
        } catch {
          return item;
        }
      }),
    );
    return checks.filter((i): i is UserWishlistItem => i !== null);
  }

  async countByUser(userSlug: string): Promise<number> {
    const snap = await this.docRef(userSlug).get();
    if (!snap.exists) return 0;
    const items = snap.data()?.items;
    return Array.isArray(items) ? items.length : 0;
  }

  async isInWishlist(userSlug: string, productId: string): Promise<boolean> {
    const items = await this.getWishlistItems(userSlug);
    return items.some((i) => i.productId === productId);
  }

  /**
   * Add a product to the wishlist. Idempotent on existing productId (no-op, no error).
   * Throws WishlistFullError if at cap and productId is not already present.
   * Returns the new total count.
   */
  async addItem(
    userSlug: string,
    productId: string,
    extras?: {
      productType?: UserWishlistItem["productType"];
      priceAtAdd?: number;
      productSnapshot?: WishlistItemSnapshot;
    },
  ): Promise<number> {
    const db = getAdminDb();
    const ref = this.docRef(userSlug);
    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const items: UserWishlistItem[] = snap.exists
          ? normaliseItems(snap.data()?.items)
          : [];
        if (items.some((i) => i.productId === productId)) {
          return items.length; // idempotent
        }
        if (items.length >= WISHLIST_MAX) {
          throw new WishlistFullError(items.length);
        }
        const newItem: UserWishlistItem = {
          productId,
          productType: extras?.productType,
          addedAt: new Date(),
          priceAtAdd: extras?.priceAtAdd,
          productSnapshot: extras?.productSnapshot,
        };
        const next = [newItem, ...items];
        tx.set(ref, {
          userId: userSlug,
          items: next,
          updatedAt: new Date(),
        });
        return next.length;
      });
    } catch (error) {
      if (error instanceof WishlistFullError) throw error;
      serverLogger.error("UserWishlistRepository.addItem error", {
        userSlug,
        productId,
        error,
      });
      throw error;
    }
  }

  async removeItem(userSlug: string, productId: string): Promise<void> {
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
      serverLogger.error("UserWishlistRepository.removeItem error", {
        userSlug,
        productId,
        error,
      });
      throw error;
    }
  }

  async clearWishlist(userSlug: string): Promise<void> {
    try {
      await this.docRef(userSlug).set({
        userId: userSlug,
        items: [],
        updatedAt: new Date(),
      });
    } catch (error) {
      serverLogger.error("UserWishlistRepository.clearWishlist error", {
        userSlug,
        error,
      });
      throw error;
    }
  }

  /** Admin: returns one row per user (for the admin insights view). */
  async findAllSummaries(): Promise<
    { userId: string; itemCount: number; updatedAt: Date }[]
  > {
    const snap = await getAdminDb().collection(WISHLIST_COLLECTION).get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      const items = Array.isArray(data?.items) ? data.items : [];
      return {
        userId: String(data?.userId ?? doc.id.replace(/^wishlist-/, "")),
        itemCount: items.length,
        updatedAt: toDate(data?.updatedAt),
      };
    });
  }
}

export const wishlistRepository = new UserWishlistRepository();
