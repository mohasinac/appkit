import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type ApiClientError } from "../../../http";
import { addToGuestCart } from "../utils/guest-cart";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";

interface AddToCartPayload {
  productId: string;
  quantity: number;
  productTitle?: string;
  productImage?: string;
  price?: number;
  [key: string]: unknown;
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

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const serverMutation = useMutation<unknown, ApiClientError, AddToCartPayload>(
    {
      mutationFn: (data) => apiClient.post(endpoint, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
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
        const apiErr = err as ApiClientError;
        if (apiErr?.status === 401 || apiErr?.status === 403) {
          addToGuestCart(data.productId, data.quantity, {
            productTitle: data.productTitle,
            productImage: data.productImage,
            price: data.price,
          });
          optionsRef.current?.onSuccess?.();
          return undefined;
        }
        throw err;
      }
    },
    [serverMutation],
  );

  return {
    mutate,
    isLoading: serverMutation.isPending,
    error: serverMutation.error,
    data: serverMutation.data,
    reset: serverMutation.reset,
  };
}
