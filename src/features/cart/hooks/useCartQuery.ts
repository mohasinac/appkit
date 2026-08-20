import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { FirestoreValue } from "@mohasinac/appkit";

interface UseCartQueryOptions<TData> {
  endpoint: string;
  queryKey?: readonly FirestoreValue[];
  enabled?: boolean;
  initialData?: TData;
}

export function useCartQuery<TData = unknown>(
  options: UseCartQueryOptions<TData>,
) {
  return useQuery<TData>({
    queryKey: options.queryKey ?? ["cart"],
    queryFn: () => apiClient.get<TData>(options.endpoint),
    enabled: options.enabled,
    initialData: options.initialData,
    // Override the app-wide refetchOnWindowFocus:false default — the cart is
    // explicitly meant to be cross-device-synced (mobile add -> desktop
    // sees it), so an already-open desktop tab must refetch when refocused
    // rather than keep showing whatever it had cached before the mobile
    // sync landed on the server.
    refetchOnWindowFocus: true,
  });
}
