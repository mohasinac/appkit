"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface ProductDetailViewProps {
  labels?: { title?: string };
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  renderBuyBar?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
  renderBreadcrumb?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function ProductDetailView({
  renderGallery,
  renderInfo,
  renderBuyBar,
  renderTabs,
  renderRelated,
  renderBreadcrumb,
  isLoading = false,
  className = "",
}: ProductDetailViewProps) {
  return (
    <Div className={className}>
      {renderBreadcrumb?.()}
      <Div className="flex gap-8 my-6">
        <Div className="w-1/2">{renderGallery?.(isLoading)}</Div>
        <Div className="flex-1">
          {renderInfo?.(isLoading)}
          {renderBuyBar?.()}
        </Div>
      </Div>
      {renderTabs?.()}
      {renderRelated?.()}
    </Div>
  );
}
