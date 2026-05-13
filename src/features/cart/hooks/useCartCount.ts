import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { useGuestCart } from "./useGuestCart";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";

interface CartCountResponse {
  itemCount: number;
  cart?: unknown;
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

  // When authenticated, the server is authoritative — never mix in the guest
  // count, otherwise stale localStorage entries leak into the badge after
  // login (the cart-merge clears the local store but `useGuestCart`'s React
  // state holds the pre-clear snapshot until remount).
  if (enabled) return data?.itemCount ?? 0;
  return guestCount;
}
