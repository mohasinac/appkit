"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http/ApiClient";
import { AD_ENDPOINTS } from "../../../constants/api-endpoints";
import type { AdSlotId } from "../ad-registry";

export type ActiveAdCreative = {
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  adsenseSlot?: string;
  thirdPartyUrl?: string;
};

export type ActiveAdRecord = {
  id: string;
  name: string;
  provider: "manual" | "adsense" | "thirdParty";
  requiresConsent?: boolean;
  creative: ActiveAdCreative;
};

export function useActiveAd(slotId: AdSlotId): { loading: boolean; ad: ActiveAdRecord | null } {
  const { data, isPending } = useQuery<ActiveAdRecord | null>({
    queryKey: ["active-ad", slotId],
    queryFn: () => apiClient.get<ActiveAdRecord | null>(AD_ENDPOINTS.ACTIVE_BY_SLOT(slotId)),
    staleTime: 60_000,
    retry: 1,
  });

  return { loading: isPending, ad: data ?? null };
}
