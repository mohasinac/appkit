"use client";
import { useApiQuery } from "./useApiQuery";
import { apiClient } from "../../http";
import { API_ENDPOINTS } from "../../constants/api-endpoints";

/**
 * Consumer app's flag names aren't known to appkit (they're project-specific,
 * e.g. "PAYOUTS" | "COUPONS" | ...) — this stays a loose string-keyed map so
 * appkit doesn't hardcode a consumer's roadmap. Cast the result where a
 * consumer wants a narrower, project-specific union.
 */
export type FeatureFlagState = Record<string, boolean>;

/**
 * Client-safe feature-flag check — `getFlag()`/`withFeatureGuard` are
 * server-only, so `"use client"` components have no way to know a flag is
 * off before firing a request against its (guarded) API. This hook fetches
 * the public flag snapshot once (cached for the query's lifetime) so a
 * component can skip the fetch and skip rendering entirely when disabled,
 * instead of eating a 404 from the guarded route.
 *
 * `flags` defaults to an empty object while loading, so callers should treat
 * a missing key as `false` (fail-closed) rather than assuming it's enabled.
 */
export function useFeatureFlags() {
  const query = useApiQuery<FeatureFlagState>({
    queryKey: ["feature-flags"],
    queryFn: () => apiClient.get<FeatureFlagState>(API_ENDPOINTS.CONFIG.FEATURE_FLAGS),
    staleTime: 60_000,
    silentBackgroundFailures: true,
  });

  return {
    flags: query.data ?? ({} as FeatureFlagState),
    isLoading: query.isLoading,
  };
}
