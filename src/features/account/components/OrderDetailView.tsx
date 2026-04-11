"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface OrderDetailViewLabels {
  title?: string;
  backLabel?: string;
}

export interface OrderDetailViewProps {
  labels?: OrderDetailViewLabels;
  renderBack?: () => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderItems?: () => React.ReactNode;
  renderAddress?: () => React.ReactNode;
  renderPayment?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
  isLoading?: boolean;
  isNotFound?: boolean;
  className?: string;
}

export function OrderDetailView({
  labels = {},
  renderBack,
  renderHeader,
  renderItems,
  renderAddress,
  renderPayment,
  renderActions,
  isLoading = false,
  className = "",
}: OrderDetailViewProps) {
  return (
    <Div className={className}>
      {renderBack?.()}
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-4">
          {labels.title}
        </Heading>
      )}
      {renderHeader?.()}
      {renderActions?.()}
      {renderItems?.()}
      {renderAddress?.()}
      {renderPayment?.()}
    </Div>
  );
}
