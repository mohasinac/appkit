"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { PaymentSettings } from "../types";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export function usePaymentSettings(opts?: {
  initialData?: PaymentSettings;
  enabled?: boolean;
  endpoint?: string;
}) {
  const endpoint = opts?.endpoint ?? ADMIN_ENDPOINTS.PAYMENTS_SETTINGS;
  const query = useQuery<PaymentSettings>({
    queryKey: ["payment-settings"],
    queryFn: () => apiClient.get<PaymentSettings>(endpoint),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
    staleTime: 10 * 60 * 1000,
  });
  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
