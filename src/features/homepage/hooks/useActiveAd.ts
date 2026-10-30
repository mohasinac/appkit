"use client";

import { useEffect, useState } from "react";
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

/**
 * H3 — fetch the slot's ad only once it is actually NEAR the viewport.
 *
 * 🛑 The gap this closes: every `<AdSlot>` called this on mount unconditionally
 * — four on the homepage alone, more on collector drops/blog/promotions/search — so an
 * ad slot at the bottom of a page a visitor never scrolls to still fired its
 * request on first paint. `/api/ads` is CDN-cached (`s-maxage=600`), so this was
 * never a Firestore-read problem; it is a wasted-request problem on exactly the
 * connections that feel it most — a mobile visitor on a metered connection pays
 * for five ad lookups to see the one above the fold.
 *
 * "Lazy/below-the-fold" is enforced with `enabled`, not by delaying the mount:
 * the slot still reserves no layout space until it has content (avoiding CLS),
 * and the query simply does not fire until `near` flips true.
 */
export function useActiveAd(
  slotId: AdSlotId,
  ref: { current: Element | null },
): { loading: boolean; ad: ActiveAdRecord | null } {
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No observer in this environment (old browser, SSR hydration edge) —
      // fail OPEN to fetching immediately rather than never rendering an ad at
      // all. A slightly early request is a better failure than a permanently
      // silent slot.
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      // 200px below the current viewport, so the ad has time to resolve before
      // a visitor actually scrolls to it — "lazy" is not the same as "late".
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, ref]);

  const { data, isPending } = useQuery<ActiveAdRecord | null>({
    queryKey: ["active-ad", slotId],
    queryFn: () => apiClient.get<ActiveAdRecord | null>(AD_ENDPOINTS.ACTIVE_BY_SLOT(slotId)),
    staleTime: 60_000,
    retry: 1,
    enabled: near,
  });

  return { loading: near && isPending, ad: data ?? null };
}
