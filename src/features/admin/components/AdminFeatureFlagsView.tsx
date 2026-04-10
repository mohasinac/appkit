"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface AdminFeatureFlagsViewProps {
  labels?: { title?: string; };
  renderFlags?: (isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AdminFeatureFlagsView({ labels = {}, renderFlags, isLoading = false, className = "" }: AdminFeatureFlagsViewProps) {
  return (
    <Div className={className}>
      {labels.title && <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>}
      {renderFlags?.(isLoading)}
    </Div>
  );
}