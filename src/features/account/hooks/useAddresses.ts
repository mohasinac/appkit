"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../http";

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
  isDefault?: boolean;
}

interface SetDefaultAddressData {
  addressId: string;
}

const DEFAULT_ENDPOINTS = {
  list: "/api/user/addresses",
  byId: (id: string) => `/api/user/addresses/${id}`,
  setDefault: (id: string) => `/api/user/addresses/${id}/set-default`,
};

export function useAddresses(options?: {
  enabled?: boolean;
  listEndpoint?: string;
}) {
  const endpoint = options?.listEndpoint ?? DEFAULT_ENDPOINTS.list;
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

export function useUpdateAddress(
  id: string,
  options?: {
    byIdEndpoint?: (id: string) => string;
    onSuccess?: (data: Address) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();
  const byIdEndpoint = options?.byIdEndpoint ?? DEFAULT_ENDPOINTS.byId;
  return useMutation<Address, Error, AddressFormData>({
    mutationFn: (data) => apiClient.patch<Address>(byIdEndpoint(id), data),
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
