"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { useGuestCart } from "./useGuestCart";

interface CartCountResponse {
  itemCount: number;
  cart?: unknown;
  subtotal?: number;
}

/**
 * useCartCount
 *
 * Returns a live cart count, preferring server cart data when available
 * and falling back to guest-cart storage.
 */
export function useCartCount() {
  const { count: guestCount } = useGuestCart();
  const { data } = useQuery<CartCountResponse | null>({
    queryKey: ["cart"],
    queryFn: () => apiClient.get<CartCountResponse | null>("/api/cart"),
  });

  return data?.itemCount ?? guestCount;
}
