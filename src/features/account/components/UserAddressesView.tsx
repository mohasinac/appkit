"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserAddressesViewLabels {
  title?: string;
  addAddress?: string;
}

export interface UserAddressesViewProps {
  labels?: UserAddressesViewLabels;
  renderToolbar?: () => React.ReactNode;
  renderAddresses?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderDeleteModal?: () => React.ReactNode;
  isEmpty?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function UserAddressesView({
  labels = {},
  renderToolbar,
  renderAddresses,
  renderEmpty,
  renderDeleteModal,
  isEmpty = false,
  isLoading = false,
  className = "",
}: UserAddressesViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderToolbar?.()}
      {isEmpty ? renderEmpty?.() : renderAddresses?.()}
      {renderDeleteModal?.()}
    </Div>
  );
}
