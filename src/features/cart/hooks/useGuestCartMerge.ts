import { useEffect, useRef } from "react";
import { apiClient } from "../../../http";
import {
  clearGuestCart,
  clearGuestReturnTo,
  getGuestCartItems,
  getGuestReturnTo,
  type GuestCartItem,
} from "../utils/guest-cart";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";

export interface UseGuestCartMergeOptions {
  userId: string | null | undefined;
  mergeEndpoint?: string;
  onNavigate?: (url: string) => void;
  mergeFn?: (items: GuestCartItem[]) => Promise<void>;
  onMerged?: (count: number) => void;
  onMergeFailed?: (error: unknown) => void;
}

/**
 * useGuestCartMerge
 *
 * Merges guest cart into server cart exactly once per login transition.
 */
export function useGuestCartMerge(options: UseGuestCartMergeOptions): void {
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    const uid = options.userId ?? null;

    if (!uid) {
      prevUidRef.current = null;
      return;
    }

    if (prevUidRef.current === uid) return;
    prevUidRef.current = uid;

    const items = getGuestCartItems();
    const returnTo = getGuestReturnTo();

    if (items.length === 0) {
      if (returnTo) {
        clearGuestReturnTo();
        options.onNavigate?.(returnTo);
      }
      return;
    }

    const mergeFn =
      options.mergeFn ??
      (async (payload: GuestCartItem[]) => {
        await apiClient.post(
          options.mergeEndpoint ?? CART_ENDPOINTS.MERGE,
          payload,
        );
      });

    mergeFn(items)
      .then(() => {
        clearGuestCart();
        options.onMerged?.(items.length);
        if (returnTo) {
          clearGuestReturnTo();
          options.onNavigate?.(returnTo);
        }
      })
      .catch((err) => {
        options.onMergeFailed?.(err);
        if (returnTo) clearGuestReturnTo();
      });
  }, [options]);
}
