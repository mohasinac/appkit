"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface UserAddressesViewProps {
  labels?: { title?: string; addButton?: string };
  renderHeader?: (onAdd: () => void) => React.ReactNode;
  renderList: (isLoading: boolean) => React.ReactNode;
  renderModal?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function UserAddressesView({
  labels = {},
  renderHeader,
  renderList,
  renderModal,
  isLoading = false,
  className = "",
}: UserAddressesViewProps) {
  return (
    <Div className={className}>
      {renderHeader ? renderHeader(() => {}) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      ) : null}
      {renderList(isLoading)}
      {renderModal?.()}
    </Div>
  );
}
