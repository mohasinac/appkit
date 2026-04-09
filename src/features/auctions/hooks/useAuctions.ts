"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type {
  AuctionListResponse,
  AuctionListParams,
  AuctionItem,
  BidListResponse,
} from "../types";

export function useAuctions(
  params: AuctionListParams = {},
  opts?: { enabled?: boolean },
) {
  const sp = new URLSearchParams();
  if (params.storeSlug) sp.set("storeSlug", params.storeSlug);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sort) sp.set("sorts", params.sort);
  if (params.filters) sp.set("filters", params.filters);
  const qs = sp.toString();

  const { data, isLoading, error, refetch } = useQuery<AuctionListResponse>({
    queryKey: ["auctions", qs],
    queryFn: () =>
      apiClient.get<AuctionListResponse>(`/api/auctions${qs ? `?${qs}` : ""}`),
    enabled: opts?.enabled ?? true,
  });

  return {
    auctions: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useAuction(slug: string, opts?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<AuctionItem | null>({
    queryKey: ["auction", slug],
    queryFn: () => apiClient.get<AuctionItem>(`/api/auctions/${slug}`),
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
        `/api/auctions/${auctionSlug}/bids?limit=${limit}`,
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
