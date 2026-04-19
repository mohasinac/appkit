"use client";

import { useQuery } from "@tanstack/react-query";
import type { LoyaltyBalance } from "../types";
import { LOYALTY_ENDPOINTS } from "../../../constants/api-endpoints";

export function useLoyaltyBalance(uid: string | undefined) {
  return useQuery<LoyaltyBalance | null>({
    queryKey: ["loyalty", "balance", uid],
    queryFn: async () => {
      if (!uid) return null;
      const res = await fetch(LOYALTY_ENDPOINTS.BALANCE(uid));
      if (!res.ok) return null;
      return res.json() as Promise<LoyaltyBalance>;
    },
    enabled: !!uid,
  });
}
