import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ProductListResponse } from "../../products/types";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";
import { buildHomepageListingQuery, MIN_HOMEPAGE_COUNT } from "./homepage-query";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

export function useFeaturedProducts(options?: {
  initialData?: ProductListResponse;
  filterByBrand?: string;
}) {
  return useQuery<ProductListResponse>({
    queryKey: ["products", "featured", options?.filterByBrand ?? "all"],
    queryFn: async () => {
      const promotedRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?${buildHomepageListingQuery({
          brand: options?.filterByBrand,
          isPromoted: true,
          pageSize: 18,
        })}`,
      );
      const promoted = promotedRes?.items ?? [];

      if (promoted.length >= MIN_HOMEPAGE_COUNT) return promotedRes;

      const remaining = MIN_HOMEPAGE_COUNT - promoted.length;
      const latestRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?${buildHomepageListingQuery({
          brand: options?.filterByBrand,
          sorts: sortBy(PRODUCT_FIELDS.CREATED_AT, "DESC"),
          pageSize: remaining + promoted.length,
        })}`,
      );
      const latest = latestRes?.items ?? [];

      const existingIds = new Set(promoted.map((p) => p.id));
      const filler = latest
        .filter((p) => !existingIds.has(p.id))
        .slice(0, remaining);

      const merged = [...promoted, ...filler];
      return {
        ...promotedRes,
        items: merged,
        total: merged.length,
      };
    },
    initialData: options?.initialData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
