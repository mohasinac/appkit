"use client"
/**
 * useSyncManager
 *
 * Local-first cart + wishlist architecture.
 *
 * Every SYNC_INTERVAL_MS (30 s default), if the user is logged in, replays all
 * pending cart/wishlist ops against the server and clears the queue.
 *
 * If not logged in: ops stay in the queue (persisted to localStorage) and
 * will be replayed the next time the user logs in.
 *
 * This hook NEVER makes GET /api/cart or GET /api/user/wishlist calls.
 * The local store (guest-cart / guest-wishlist) is always the source of truth.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../http";
import {
  getCartOps,
  clearCartOps,
  getWishlistOps,
  clearWishlistOps,
} from "../../features/cart/utils/pending-ops";

const SYNC_INTERVAL_MS = 30_000;

async function replayCartOps(): Promise<void> {
  const ops = getCartOps();
  if (ops.length === 0) return;

  // Replay in chronological order; ignore individual failures (non-fatal)
  for (const op of ops) {
    if (op.op === "add") {
      await apiClient
        .post("/api/cart", {
          productId: op.productId,
          quantity: op.quantity ?? 1,
        })
        .catch(console.error);
    } else if (op.op === "remove") {
      await apiClient
        .delete(`/api/cart/${op.productId}`)
        .catch(console.error);
    }
  }
  clearCartOps();
}

async function replayWishlistOps(): Promise<void> {
  const ops = getWishlistOps();
  if (ops.length === 0) return;

  for (const op of ops) {
    if (op.type !== "product") continue; // server wishlist is product-only
    if (op.op === "add") {
      await apiClient
        .post("/api/user/wishlist", { productId: op.itemId })
        .catch(console.error);
    } else if (op.op === "remove") {
      await apiClient
        .delete(`/api/user/wishlist/${op.itemId}`)
        .catch(console.error);
    }
  }
  clearWishlistOps();
}

export function useSyncManager(userId: string | null | undefined): void {
  const isSyncing = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return; // Guest — keep ops in queue, don't sync

    async function invalidateAfterSync(
      hadCartOps: boolean,
      hadWishlistOps: boolean,
    ): Promise<void> {
      if (hadCartOps) {
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
      if (hadWishlistOps) {
        await queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
      }
    }

    const sync = async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      try {
        const hadCartOps = getCartOps().length > 0;
        const hadWishlistOps = getWishlistOps().length > 0;
        await Promise.all([replayCartOps(), replayWishlistOps()]);
        await invalidateAfterSync(hadCartOps, hadWishlistOps);
      } finally {
        isSyncing.current = false;
      }
    };

    // Sync once immediately on login so the server is updated right away
    sync();

    const id = setInterval(sync, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId, queryClient]);
}
