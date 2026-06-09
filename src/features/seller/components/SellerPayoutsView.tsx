"use client";

import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { FilterChipGroup, ListingLayout, RowActionMenu } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_PAYOUT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";

interface SellerPayoutsResponse {
  payouts?: unknown[];
  meta?: { total: number };
}

interface PayoutRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export interface SellerPayoutsViewProps extends ListingLayoutProps {
  onViewClick?: (id: string) => void;
  onExportClick?: (id: string) => void;
}

export function SellerPayoutsView({
  children,
  onViewClick,
  onExportClick,
  ...props
}: SellerPayoutsViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="seller" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<SellerPayoutsResponse, PayoutRow> = {
    portal: "seller",
    title: "Payouts",
    searchPlaceholder: "Search payouts by payout # or amount",
    emptyLabel: "No payouts found",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "payouts", "listing"],
    endpoint: SELLER_ENDPOINTS.PAYOUTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.payouts).map((item, index) => ({
        id: toStringValue(item.id, `payout-${index}`),
        primary: `Payout #${toStringValue(item.payoutNumber ?? item.id, "Unknown")}`,
        secondary: [
          toRupees(item.amount ?? item.totalAmount),
          `Requested: ${toRelativeDate(item.requestedAt ?? item.createdAt)}`,
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.processedAt ?? item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? `status==${state.status}` : undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          ...(onViewClick
            ? [{ label: ACTIONS.STORE["view-payout"].label, onClick: () => onViewClick(row.id) }]
            : []),
          ...(onExportClick
            ? [{ label: ACTIONS.STORE["export-payout"].label, onClick: () => onExportClick(row.id) }]
            : []),
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_PAYOUT_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return <DataListingView config={config} />;
}
