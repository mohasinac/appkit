"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface SellerAddressesViewProps {
  labels?: { title?: string; addButton?: string };
  renderHeader?: (onAdd: () => void) => React.ReactNode;
  renderAddressList: (isLoading: boolean) => React.ReactNode;
  renderModal?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SellerAddressesView({
  labels = {},
  renderHeader,
  renderAddressList,
  renderModal,
  isLoading = false,
  className = "",
}: SellerAddressesViewProps) {
  return (
    <Div className={className}>
      {renderHeader ? renderHeader(() => {}) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      ) : null}
      {renderAddressList(isLoading)}
      {renderModal?.()}
    </Div>
  );
}
