import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  ProductItem,
  ProductListResponse,
} from "../../products/types";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";
import { buildHomepageListingQuery, MIN_HOMEPAGE_COUNT } from "./homepage-query";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

/**
 * The soonest-ending LIVE auctions, for the homepage strip.
 *
 * This runs 30s after the SSR paint and REPLACES it, so it has to ask the
 * server exactly what `getFeaturedAuctions` asked. It did not: both queries
 * here were `listingType==auction,status==published` with no end-date bound,
 * hand-written as a raw pre-encoded `filters=` string. So even once the SSR
 * half was fixed, the strip would have reverted to showing expired auctions
 * half a minute later (Root Cause #30).
 */
export function useFeaturedAuctions(options?: {
  filterByBrand?: string;
  initialData?: ProductItem[];
}) {
  return useQuery<ProductItem[]>({
    queryKey: ["auctions", "featured", options?.filterByBrand ?? "all"],
    initialData: options?.initialData,
    queryFn: async () => {
      const promotedRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?${buildHomepageListingQuery({
          listingType: "auction",
          brand: options?.filterByBrand,
          isPromoted: true,
          sorts: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC"),
          pageSize: 18,
        })}`,
      );
      const promoted = promotedRes?.items ?? [];

      if (promoted.length >= MIN_HOMEPAGE_COUNT) return promoted;

      const remaining = MIN_HOMEPAGE_COUNT - promoted.length;
      const latestRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?${buildHomepageListingQuery({
          listingType: "auction",
          brand: options?.filterByBrand,
          sorts: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC"),
          pageSize: remaining + promoted.length,
        })}`,
      );
      const latest = latestRes?.items ?? [];

      const existingIds = new Set(promoted.map((a) => a.id));
      const filler = latest
        .filter((a) => !existingIds.has(a.id))
        .slice(0, remaining);

      return [...promoted, ...filler];
    },
    staleTime: 30_000,
    gcTime: 2 * 60 * 1000,
  });
}
