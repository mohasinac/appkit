"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface UserOffersViewLabels {
  title?: string;
}

export interface UserOffersViewProps {
  labels?: UserOffersViewLabels;
  renderTable?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  isEmpty?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function UserOffersView({
  labels = {},
  renderTable,
  renderEmpty,
  isEmpty = false,
  isLoading = false,
  className = "",
}: UserOffersViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {isEmpty ? renderEmpty?.() : renderTable?.()}
    </Div>
  );
}
