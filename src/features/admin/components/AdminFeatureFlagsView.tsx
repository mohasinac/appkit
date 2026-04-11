"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface AdminFeatureFlagsViewProps {
  labels?: { title?: string };
  renderHeader?: () => React.ReactNode;
  renderFlags?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AdminFeatureFlagsView({
  labels = {},
  renderHeader,
  renderFlags,
  isLoading = false,
  className = "",
}: AdminFeatureFlagsViewProps) {
  return (
    <Div className={className}>
      {renderHeader ? (
        renderHeader()
      ) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      ) : null}
      {renderFlags?.()}
    </Div>
  );
}
