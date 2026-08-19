import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { BID_ENDPOINTS } from "../../../constants/api-endpoints";
import type { BidDocument } from "../schemas/firestore";

export interface BidListResponse {
  items: Omit<BidDocument, "userEmail">[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UseBidsParams {
  productId: string;
  page?: number;
  pageSize?: number;
}

export interface UseBidsOptions {
  initialData?: BidListResponse;
  enabled?: boolean;
}

/**
 * useBids
 *
 * Paginated, newest-first bid history for a single auction — backs the
 * auction detail page's "Bid History" section. `/api/bids` already sorts
 * `bidDate DESC` server-side (see `listBidsByProduct`), so no client sort
 * is needed here.
 */
export function useBids(params: UseBidsParams, opts?: UseBidsOptions) {
  const { productId, page = 1, pageSize = 5 } = params;
  const sp = new URLSearchParams();
  sp.set("productId", productId);
  sp.set("page", String(page));
  sp.set("pageSize", String(pageSize));
  const endpoint = `${BID_ENDPOINTS.LIST}?${sp.toString()}`;

  const query = useQuery<BidListResponse>({
    queryKey: ["bids", productId, page, pageSize],
    queryFn: () => apiClient.get<BidListResponse>(endpoint),
    initialData: page === 1 ? opts?.initialData : undefined,
    enabled: opts?.enabled !== false && !!productId,
  });

  return {
    bids: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    isLoading: query.isLoading,
    error: query.error,
  };
}
