import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  CollectorDropListResponse,
  CollectorDropListParams,
  CollectorDropItem,
  BidListResponse,
  PublicBid,
} from "../types";
import type { ProductItem } from "../../products/types";
import { isCollectorDropListing } from "../../products/utils/listing-type";
import { COLLECTOR_DROP_ENDPOINTS, BID_ENDPOINTS, PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

type CollectorDropListQuery = CollectorDropListParams | URLSearchParams | string;

interface UseCollectorDropsOptions {
  enabled?: boolean;
  endpoint?: string;
  initialData?: CollectorDropListResponse;
  queryKeyPrefix?: string;
  staleTime?: number;
}

interface UseCollectorDropDetailOptions {
  enabled?: boolean;
  productEndpoint?: string;
  bidsEndpoint?: string;
  refetchIntervalMs?: number;
  productQueryKeyPrefix?: string;
  bidsQueryKeyPrefix?: string;
}

function toQueryString(params: CollectorDropListQuery): string {
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

export function useCollectorDrops(
  params: CollectorDropListQuery = {},
  opts?: UseCollectorDropsOptions,
) {
  const endpoint = opts?.endpoint ?? COLLECTOR_DROP_ENDPOINTS.LIST;
  const queryKeyPrefix = opts?.queryKeyPrefix ?? "collector-drops";
  const qs = toQueryString(params);

  const { data, isLoading, error, refetch } = useQuery<CollectorDropListResponse>({
    queryKey: [queryKeyPrefix, endpoint, qs],
    queryFn: () =>
      apiClient.get<CollectorDropListResponse>(`${endpoint}${qs ? `?${qs}` : ""}`),
    enabled: opts?.enabled ?? true,
    initialData: opts?.initialData,
    staleTime: opts?.staleTime ?? (opts?.initialData !== undefined ? Infinity : 0),
  });

  return {
    data,
    collectorDrops: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useCollectorDrop(slug: string, opts?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<CollectorDropItem | null>({
    queryKey: ["collector-drop", slug],
    queryFn: () => apiClient.get<CollectorDropItem>(COLLECTOR_DROP_ENDPOINTS.BY_SLUG(slug)),
    enabled: (opts?.enabled ?? true) && !!slug,
  });

  return {
    collectorDrop: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useCollectorDropBids(
  collectorDropSlug: string,
  limit = 10,
  opts?: { enabled?: boolean },
) {
  const { data, isLoading, error } = useQuery<BidListResponse>({
    queryKey: ["collector-drop-bids", collectorDropSlug, limit],
    queryFn: () =>
      apiClient.get<BidListResponse>(
        `${COLLECTOR_DROP_ENDPOINTS.BIDS(collectorDropSlug)}?limit=${limit}`,
      ),
    enabled: (opts?.enabled ?? true) && !!collectorDropSlug,
    // 🛑 Do NOT restore a ~15s interval here. Live collector drop state on the detail
    // page comes from the SSE channel (`useRealtimeBids` -> `useLiveCollectorDropBid`,
    // consumed by LiveBidPrice / LiveMinIncrement / PlaceBidFormClient), NOT
    // from this hook — so a fast poll here buys no freshness the page does not
    // already have, and duplicates a stream that already costs a held-open
    // function per viewer.
    //
    // Verified 2026-09-14: this hook currently has no call sites at all outside
    // the appkit barrel re-export, so the old 15s interval was billing nothing
    // only by accident. Kept deliberately slow so that adopting it cannot
    // silently reintroduce a per-viewer poll.
    refetchInterval: 60_000,
  });

  return {
    bids: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useCollectorDropDetail(id: string, opts?: UseCollectorDropDetailOptions) {
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
    enabled: enabled && isCollectorDropListing(product ?? undefined),
    refetchInterval: refetchIntervalMs,
  });

  return {
    productQuery,
    product,
    bidsQuery,
    bids: bidsQuery.data ?? [],
  };
}
