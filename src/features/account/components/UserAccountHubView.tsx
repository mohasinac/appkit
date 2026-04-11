"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserAccountHubViewLabels {
  title?: string;
  recentOrders?: string;
}

export interface UserAccountHubViewProps {
  labels?: UserAccountHubViewLabels;
  renderProfile?: () => React.ReactNode;
  renderNav?: () => React.ReactNode;
  renderRecentOrders?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function UserAccountHubView({
  labels = {},
  renderProfile,
  renderNav,
  renderRecentOrders,
  isLoading = false,
  className = "",
}: UserAccountHubViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderProfile?.()}
      {renderNav?.()}
      {renderRecentOrders?.()}
    </Div>
  );
}
