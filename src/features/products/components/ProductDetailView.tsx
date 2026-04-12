"use client";

import React from "react";
import { Div, Grid } from "@mohasinac/ui";

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
      <Grid cols="productDetailTriplet" className="mt-6">
        <Div>{renderGallery?.(isLoading)}</Div>
        <Div>{renderInfo?.(isLoading)}</Div>
        {renderActions?.()}
      </Grid>
      {renderTabs?.()}
      {renderRelated?.()}
    </Div>
  );
}
