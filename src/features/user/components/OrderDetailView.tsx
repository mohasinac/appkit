"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface OrderDetailViewProps {
  labels?: { title?: string };
  renderOrderSummary?: (isLoading: boolean) => React.ReactNode;
  renderItems?: (isLoading: boolean) => React.ReactNode;
  renderTracking?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function OrderDetailView({
  labels = {},
  renderOrderSummary,
  renderItems,
  renderTracking,
  renderActions,
  isLoading = false,
  className = "",
}: OrderDetailViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderOrderSummary?.(isLoading)}
      {renderItems?.(isLoading)}
      {renderTracking?.()}
      {renderActions?.()}
    </Div>
  );
}
