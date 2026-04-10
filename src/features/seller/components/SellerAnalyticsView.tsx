"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface SellerAnalyticsViewProps {
  labels?: { title?: string };
  renderDateRange?: (from: string, to: string, onChange: (from: string, to: string) => void) => React.ReactNode;
  renderStats?: (isLoading: boolean) => React.ReactNode;
  renderCharts?: () => React.ReactNode;
  renderTopProducts?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SellerAnalyticsView({
  labels = {},
  renderDateRange,
  renderStats,
  renderCharts,
  renderTopProducts,
  isLoading = false,
  className = "",
}: SellerAnalyticsViewProps) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderDateRange?.(from, to, (f, t) => { setFrom(f); setTo(t); })}
      {renderStats?.(isLoading)}
      {renderCharts?.()}
      {renderTopProducts?.()}
    </Div>
  );
}
