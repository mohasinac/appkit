"use client"
import { useState, useEffect, useCallback } from "react";
import {
  getGuestWishlistItems,
  addToGuestWishlist,
  removeFromGuestWishlist,
  isInGuestWishlist,
  clearGuestWishlist,
  getGuestWishlistByType,
  type GuestWishlistItem,
} from "../utils/guest-wishlist";

/**
 * useGuestWishlist
 *
 * React state wrapper around guest wishlist storage.
 */
export function useGuestWishlist() {
  const [items, setItems] = useState<GuestWishlistItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setItems(getGuestWishlistItems());
    setIsInitialized(true);
  }, []);

  const add = useCallback(
    (
      itemId: string,
      type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live",
      snapshot?: { title?: string; image?: string },
    ) => {
      const updated = addToGuestWishlist(itemId, type, snapshot);
      setItems(updated);
    },
    [],
  );

  const remove = useCallback(
    (
      itemId: string,
      type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live",
    ) => {
      const updated = removeFromGuestWishlist(itemId, type);
      setItems(updated);
    },
    [],
  );

  const isInWishlist = useCallback(
    (
      itemId: string,
      type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live",
    ) => {
      return isInGuestWishlist(itemId, type);
    },
    [],
  );

  const clear = useCallback(() => {
    clearGuestWishlist();
    setItems([]);
  }, []);

  const getByType = useCallback(
    (type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live") => {
      return getGuestWishlistByType(type);
    },
    [],
  );

  const count = items.length;
  const countByType = (type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live") => {
    return items.filter((i) => i.type === type).length;
  };

  return {
    items,
    count,
    countByType,
    add,
    remove,
    isInWishlist,
    clear,
    getByType,
    isInitialized,
  };
}
