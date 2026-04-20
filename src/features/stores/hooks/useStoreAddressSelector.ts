import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { AddressFormData } from "../../account";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";

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

export function useStoreAddressSelector(options?: {
  onCreated?: (id: string) => void;
  onCreateError?: () => void;
}) {
  const { data, isLoading, refetch } = useQuery<SavedAddress[]>({
    queryKey: ["store-addresses"],
    queryFn: () =>
      apiClient.get<SavedAddress[]>(SELLER_ENDPOINTS.STORE_ADDRESSES),
  });

  const addresses: SavedAddress[] = data ?? [];

  const { mutate: createAddress, isPending: isSaving } = useMutation<
    CreateAddressApiResponse,
    Error,
    AddressFormData
  >({
    mutationFn: async (data) => {
      const result = await apiClient.post<{ id: string }>(
        SELLER_ENDPOINTS.STORE_ADDRESSES,
        {
          ...data,
          isDefault: data.isDefault ?? false,
        },
      );
      return {
        success: true,
        data: { id: result.id, label: data.label, city: data.city },
      };
    },
    onSuccess: (res) => {
      refetch();
      if (res.data?.id) options?.onCreated?.(res.data.id);
    },
    onError: options?.onCreateError,
  });

  return { addresses, isLoading, refetch, createAddress, isSaving };
}
