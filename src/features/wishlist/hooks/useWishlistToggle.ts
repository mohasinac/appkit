"use client";

import { useCallback, useState } from "react";

export interface WishlistToggleActions {
  addToWishlist: (productId: string) => Promise<unknown>;
  removeFromWishlist: (productId: string) => Promise<unknown>;
}

export interface UseWishlistToggleReturn {
  inWishlist: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
}

export function useWishlistToggle(
  productId: string,
  initial = false,
  actions?: WishlistToggleActions,
): UseWishlistToggleReturn {
  const [inWishlist, setInWishlist] = useState(initial);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!productId) return;

    const prev = inWishlist;
    setInWishlist(!inWishlist);
    setIsLoading(true);

    try {
      if (!actions) {
        throw new Error(
          "useWishlistToggle requires add/remove handlers in this runtime.",
        );
      }

      if (prev) {
        await actions.removeFromWishlist(productId);
      } else {
        await actions.addToWishlist(productId);
      }
    } catch (err) {
      setInWishlist(prev);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [actions, inWishlist, productId]);

  return { inWishlist, isLoading, toggle };
}
