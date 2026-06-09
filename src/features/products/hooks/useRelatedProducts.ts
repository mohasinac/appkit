import { sortBy } from "@mohasinac/appkit";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ProductItem, ProductListResponse } from "../types";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

type RelatedProductsResponse = ProductListResponse;

/**
 * Fetch related products in the same category. SB1-G — `isAuction` legacy
 * boolean translates to the canonical `listingType` clause; new callers can
 * pass the union directly via the same parameter slot in a follow-up.
 */
export function useRelatedProducts(
  category: string,
  excludeId: string,
  limit = 8,
  isAuction = false,
) {
  const listingTypeClause = isAuction
    ? "listingType==auction"
    : "listingType==standard";
  const params = new URLSearchParams({
    filters: `status==published,category==${encodeURIComponent(category)},${listingTypeClause}`,
    sorts: sortBy("createdAt", "DESC"),
    pageSize: String(limit),
  });

  return useQuery<RelatedProductsResponse>({
    queryKey: ["related-products", category, excludeId, String(isAuction)],
    queryFn: () =>
      apiClient.get<RelatedProductsResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?${params.toString()}`,
      ),
    enabled: Boolean(category),
    staleTime: 5 * 60 * 1000,
  });
}
