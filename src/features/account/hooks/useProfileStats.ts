import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";

export interface ProfileStats {
  orderCount: number;
  addressCount: number;
  isLoading: boolean;
}

export function useProfileStats(enabled: boolean): ProfileStats {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["user-orders-count"],
    queryFn: () =>
      apiClient.get<{ orders: unknown[]; total: number }>(
        ACCOUNT_ENDPOINTS.ORDERS,
      ),
    enabled,
  });

  const { data: addressesData, isLoading: addressesLoading } = useQuery({
    queryKey: ["user-addresses-count"],
    queryFn: () => apiClient.get<unknown[]>(ACCOUNT_ENDPOINTS.ADDRESSES),
    enabled,
  });

  return {
    orderCount: ordersData?.total ?? 0,
    addressCount: Array.isArray(addressesData) ? addressesData.length : 0,
    isLoading: ordersLoading || addressesLoading,
  };
}
