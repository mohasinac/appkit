"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface SellerPayoutSettingsViewProps {
  labels?: { title?: string; saveButton?: string };
  renderForm?: (isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SellerPayoutSettingsView({
  labels = {},
  renderForm,
  isLoading = false,
  className = "",
}: SellerPayoutSettingsViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderForm?.(isLoading)}
    </Div>
  );
}
