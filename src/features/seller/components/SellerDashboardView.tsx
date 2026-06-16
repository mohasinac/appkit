"use client";
import React from "react";
import { StackedViewShell, Div, Text } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerDashboardViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderStats?: (isLoading: boolean) => React.ReactNode;
  renderQuickActions?: () => React.ReactNode;
  renderRecentListings?: () => React.ReactNode;
  renderRevenueChart?: () => React.ReactNode;
  renderTopProducts?: () => React.ReactNode;
  isLoading?: boolean;
}

function DefaultStatsPlaceholder({ isLoading }: { isLoading: boolean }) {
  return (
    <Div layout="grid" gap="4" className="grid-cols-2 sm:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Div padding="5" 
          key={i}
          className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="xl"
        >
          {isLoading ? (
            <>
              <Div className="h-3 w-16 animate-pulse bg-[var(--appkit-color-border)]" rounded="default" />
              <Div className="mt-3 h-6 w-20 animate-pulse bg-[var(--appkit-color-border)]" rounded="default" />
            </>
          ) : (
            <>
              <Text size="xs" variant="secondary" className="tracking-widest" weight="semibold" transform="uppercase">
                Stat {i}
              </Text>
              <Text size="xl" className="mt-2 tabular-nums" weight="bold">—</Text>
            </>
          )}
        </Div>
      ))}
    </Div>
  );
}

function DefaultQuickActionsPlaceholder() {
  return (
    <Div layout="grid" gap="3" className="grid-cols-2 sm:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Div
          key={i}
          className="h-12 animate-pulse border border-[var(--appkit-color-border)] bg-[var(--appkit-color-border)]" rounded="xl"
        />
      ))}
    </Div>
  );
}

export function SellerDashboardView({
  labels = {},
  renderStats,
  renderQuickActions,
  renderRecentListings,
  renderRevenueChart,
  renderTopProducts,
  isLoading = false,
  ...rest
}: SellerDashboardViewProps) {
  const stats = (renderStats ?? ((busy) => <DefaultStatsPlaceholder isLoading={busy} />))(isLoading);
  const quickActions = (renderQuickActions ?? (() => <DefaultQuickActionsPlaceholder />))();
  const revenueChart = (renderRevenueChart ?? (() => null))();
  const topProducts = (renderTopProducts ?? (() => null))();
  const recentListings = (renderRecentListings ?? (() => null))();

  return (
    <StackedViewShell
      portal="seller"
      {...rest}
      title={labels.title}
      sections={[
        stats,
        quickActions,
        revenueChart,
        topProducts,
        recentListings,
      ]}
    />
  );
}
