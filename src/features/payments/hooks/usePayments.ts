"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { PaymentSettings } from "../types";

export function usePaymentSettings(opts?: {
  initialData?: PaymentSettings;
  enabled?: boolean;
}) {
  const query = useQuery<PaymentSettings>({
    queryKey: ["payment-settings"],
    queryFn: () =>
      apiClient.get<PaymentSettings>("/api/admin/payments/settings"),
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
