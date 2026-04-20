import { useQuery } from "@tanstack/react-query";
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
      const res = await fetch(endpoint);
      if (!res.ok) return null;
      return res.json() as Promise<LoyaltyBalance>;
    },
    enabled: !!uid,
  });
}
