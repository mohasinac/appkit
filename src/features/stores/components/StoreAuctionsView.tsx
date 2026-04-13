"use client";

import React from "react";
import { Div, Heading } from "../../../ui";
import type { StoreAuctionItem } from "../types";

export interface StoreAuctionsViewProps {
  storeSlug: string;
  labels?: {
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  renderAuctions: (
    items: StoreAuctionItem[],
    isLoading: boolean,
  ) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  items?: StoreAuctionItem[];
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function StoreAuctionsView({
  labels = {},
  renderAuctions,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  className = "",
}: StoreAuctionsViewProps) {
  return (
    <Div className={`py-4 ${className}`}>
      {labels.title && (
        <Heading level={2} className="text-xl font-semibold mb-4">
          {labels.title}
        </Heading>
      )}

      {renderAuctions(items, isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
