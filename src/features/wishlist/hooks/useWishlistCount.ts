"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGuestWishlist } from "./useGuestWishlist";
import { getGuestWishlistItems } from "../utils/guest-wishlist";

const WISHLIST_API = "/api/wishlist";
const WISHLIST_MERGE_API = "/api/wishlist/merge";
const SYNC_MS = 60_000;

function getSyncableItems() {
  return getGuestWishlistItems().filter((i) =>
    ["product", "auction", "preorder"].includes(i.type),
  );
}

function pushToFirestore() {
  const items = getSyncableItems();
  if (!items.length) return;
  fetch(WISHLIST_MERGE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: items.map((i) => ({ productId: i.itemId })) }),
  }).catch(() => {});
}

/**
 * useWishlistCount
 *
 * Returns wishlist count always from localStorage — same source for guest and
 * authenticated users, so the badge is instant with no API round-trip.
 *
 * When userId changes from null → a real uid (login):
 *   1. Fetches Firestore wishlist and merges into localStorage.
 *   2. Pushes any guest-only localStorage items up to Firestore.
 *
 * While authenticated:
 *   - Syncs localStorage → Firestore every 60 s.
 *   - Also syncs when the user visits /wishlist or /cart.
 */
export function useWishlistCount(userId: string | null | undefined) {
  const { count, add } = useGuestWishlist();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const mergedRef = useRef(false);
  const pathname = usePathname();

  // Merge on login: pull Firestore → localStorage, push guest items → Firestore
  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    // Only fire on the null/undefined → real-uid transition
    if (!userId || prev === userId) return;
    if (mergedRef.current) return;
    mergedRef.current = true;

    async function merge() {
      try {
        // 1. Pull server wishlist into localStorage (handles new device login)
        const resp = await fetch(WISHLIST_API);
        if (resp.ok) {
          const json = await resp.json() as {
            data?: { items?: Array<{ productId: string; productTitle?: string; productImage?: string }> };
          };
          const firestoreItems = json.data?.items ?? [];
          for (const item of firestoreItems) {
            add(item.productId, "product", {
              title: item.productTitle,
              image: item.productImage,
            });
          }
        }
        // 2. Push any guest-only items up to Firestore
        pushToFirestore();
      } catch {
        // Non-fatal — local count still shows correctly
      }
    }

    void merge();
  }, [userId, add]);

  // Reset merge flag on logout so next login re-runs the merge
  useEffect(() => {
    if (!userId) mergedRef.current = false;
  }, [userId]);

  // 60 s periodic sync: localStorage → Firestore
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(pushToFirestore, SYNC_MS);
    return () => clearInterval(id);
  }, [userId]);

  // Extra sync when the user lands on /wishlist or /cart
  useEffect(() => {
    if (!userId || !pathname) return;
    if (/\/(wishlist|cart)(\/|$)/.test(pathname)) {
      pushToFirestore();
    }
  }, [pathname, userId]);

  return count;
}
