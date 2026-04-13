"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CartData } from "../types";

interface UseCartOptions {
  initialData?: CartData;
  enabled?: boolean;
}

export function useCart(userIdOrSession: string, opts?: UseCartOptions) {
  const query = useQuery<CartData>({
    queryKey: ["cart", userIdOrSession],
    queryFn: () =>
      apiClient.get<CartData>(`/api/cart?userId=${userIdOrSession}`),
    initialData: opts?.initialData,
    enabled: opts?.enabled !== false && !!userIdOrSession,
  });

  return {
    items: query.data?.items ?? [],
    subtotal: query.data?.subtotal ?? 0,
    total: query.data?.total ?? 0,
    currency: query.data?.currency ?? "INR",
    itemCount: query.data?.itemCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
