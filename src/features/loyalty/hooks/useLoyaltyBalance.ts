"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http/ApiClient";
import { normalizeError } from "../../../errors/normalize";
import type { LoyaltyBalance } from "../types";
import { LOYALTY_ENDPOINTS } from "../../../constants/api-endpoints";

export function useLoyaltyBalance(uid: string | undefined, opts?: {
  endpoint?: string;
}) {
  return useQuery<LoyaltyBalance | null>({
    queryKey: ["loyalty", "balance", uid],
    queryFn: async () => {
      if (!uid) return null;
      const endpoint = opts?.endpoint ?? LOYALTY_ENDPOINTS.BALANCE(uid);
      try {
        return await apiClient.get<LoyaltyBalance>(endpoint);
      } catch (err) {
        // loyalty balance is a display feature — treat any fetch failure as null
        // so the loyalty section degrades gracefully without blocking the page
        void normalizeError(err);
        return null;
      }
    },
    enabled: !!uid,
  });
}
