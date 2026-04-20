import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerAnalyticsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
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
  return (
    <StackedViewShell
      portal="seller"
      {...rest}
      title={labels.title}
      sections={[
        renderDateRange?.(from, to, (f, t) => {
          setFrom(f);
          setTo(t);
        }),
        renderStats?.(isLoading),
        renderCharts?.(),
        renderTopProducts?.(),
      ]}
    />
  );
}
