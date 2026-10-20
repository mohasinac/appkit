"use client"
import { normalizeError } from "../../../errors/normalize";
import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type ApiClientError } from "../../../http";
import { addToGuestCart, getGuestCartItems } from "../utils/guest-cart";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";
import { dispatchCartUpdated, formatCartAddedMessage, type CartUpdatedEventDetail } from "../utils/pending-ops";
import { useToast } from "../../../ui/components/Toast";
import { formatCurrency } from "../../../utils/number.formatter";
import { useCanSeePrices } from "../../../react/hooks/useCanSeePrices";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import type { JsonValue } from "@mohasinac/appkit/client";

interface AddToCartPayload {
  productId: string;
  quantity: number;
  productTitle?: string;
  productImage?: string;
  price?: number;
  storeId?: string;
  storeName?: string;
  [key: string]: JsonValue | undefined;
}

interface AddToCartServerResponse {
  itemCount?: number;
  subtotal?: number;
}

function showAddedToast(
  showToast: (msg: string, variant: "success" | "error") => void,
  detail: CartUpdatedEventDetail,
  canSeePrices: boolean,
): void {
  showToast(
    formatCartAddedMessage(
      detail,
      (amount) => formatCurrency(amount, getDefaultCurrency()),
      canSeePrices,
    ),
    "success",
  );
}

interface UseAddToCartOptions {
  endpoint?: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * useAddToCart
 *
 * Tries server cart first. If unauthorized, falls back to guest cart storage.
 */
export function useAddToCart(options?: UseAddToCartOptions) {
  const queryClient = useQueryClient();
  const endpoint = options?.endpoint ?? CART_ENDPOINTS.GET;
  const { showToast } = useToast();
  // The guest fallback below fires precisely when the viewer is NOT signed in,
  // so a toast that quoted the cart total was the one place the price gate was
  // guaranteed to be speaking to a guest.
  const { canSeePrices } = useCanSeePrices();

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const serverMutation = useMutation<AddToCartServerResponse, ApiClientError, AddToCartPayload>(
    {
      mutationFn: (data) => apiClient.post(endpoint, data),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        const itemCount = data?.itemCount ?? 0;
        const totalValue = data?.subtotal ?? 0;
        showAddedToast(showToast, { productTitle: variables.productTitle, itemCount, totalValue }, canSeePrices);
        dispatchCartUpdated({ itemCount, totalValue, productTitle: variables.productTitle });
        optionsRef.current?.onSuccess?.();
      },
      onError: (err) => optionsRef.current?.onError?.(err),
    },
  );

  const mutate = useCallback(
    async (data: AddToCartPayload): Promise<unknown> => {
      try {
        return await serverMutation.mutateAsync(data);
      } catch (err) {
        void normalizeError(err);
        const apiErr = err as ApiClientError;
        if (apiErr?.status === 401 || apiErr?.status === 403) {
          addToGuestCart(data.productId, data.quantity, {
            productTitle: data.productTitle,
            productImage: data.productImage,
            price: data.price,
            storeId: data.storeId,
            storeName: data.storeName,
          });
          const guestItems = getGuestCartItems();
          const itemCount = guestItems.reduce((sum, it) => sum + it.quantity, 0);
          const totalValue = guestItems.reduce((sum, it) => sum + (it.price ?? 0) * it.quantity, 0);
          showAddedToast(showToast, { productTitle: data.productTitle, itemCount, totalValue }, canSeePrices);
          dispatchCartUpdated({ itemCount, totalValue, productTitle: data.productTitle });
          optionsRef.current?.onSuccess?.();
          return undefined;
        }
        throw err;
      }
    },
    [serverMutation, showToast, canSeePrices],
  );

  return {
    mutate,
    isLoading: serverMutation.isPending,
    error: serverMutation.error,
    data: serverMutation.data,
    reset: serverMutation.reset,
  };
}
