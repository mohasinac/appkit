"use client"
import { useCallback, useState } from "react";
import { useToast } from "../../../ui";

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
  const { showToast } = useToast();

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
        showToast("Removed from wishlist.", "success");
      } else {
        await actions.addToWishlist(productId);
        showToast("Added to wishlist.", "success");
      }
    } catch (err) {
      setInWishlist(prev);
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [actions, inWishlist, productId, showToast]);

  return { inWishlist, isLoading, toggle };
}
