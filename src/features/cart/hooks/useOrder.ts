import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseOrderOptions<TOrder> {
  endpoint?: string;
  queryKeyPrefix?: string;
  enabled?: boolean;
  initialData?: TOrder | null;
}

export function useOrder<TOrder = unknown>(
  orderId: string | null,
  options?: UseOrderOptions<TOrder>,
) {
  const endpoint = options?.endpoint ?? ACCOUNT_ENDPOINTS.ORDER_BY_ID(orderId!);
  const queryKeyPrefix = options?.queryKeyPrefix ?? "order";

  const { data, isLoading, error, refetch } = useQuery<TOrder | null>({
    queryKey: [queryKeyPrefix, orderId ?? ""],
    queryFn: async () => {
      try {
        return await apiClient.get<TOrder>(endpoint);
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: (options?.enabled ?? true) && !!orderId,
    initialData: options?.initialData,
  });

  return { order: data ?? null, isLoading, error, refetch };
}
