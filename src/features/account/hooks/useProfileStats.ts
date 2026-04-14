"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";

export interface ProfileStats {
  orderCount: number;
  addressCount: number;
  isLoading: boolean;
}

export function useProfileStats(enabled: boolean): ProfileStats {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["user-orders-count"],
    queryFn: () =>
      apiClient.get<{ orders: unknown[]; total: number }>("/api/user/orders"),
    enabled,
  });

  const { data: addressesData, isLoading: addressesLoading } = useQuery({
    queryKey: ["user-addresses-count"],
    queryFn: () => apiClient.get<unknown[]>("/api/user/addresses"),
    enabled,
  });

  return {
    orderCount: ordersData?.total ?? 0,
    addressCount: Array.isArray(addressesData) ? addressesData.length : 0,
    isLoading: ordersLoading || addressesLoading,
  };
}
