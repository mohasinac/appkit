"use client";
/**
 * WishlistCapWatcher — listens for the `appkit/wishlist/full` window event
 * (dispatched by useWishlistCount when /api/wishlist/merge reports a cap
 * reached) and surfaces a toast via the appkit ToastProvider.
 *
 * Mount once globally, inside ToastProvider.
 */
import { useEffect } from "react";
import { useToast } from "../../../ui";
import {
  WISHLIST_CAP_EVENT,
  type WishlistCapEventDetail,
} from "../hooks/useWishlistCount";

export function WishlistCapWatcher() {
  const { showToast } = useToast();
  useEffect(() => {
    function onCap(e: Event) {
      const detail = (e as CustomEvent<WishlistCapEventDetail>).detail;
      const limit = detail?.limit ?? 20;
      showToast(
        `Wishlist full (${limit}/${limit}). Remove an item to add new ones.`,
        "warning",
      );
    }
    window.addEventListener(WISHLIST_CAP_EVENT, onCap);
    return () => window.removeEventListener(WISHLIST_CAP_EVENT, onCap);
  }, [showToast]);
  return null;
}
