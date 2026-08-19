"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { apiClient } from "../../../http";
import { normalizeError } from "../../../errors/normalize";
import { useGuestWishlist } from "./useGuestWishlist";
import {
  clearGuestWishlist,
  getGuestWishlistItems,
} from "../utils/guest-wishlist";
import { WISHLIST_MAX } from "../../../constants/limits";
import { WISHLIST_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  WISHLIST_OPS_CHANGE_EVENT,
  getWishlistOpsDelta,
} from "../../cart/utils/pending-ops";
import type { WishlistResponse } from "../types";

/** Custom event fired when the server reports the wishlist is full during a merge. */
export const WISHLIST_CAP_EVENT = "appkit/wishlist/full";
export interface WishlistCapEventDetail {
  limit: number;
  current: number;
  skippedFull: number;
}

function dispatchCapEvent(detail: WishlistCapEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WishlistCapEventDetail>(WISHLIST_CAP_EVENT, { detail }),
  );
}

/**
 * useWishlistCount
 *
 * Server-authoritative count for the badge. For authenticated users this
 * mirrors `/api/wishlist` via react-query (same `["wishlist", uid]` key as
 * `useWishlist`), storing a full WishlistResponse so both hooks share the
 * cache without type collisions. For guests, falls back to the localStorage
 * guest store.
 *
 * On login the hook pushes any guest items up to the server once, then clears
 * the guest store so the two stores cannot drift.
 */
export function useWishlistCount(userId: string | null | undefined) {
  const { count: guestCount } = useGuestWishlist();
  const queryClient = useQueryClient();
  const mergedRef = useRef<string | null>(null);
  const pathname = usePathname();

  const { data: wishlistData } = useQuery<WishlistResponse | null>({
    queryKey: ["wishlist", userId],
    queryFn: () => apiClient.get<WishlistResponse | null>(WISHLIST_ENDPOINTS.BY_USER(userId as string)),
    enabled: !!userId,
    staleTime: 30_000,
  });
  const serverTotal = wishlistData?.total ?? wishlistData?.items?.length ?? 0;

  // Listing-page heart toggles write local-first (see useSyncManager) and
  // queue an unsynced op that only reaches the server on the next ~30s
  // background sync. Layer that pending delta on top of the server count so
  // the badge updates the instant the toggle fires instead of lagging behind.
  const [pendingDelta, setPendingDelta] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const recompute = () => setPendingDelta(getWishlistOpsDelta());
    recompute();
    window.addEventListener(WISHLIST_OPS_CHANGE_EVENT, recompute);
    return () => window.removeEventListener(WISHLIST_OPS_CHANGE_EVENT, recompute);
  }, [userId]);

  // Merge on login: push guest items → server once, then clear local store.
  useEffect(() => {
    if (!userId) {
      mergedRef.current = null;
      return;
    }
    if (mergedRef.current === userId) return;
    mergedRef.current = userId;

    const items = getGuestWishlistItems().filter((i) =>
      ["product", "auction", "preorder"].includes(i.type),
    );

    const finish = () => {
      clearGuestWishlist();
      void queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
    };

    if (items.length === 0) {
      finish();
      return;
    }

    apiClient
      .post<{ capReached?: boolean; skippedFull?: number; limit?: number }>(
        WISHLIST_ENDPOINTS.MERGE,
        { items: items.map((i) => ({ productId: i.itemId })) },
      )
      .then((data) => {
        if (data?.capReached) {
          dispatchCapEvent({
            limit: data.limit ?? WISHLIST_MAX,
            current: data.limit ?? WISHLIST_MAX,
            skippedFull: data.skippedFull ?? 0,
          });
        }
      })
      .catch((err: unknown) => void normalizeError(err))
      .finally(finish);
  }, [userId, queryClient]);

  // Refetch when the user lands on /wishlist or /cart so the badge matches
  // whatever the page is about to render.
  useEffect(() => {
    if (!userId || !pathname) return;
    if (/\/(wishlist|cart)(\/|$)/.test(pathname)) {
      void queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
    }
  }, [pathname, userId, queryClient]);

  if (userId) return Math.max(0, (serverTotal ?? 0) + pendingDelta);
  return guestCount;
}

/**
 * useWishlistCountWithLimit — extends useWishlistCount with limit + isFull so
 * UI can show "12/20" badges and disable add buttons at the cap.
 */
export function useWishlistCountWithLimit(userId: string | null | undefined) {
  const count = useWishlistCount(userId);
  return {
    count,
    limit: WISHLIST_MAX,
    isFull: count >= WISHLIST_MAX,
    isNearLimit: count >= WISHLIST_MAX - 2,
  };
}
