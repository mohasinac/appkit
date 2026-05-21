"use client"
import React from "react";
import { StackedViewShell, Row, Text } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerAnalyticsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string; dateFrom?: string; dateTo?: string };
  renderDateRange?: (
    from: string,
    to: string,
    onChange: (from: string, to: string) => void,
  ) => React.ReactNode;
  renderStats?: (isLoading: boolean) => React.ReactNode;
  renderCharts?: () => React.ReactNode;
  renderTopProducts?: () => React.ReactNode;
  isLoading?: boolean;
}

function DefaultDateRange({
  from,
  to,
  onChange,
  labels,
}: {
  from: string;
  to: string;
  onChange: (f: string, t: string) => void;
  labels: { dateFrom?: string; dateTo?: string };
}) {
  return (
    <Row gap="md" align="center" wrap className="flex-wrap">
      <label className="flex items-center gap-2 text-sm text-[var(--appkit-color-text-muted)]">
        <Text size="sm" variant="secondary">{labels.dateFrom ?? "From"}</Text>
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="appkit-input text-sm py-1.5 px-3"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--appkit-color-text-muted)]">
        <Text size="sm" variant="secondary">{labels.dateTo ?? "To"}</Text>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="appkit-input text-sm py-1.5 px-3"
        />
      </label>
    </Row>
  );
}

export function SellerAnalyticsView({
  labels = {},
  renderDateRange,
  renderStats,
  renderCharts,
  renderTopProducts,
  isLoading = false,
  ...rest
}: SellerAnalyticsViewProps) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const handleDateChange = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
  };

  const dateRange = (
    renderDateRange ?? ((f, t, onCh) => (
      <DefaultDateRange from={f} to={t} onChange={onCh} labels={labels} />
    ))
  )(from, to, handleDateChange);

  const statsSection = (renderStats ?? (() => null))(isLoading);
  const chartsSection = (renderCharts ?? (() => null))();
  const topProducts = (renderTopProducts ?? (() => null))();

  return (
    <StackedViewShell
      portal="seller"
      {...rest}
      title={labels.title}
      sections={[
        dateRange,
        statsSection,
        chartsSection,
        topProducts,
      ]}
    />
  );
}
