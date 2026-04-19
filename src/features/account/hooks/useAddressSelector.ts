"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { AddressFormData } from "./useAddresses";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";

interface SavedAddress {
  id: string;
  label: string;
  city: string;
  fullName?: string;
  state?: string;
}

interface CreateAddressApiResponse {
  success: boolean;
  data?: SavedAddress;
}

const DEFAULT_ENDPOINTS = {
  list: ACCOUNT_ENDPOINTS.ADDRESSES,
  create: ACCOUNT_ENDPOINTS.ADDRESSES,
};

export function useAddressSelector(options?: {
  listEndpoint?: string;
  createEndpoint?: string;
  onCreated?: (id: string) => void;
  onCreateError?: () => void;
}) {
  const listEndpoint = options?.listEndpoint ?? DEFAULT_ENDPOINTS.list;
  const createEndpoint = options?.createEndpoint ?? DEFAULT_ENDPOINTS.create;

  const { data, isLoading, refetch } = useQuery<SavedAddress[]>({
    queryKey: ["user-addresses", listEndpoint],
    queryFn: () => apiClient.get<SavedAddress[]>(listEndpoint),
  });

  const addresses: SavedAddress[] = data ?? [];

  const { mutate: createAddress, isPending: isSaving } = useMutation<
    CreateAddressApiResponse,
    Error,
    AddressFormData
  >({
    mutationFn: async (payload) => {
      const result = await apiClient.post<SavedAddress>(
        createEndpoint,
        payload,
      );
      return { success: true, data: result };
    },
    onSuccess: (res) => {
      refetch();
      if (res.data?.id) options?.onCreated?.(res.data.id);
    },
    onError: options?.onCreateError,
  });

  return { addresses, isLoading, refetch, createAddress, isSaving };
}
