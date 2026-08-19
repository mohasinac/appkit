"use client"
import { useState, useEffect, useCallback } from "react";
import {
  getGuestCartItems,
  addToGuestCart,
  clearGuestCart,
  removeFromGuestCart,
  updateGuestCartQuantity,
  GUEST_CART_CHANGE_EVENT,
  type GuestCartItem,
} from "../utils/guest-cart";

/**
 * useGuestCart
 *
 * React state wrapper around guest cart storage.
 */
export function useGuestCart() {
  const [items, setItems] = useState<GuestCartItem[]>([]);

  useEffect(() => {
    setItems(getGuestCartItems());
    // Cross-instance sync within the same tab (e.g. a listing-page "Add to
    // cart" quick action writing storage while the header badge's own
    // useGuestCart() instance is mounted elsewhere) + cross-tab via "storage".
    const onChange = () => setItems(getGuestCartItems());
    window.addEventListener(GUEST_CART_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(GUEST_CART_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback(
    (
      productId: string,
      quantity: number,
      snapshot?: {
        productTitle?: string;
        productImage?: string;
        price?: number;
        storeId?: string;
        storeName?: string;
      },
    ) => {
      const updated = addToGuestCart(productId, quantity, snapshot);
      setItems(updated);
    },
    [],
  );

  const remove = useCallback((productId: string) => {
    const updated = removeFromGuestCart(productId);
    setItems(updated);
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const updated = updateGuestCartQuantity(productId, quantity);
    setItems(updated);
  }, []);

  const clear = useCallback(() => {
    clearGuestCart();
    setItems([]);
  }, []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, count, add, remove, updateQuantity, clear };
}
