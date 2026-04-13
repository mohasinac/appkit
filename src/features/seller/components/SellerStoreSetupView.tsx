"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface SellerStoreSetupViewProps {
  labels?: { title?: string; submitButton?: string };
  renderTabs?: (activeTab: string, onChange: (t: string) => void) => React.ReactNode;
  renderForm: (tab: string, isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SellerStoreSetupView({
  labels = {},
  renderTabs,
  renderForm,
  isLoading = false,
  className = "",
}: SellerStoreSetupViewProps) {
  const [tab, setTab] = React.useState("basic");
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderTabs?.(tab, setTab)}
      {renderForm(tab, isLoading)}
    </Div>
  );
}
