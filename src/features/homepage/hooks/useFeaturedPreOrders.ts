import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  ProductItem,
  ProductListResponse,
} from "@mohasinac/appkit/features/products";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

const MIN_COUNT = 12;

export function useFeaturedPreOrders(options?: {
  filterByBrand?: string;
  initialData?: ProductItem[];
}) {
  const brandFilter = options?.filterByBrand
    ? `%2Cbrand%3D%3D${encodeURIComponent(options.filterByBrand)}`
    : "";

  return useQuery<ProductItem[]>({
    queryKey: ["pre-orders", "featured", options?.filterByBrand ?? "all"],
    initialData: options?.initialData,
    queryFn: async () => {
      const featuredRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?filters=listingType%3D%3Dpre-order%2Cstatus%3D%3Dpublished${brandFilter}&sorts=preOrderDeliveryDate&pageSize=6`,
      );
      const featured = featuredRes?.items ?? [];

      if (featured.length >= MIN_COUNT) return featured;

      const remaining = MIN_COUNT - featured.length;
      const latestRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?filters=listingType%3D%3Dpre-order%2Cstatus%3D%3Dpublished${brandFilter}&sorts=-createdAt&pageSize=${remaining + featured.length}`,
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
