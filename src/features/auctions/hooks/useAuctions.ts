import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  AuctionListResponse,
  AuctionListParams,
  AuctionItem,
  BidListResponse,
  PublicBid,
} from "../types";
import type { ProductItem } from "../../products/types";
import { AUCTION_ENDPOINTS, BID_ENDPOINTS, PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

type AuctionListQuery = AuctionListParams | URLSearchParams | string;

interface UseAuctionsOptions {
  enabled?: boolean;
  endpoint?: string;
  initialData?: AuctionListResponse;
  queryKeyPrefix?: string;
}

interface UseAuctionDetailOptions {
  enabled?: boolean;
  productEndpoint?: string;
  bidsEndpoint?: string;
  refetchIntervalMs?: number;
  productQueryKeyPrefix?: string;
  bidsQueryKeyPrefix?: string;
}

function toQueryString(params: AuctionListQuery): string {
  if (typeof params === "string") {
    return params.startsWith("?") ? params.slice(1) : params;
  }

  if (params instanceof URLSearchParams) {
    return params.toString();
  }

  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  });
  return sp.toString();
}

export function useAuctions(
  params: AuctionListQuery = {},
  opts?: UseAuctionsOptions,
) {
  const endpoint = opts?.endpoint ?? AUCTION_ENDPOINTS.LIST;
  const queryKeyPrefix = opts?.queryKeyPrefix ?? "auctions";
  const qs = toQueryString(params);

  const { data, isLoading, error, refetch } = useQuery<AuctionListResponse>({
    queryKey: [queryKeyPrefix, endpoint, qs],
    queryFn: () =>
      apiClient.get<AuctionListResponse>(`${endpoint}${qs ? `?${qs}` : ""}`),
    enabled: opts?.enabled ?? true,
    initialData: opts?.initialData,
  });

  return {
    data,
    auctions: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useAuction(slug: string, opts?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<AuctionItem | null>({
    queryKey: ["auction", slug],
    queryFn: () => apiClient.get<AuctionItem>(AUCTION_ENDPOINTS.BY_SLUG(slug)),
    enabled: (opts?.enabled ?? true) && !!slug,
  });

  return {
    auction: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useAuctionBids(
  auctionSlug: string,
  limit = 10,
  opts?: { enabled?: boolean },
) {
  const { data, isLoading, error } = useQuery<BidListResponse>({
    queryKey: ["auction-bids", auctionSlug, limit],
    queryFn: () =>
      apiClient.get<BidListResponse>(
        `${AUCTION_ENDPOINTS.BIDS(auctionSlug)}?limit=${limit}`,
      ),
    enabled: (opts?.enabled ?? true) && !!auctionSlug,
    refetchInterval: 15_000, // refresh every 15 s for real-time feel
  });

  return {
    bids: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useAuctionDetail(id: string, opts?: UseAuctionDetailOptions) {
  const enabled = opts?.enabled ?? true;
  const productEndpoint = opts?.productEndpoint ?? PRODUCT_ENDPOINTS.BY_ID(id);
  const bidsEndpoint = opts?.bidsEndpoint ?? BID_ENDPOINTS.BY_PRODUCT(id);
  const productQueryKeyPrefix = opts?.productQueryKeyPrefix ?? "product";
  const bidsQueryKeyPrefix = opts?.bidsQueryKeyPrefix ?? "bids";
  const refetchIntervalMs = opts?.refetchIntervalMs ?? 60_000;

  const productQuery = useQuery<ProductItem | null>({
    queryKey: [productQueryKeyPrefix, id, productEndpoint],
    queryFn: () => apiClient.get<ProductItem | null>(productEndpoint),
    enabled: enabled && Boolean(id),
  });

  const product = productQuery.data ?? null;

  const bidsQuery = useQuery<PublicBid[]>({
    queryKey: [bidsQueryKeyPrefix, id, bidsEndpoint],
    queryFn: () => apiClient.get<PublicBid[]>(bidsEndpoint),
    enabled: enabled && Boolean(product?.isAuction),
    refetchInterval: refetchIntervalMs,
  });

  return {
    productQuery,
    product,
    bidsQuery,
    bids: bidsQuery.data ?? [],
  };
}
