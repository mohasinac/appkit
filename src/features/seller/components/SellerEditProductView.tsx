"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface SellerEditProductViewProps {
  labels?: { title?: string; submitButton?: string };
  renderForm: (isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SellerEditProductView({
  labels = {},
  renderForm,
  isLoading = false,
  className = "",
}: SellerEditProductViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderForm(isLoading)}
    </Div>
  );
}
