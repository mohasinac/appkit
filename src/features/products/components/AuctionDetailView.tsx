"use client";

import React from "react";
import { Div } from "@mohasinac/ui";

export interface AuctionDetailViewProps {
  labels?: { title?: string };
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  /** Desktop sticky bid sidebar (hidden on mobile, shown in col 3) */
  renderBidForm?: () => React.ReactNode;
  /** Mobile bid form shown below the grid on small screens */
  renderMobileBidForm?: () => React.ReactNode;
  renderBidHistory?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
  renderBreadcrumb?: () => React.ReactNode;
  renderSkeleton?: () => React.ReactNode;
  renderNotFound?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AuctionDetailView({
  renderBreadcrumb,
  renderGallery,
  renderInfo,
  renderBidForm,
  renderMobileBidForm,
  renderBidHistory,
  renderRelated,
  renderSkeleton,
  renderNotFound,
  isLoading = false,
  className = "",
}: AuctionDetailViewProps) {
  if (isLoading && renderSkeleton) {
    return <>{renderSkeleton()}</>;
  }
  if (renderNotFound) {
    return <>{renderNotFound()}</>;
  }
  return (
    <Div className={className}>
      {renderBreadcrumb?.()}
      {/* 3-column grid: gallery | info | bid-sidebar (desktop only) */}
      <Div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] xl:grid-cols-[1fr_1fr_300px] 2xl:grid-cols-[1fr_1fr_320px] gap-6 lg:gap-8 mt-6">
        <Div>{renderGallery?.(isLoading)}</Div>
        <Div>{renderInfo?.(isLoading)}</Div>
        <Div className="hidden lg:block">{renderBidForm?.()}</Div>
      </Div>
      {/* Mobile bid form — shown below grid on small screens */}
      {renderMobileBidForm?.()}
      {renderBidHistory?.()}
      {renderRelated?.()}
    </Div>
  );
}
