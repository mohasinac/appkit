"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface SellerShippingViewProps {
  labels?: { title?: string; saveButton?: string };
  renderZones?: (isLoading: boolean) => React.ReactNode;
  renderForm?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SellerShippingView({
  labels = {},
  renderZones,
  renderForm,
  isLoading = false,
  className = "",
}: SellerShippingViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderZones?.(isLoading)}
      {renderForm?.()}
    </Div>
  );
}
