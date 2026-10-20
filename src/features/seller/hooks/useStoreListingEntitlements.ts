"use client";

/**
 * Which listing types the signed-in seller's own store may create.
 *
 * ── Why this needs a fetch at all ─────────────────────────────────────────
 *
 * 🛑 `StoreDocument.capabilities` is listed in `PRIVATE_STORE_FIELDS` —
 * "internal feature gating; server-enforced, never client-read" — so it is
 * absent from every public store payload and from the session user. A client
 * component genuinely cannot derive this locally, and the alternative a
 * previous draft reached for (publish the capability array to the browser)
 * would ship `lower_commission_rate`, `priority_support` and fifteen more
 * admin-granted entitlements to anyone who opened devtools. Root Cause #70.
 *
 * So the server sends a PROJECTION: `allowedListingTypes`, already resolved by
 * `listingTypesAllowedFor` on the same capability array the write-path gate
 * uses. Client and server therefore agree by construction rather than by two
 * copies of one rule (Root Cause #30).
 *
 * ── Why the loading state is not "denied" ─────────────────────────────────
 *
 * `isLoading` is returned and callers must respect it. The three-state rule
 * from `useCanSeePrices`: "not known yet" rendering as "no" shows an entitled
 * seller a refusal on every page load. The server refuses authoritatively in
 * `createSellerProduct` / `sellerUpdateProduct`, so an optimistic render while
 * the fetch is in flight costs nothing worse than a late refusal.
 *
 * @tag domain:seller
 * @tag layer:hooks
 * @tag access:client
 */

import { useMemo } from "react";
import { useApiQuery } from "../../../client/api/useApiQuery";
import { apiClient } from "../../../http";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import type { ListingType } from "../../products/types/index";
import { BASIC_LISTING_TYPES } from "../../../_internal/shared/listing-types/tiers";

interface PayoutSettingsEntitlements {
  allowedListingTypes?: ListingType[];
  advancedListingTypesEnabled?: boolean;
}

export interface StoreListingEntitlements {
  /** Types this store may create. Never empty — basics are always included. */
  allowed: Set<ListingType>;
  advancedEnabled: boolean;
  isLoading: boolean;
}

export function useStoreListingEntitlements(): StoreListingEntitlements {
  const query = useApiQuery<PayoutSettingsEntitlements>({
    queryKey: ["store", "listing-entitlements"],
    queryFn: async () => {
      const res = await apiClient.get<{ data?: PayoutSettingsEntitlements }>(
        SELLER_ENDPOINTS.PAYOUT_SETTINGS,
      );
      return res?.data ?? {};
    },
    /*
     * The answer changes only when an admin or the seller flips a capability,
     * so a short window is pointless churn — but it must not be `Infinity`,
     * because a seller who has just ticked the box in another tab should not
     * have to hard-reload to see the nav and forms open up.
     */
    staleTime: 60_000,
    silentBackgroundFailures: true,
  });

  return useMemo(() => {
    /*
     * 🛑 Falls back to the BASIC types, not to everything and not to nothing.
     *
     * Everything would offer a form that the server then refuses — the exact
     * "filled in a long wizard and got rejected at publish" experience this
     * hook exists to prevent. Nothing would lock a seller out of `standard`
     * on a transient network blip, which is the one type every store has.
     */
    const list = query.data?.allowedListingTypes;
    const allowed = new Set<ListingType>(
      Array.isArray(list) && list.length > 0 ? list : BASIC_LISTING_TYPES,
    );
    return {
      allowed,
      advancedEnabled: query.data?.advancedListingTypesEnabled === true,
      isLoading: query.isLoading,
    };
  }, [query.data, query.isLoading]);
}
