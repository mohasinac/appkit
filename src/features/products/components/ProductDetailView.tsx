"use client";

import React from "react";
import { Div } from "@mohasinac/ui";

export interface ProductDetailViewProps {
  labels?: { title?: string };
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  /** Sticky actions sidebar (desktop col 3). Also used for mobile BuyBar. */
  renderActions?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
  renderBreadcrumb?: () => React.ReactNode;
  renderSkeleton?: () => React.ReactNode;
  renderNotFound?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function ProductDetailView({
  renderBreadcrumb,
  renderGallery,
  renderInfo,
  renderActions,
  renderTabs,
  renderRelated,
  renderSkeleton,
  renderNotFound,
  isLoading = false,
  className = "",
}: ProductDetailViewProps) {
  if (isLoading && renderSkeleton) {
    return <>{renderSkeleton()}</>;
  }
  if (renderNotFound) {
    return <>{renderNotFound()}</>;
  }
  return (
    <Div className={className}>
      {renderBreadcrumb?.()}
      {/* Responsive 3-column grid: gallery | info | actions-sidebar */}
      <Div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] xl:grid-cols-[1fr_1fr_300px] 2xl:grid-cols-[1fr_1fr_320px] gap-6 lg:gap-8 mt-6">
        <Div>{renderGallery?.(isLoading)}</Div>
        <Div>{renderInfo?.(isLoading)}</Div>
        {renderActions?.()}
      </Div>
      {renderTabs?.()}
      {renderRelated?.()}
    </Div>
  );
}
