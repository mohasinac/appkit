import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";

interface UseCheckoutReadQueriesOptions<TAddress, TCart> {
  addressesEndpoint: string;
  cartEndpoint: string;
  addressesQueryKey?: unknown[];
  cartQueryKey?: unknown[];
  enabled?: boolean;
  initialAddresses?: TAddress[];
  initialCart?: TCart;
}

export function useCheckoutReadQueries<TAddress = unknown, TCart = unknown>(
  options: UseCheckoutReadQueriesOptions<TAddress, TCart>,
) {
  const addressQuery = useQuery<TAddress[]>({
    queryKey: options.addressesQueryKey ?? ["addresses"],
    queryFn: () => apiClient.get<TAddress[]>(options.addressesEndpoint),
    enabled: options.enabled,
    initialData: options.initialAddresses,
  });

  const cartQuery = useQuery<TCart>({
    queryKey: options.cartQueryKey ?? ["cart"],
    queryFn: () => apiClient.get<TCart>(options.cartEndpoint),
    enabled: options.enabled,
    initialData: options.initialCart,
  });

  return { addressQuery, cartQuery };
}
