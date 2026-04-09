"use client";

import { useQuery } from "@tanstack/react-query";
import type { LoyaltyBalance } from "../types";

export function useLoyaltyBalance(uid: string | undefined) {
  return useQuery<LoyaltyBalance | null>({
    queryKey: ["loyalty", "balance", uid],
    queryFn: async () => {
      if (!uid) return null;
      const res = await fetch(`/api/loyalty/balance?uid=${uid}`);
      if (!res.ok) return null;
      return res.json() as Promise<LoyaltyBalance>;
    },
    enabled: !!uid,
  });
}
