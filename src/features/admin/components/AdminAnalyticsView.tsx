"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface AdminAnalyticsViewProps {
  labels?: { title?: string; };
  renderDateRange?: (from: string, to: string, onChange: (from: string, to: string) => void) => React.ReactNode;
  renderSummaryCards?: () => React.ReactNode;
  renderCharts?: () => React.ReactNode;
  renderTable?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AdminAnalyticsView({ labels = {}, renderDateRange, renderSummaryCards, renderCharts, renderTable, isLoading = false, className = "" }: AdminAnalyticsViewProps) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  return (
    <Div className={className}>
      {labels.title && <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>}
      {renderDateRange?.(from, to, (f, t) => { setFrom(f); setTo(t); })}
      {renderSummaryCards?.()}
      {renderCharts?.()}
      {renderTable?.()}
    </Div>
  );
}