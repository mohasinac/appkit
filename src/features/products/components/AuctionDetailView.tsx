"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface AuctionDetailViewProps {
  labels?: { title?: string };
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  renderBidForm?: () => React.ReactNode;
  renderBidHistory?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AuctionDetailView({
  renderGallery,
  renderInfo,
  renderBidForm,
  renderBidHistory,
  renderRelated,
  isLoading = false,
  className = "",
}: AuctionDetailViewProps) {
  return (
    <Div className={className}>
      <Div className="flex gap-8 my-6">
        <Div className="w-1/2">{renderGallery?.(isLoading)}</Div>
        <Div className="flex-1">
          {renderInfo?.(isLoading)}
          {renderBidForm?.()}
        </Div>
      </Div>
      {renderBidHistory?.()}
      {renderRelated?.()}
    </Div>
  );
}
