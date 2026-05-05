"use client";

import { useEffect, useState } from "react";
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

type State = { loading: boolean; ad: ActiveAdRecord | null };

export function useActiveAd(slotId: AdSlotId): State {
  const [state, setState] = useState<State>({ loading: true, ad: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ads?slot=${encodeURIComponent(slotId)}`)
      .then((r) => r.json())
      .then((json: { data: ActiveAdRecord | null }) => {
        if (!cancelled) setState({ loading: false, ad: json?.data ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, ad: null });
      });
    return () => { cancelled = true; };
  }, [slotId]);

  return state;
}
