import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  /**
   * A nearby reference point ("opposite the Metro station").
   *
   * Store addresses have always accepted it — `POST /api/store/addresses`
   * declares `landmark: z.string().max(100).optional()` and
   * `SellerAddressesView`'s drawer collects it — while this shape did not.
   * So an address created in that drawer WITH a landmark, then edited through
   * any surface built on `AddressForm`, was saved back with `landmark`
   * absent and lost it. Added here, on the form, and on the `Address` type so
   * the round trip is lossless.
   */
  landmark?: string;
  isDefault?: boolean;
}

export interface AddressFormData {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  /** See Address.landmark — the form must carry it or an edit drops it. */
  landmark?: string;
  isDefault?: boolean;
}

interface SetDefaultAddressData {
  addressId: string;
}

const DEFAULT_ENDPOINTS = {
  list: ACCOUNT_ENDPOINTS.ADDRESSES,
  byId: ACCOUNT_ENDPOINTS.ADDRESS_BY_ID,
  setDefault: ACCOUNT_ENDPOINTS.ADDRESS_SET_DEFAULT,
};

export interface AddressFilterParams {
  q?: string;
  addressType?: string;
  verified?: boolean;
  activeOnly?: boolean;
}

export function useAddresses(options?: {
  enabled?: boolean;
  listEndpoint?: string;
  filters?: AddressFilterParams;
}) {
  const sp = new URLSearchParams();
  if (options?.filters?.q) sp.set("q", options.filters.q);
  if (options?.filters?.addressType) sp.set("addressType", options.filters.addressType);
  if (options?.filters?.verified) sp.set("verified", "true");
  if (options?.filters?.activeOnly) sp.set("activeOnly", "true");
  const qs = sp.toString();
  const base = options?.listEndpoint ?? DEFAULT_ENDPOINTS.list;
  const endpoint = qs ? `${base}?${qs}` : base;

  return useQuery<Address[]>({
    queryKey: ["addresses", endpoint],
    queryFn: () => apiClient.get<Address[]>(endpoint),
    enabled: options?.enabled,
  });
}

export function useAddress(
  id: string,
  options?: {
    enabled?: boolean;
    byIdEndpoint?: (id: string) => string;
  },
) {
  const byIdEndpoint = options?.byIdEndpoint ?? DEFAULT_ENDPOINTS.byId;
  return useQuery<Address>({
    queryKey: ["address", id],
    queryFn: () => apiClient.get<Address>(byIdEndpoint(id)),
    enabled: options?.enabled !== false && !!id,
  });
}

export function useCreateAddress(options?: {
  listEndpoint?: string;
  onSuccess?: (data: Address) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const endpoint = options?.listEndpoint ?? DEFAULT_ENDPOINTS.list;
  return useMutation<Address, Error, AddressFormData>({
    mutationFn: (data) => apiClient.post<Address>(endpoint, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update options.
 *
 * `method` exists because the two portals disagree: `/api/user/addresses/[id]`
 * exports PATCH and `/api/store/addresses/[id]` exports PUT, and
 * `SellerAddressesView` hardcodes PUT against the latter. Changing the route's
 * verb would break that working call site, so the hook bends instead.
 *
 * Caught by `audit-client-verb-match` before the store pages were written —
 * this hook would have 405'd the moment they reused it.
 */
export interface UpdateAddressOptions {
  byIdEndpoint?: (id: string) => string;
  method?: "PUT" | "PATCH";
}

export function useUpdateAddress(
  id: string,
  options?: UpdateAddressOptions & {
    onSuccess?: (data: Address) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();
  const byIdEndpoint = options?.byIdEndpoint ?? DEFAULT_ENDPOINTS.byId;
  const method = options?.method ?? "PATCH";
  return useMutation<Address, Error, AddressFormData>({
    mutationFn: (data) =>
      method === "PUT"
        ? apiClient.put<Address>(byIdEndpoint(id), data)
        : apiClient.patch<Address>(byIdEndpoint(id), data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDeleteAddress(options?: {
  byIdEndpoint?: (id: string) => string;
  onSuccess?: (data: void) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const byIdEndpoint = options?.byIdEndpoint ?? DEFAULT_ENDPOINTS.byId;
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => apiClient.delete<void>(byIdEndpoint(id)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useSetDefaultAddress(options?: {
  setDefaultEndpoint?: (id: string) => string;
  onSuccess?: (data: Address) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const setDefaultEndpoint =
    options?.setDefaultEndpoint ?? DEFAULT_ENDPOINTS.setDefault;
  return useMutation<Address, Error, SetDefaultAddressData>({
    mutationFn: ({ addressId }) =>
      apiClient.post<Address>(setDefaultEndpoint(addressId), {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
