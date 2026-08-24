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

export function useFeaturedPreOrders(options?: {
  filterByBrand?: string;
  initialData?: ProductItem[];
}) {
  return useQuery<ProductItem[]>({
    queryKey: ["pre-orders", "featured", options?.filterByBrand ?? "all"],
    initialData: options?.initialData,
    queryFn: async () => {
      const featuredRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?${buildHomepageListingQuery({
          listingType: "pre-order",
          brand: options?.filterByBrand,
          sorts: sortBy(PRODUCT_FIELDS.PRE_ORDER_DELIVERY_DATE, "ASC"),
          pageSize: 6,
        })}`,
      );
      const featured = featuredRes?.items ?? [];

      if (featured.length >= MIN_HOMEPAGE_COUNT) return featured;

      const remaining = MIN_HOMEPAGE_COUNT - featured.length;
      const latestRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?${buildHomepageListingQuery({
          listingType: "pre-order",
          brand: options?.filterByBrand,
          sorts: sortBy(PRODUCT_FIELDS.CREATED_AT, "DESC"),
          pageSize: remaining + featured.length,
        })}`,
      );
      const latest = latestRes?.items ?? [];

      const existingIds = new Set(featured.map((p) => p.id));
      const filler = latest
        .filter((p) => !existingIds.has(p.id))
        .slice(0, remaining);

      return [...featured, ...filler];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
