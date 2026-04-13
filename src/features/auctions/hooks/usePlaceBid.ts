"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../http";

export interface BidResult {
  id: string;
  productId: string;
  bidAmount: number;
  isWinning: boolean;
  currency: string;
  [key: string]: unknown;
}

export interface PlaceBidPayload {
  productId: string;
  bidAmount: number;
}

/**
 * usePlaceBid
 *
 * Mutation hook for placing a bid on an auction product.
 * Invalidates bid list and auction detail queries on success so the UI
 * reflects the new highest bid without a manual reload.
 *
 * @example
 * const { mutateAsync, isPending } = usePlaceBid();
 * const bid = await mutateAsync({ productId, bidAmount: amount });
 */
export function usePlaceBid() {
  const queryClient = useQueryClient();

  return useMutation<BidResult, Error, PlaceBidPayload>({
    mutationFn: async (data) => {
      const result = await apiClient.post<{ bid: BidResult }>(
        "/api/bids",
        data,
      );
      return result.bid;
    },
    onSuccess: async (_, { productId }) => {
      await queryClient.invalidateQueries({ queryKey: ["bids", productId] });
      await queryClient.invalidateQueries({ queryKey: ["auction", productId] });
      await queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
}
