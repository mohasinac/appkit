import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CartData } from "../types";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseCartOptions {
  initialData?: CartData;
  enabled?: boolean;
  endpoint?: string;
}

export function useCart(userIdOrSession: string, opts?: UseCartOptions) {
  const endpoint = opts?.endpoint ?? CART_ENDPOINTS.BY_USER(userIdOrSession);
  const query = useQuery<CartData>({
    queryKey: ["cart", userIdOrSession],
    queryFn: () =>
      apiClient.get<CartData>(endpoint),
    initialData: opts?.initialData,
    enabled: opts?.enabled !== false && !!userIdOrSession,
  });

  return {
    items: query.data?.items ?? [],
    subtotal: query.data?.subtotal ?? 0,
    total: query.data?.total ?? 0,
    currency: query.data?.currency ?? getDefaultCurrency(),
    itemCount: query.data?.itemCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
