"use client"
import { useCallback, useState } from "react";
import { useToast } from "../../../ui";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

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
      const e = normalizeError(err);
      setInWishlist(prev);
      showToast(
        toUserMessage(e.code, undefined, {
          fallback: prev
            ? "Could not remove this item from your wishlist."
            : "Could not add this item to your wishlist.",
        }),
        "error",
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [actions, inWishlist, productId, showToast]);

  return { inWishlist, isLoading, toggle };
}
