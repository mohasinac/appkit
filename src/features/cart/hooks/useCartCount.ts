"use client"
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { useGuestCart } from "./useGuestCart";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";
import { CART_OPS_CHANGE_EVENT, getCartOpsDelta } from "../utils/pending-ops";
import type { JsonValue } from "@mohasinac/appkit";

interface CartCountResponse {
  itemCount: number;
  cart?: JsonValue;
  subtotal?: number;
}

/**
 * useCartCount
 *
 * Returns a live cart count, preferring server cart data when available
 * and falling back to guest-cart storage. Pass `enabled=true` only when
 * a user session exists — prevents unauthenticated API calls sitewide.
 */
export function useCartCount(enabled = false) {
  const { count: guestCount } = useGuestCart();
  const { data } = useQuery<CartCountResponse | null>({
    queryKey: ["cart"],
    queryFn: () => apiClient.get<CartCountResponse | null>(CART_ENDPOINTS.GET),
    enabled,
  });

  // "Add to cart" quick actions (listing grid, product cards) write local-
  // first — see useSyncManager — and queue an unsynced op that only reaches
  // the server on the next ~30s background sync. Layer that pending delta on
  // top of the server count so the badge updates the instant the op is
  // queued instead of lagging up to 30s behind the toast.
  const [pendingDelta, setPendingDelta] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const recompute = () => setPendingDelta(getCartOpsDelta());
    recompute();
    window.addEventListener(CART_OPS_CHANGE_EVENT, recompute);
    return () => window.removeEventListener(CART_OPS_CHANGE_EVENT, recompute);
  }, [enabled]);

  // When authenticated, the server + pending-ops delta is authoritative —
  // never mix in the guest count, otherwise stale localStorage entries leak
  // into the badge after login (the cart-merge clears the local store but
  // `useGuestCart`'s React state holds the pre-clear snapshot until remount).
  if (enabled) return (data?.itemCount ?? 0) + pendingDelta;
  return guestCount;
}
