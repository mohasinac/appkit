"use client";

import { SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Div, FilterChipGroup, ListingLayout, Text, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { ADMIN_COUPON_TYPE_TABS } from "../constants/filter-tabs";
import { apiClient } from "../../../http";
import {
  toRecordArray,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminCouponEditorView } from "./AdminCouponEditorView";
import { CouponCard } from "../../promotions/components/CouponCard";

interface AdminCouponsResponse {
  items?: unknown[];
  total?: number;
}

interface CouponRow {
  id: string;
  raw: Record<string, unknown>;
}

export interface AdminCouponsViewProps extends ListingLayoutProps {
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function AdminCouponsView({
  children,
  onBulkArchive,
  onBulkDelete,
  ...props
}: AdminCouponsViewProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const handleToggle = useCallback(
    async (id: string, currentlyActive: boolean) => {
      try {
        await apiClient.patch(ADMIN_ENDPOINTS.COUPON_BY_ID(id), {
          validity: { isActive: !currentlyActive },
        });
        showToast(currentlyActive ? "Coupon deactivated." : "Coupon activated.", "success");
        queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      } catch {
        showToast("Could not update coupon status.", "error");
      }
    },
    [showToast, queryClient],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(ADMIN_ENDPOINTS.COUPON_BY_ID(id));
        showToast("Coupon deleted.", "success");
        queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      } catch {
        showToast("Could not delete coupon.", "error");
      }
    },
    [showToast, queryClient],
  );

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminCouponsResponse, CouponRow> = {
    portal: "admin",
    title: "Coupons",
    searchPlaceholder: "Search codes, campaigns, or seller scopes",
    emptyLabel: "No coupons found",
    filterKeys: ["type"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "coupons", "listing"],
    endpoint: ADMIN_ENDPOINTS.COUPONS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "code", label: "Code A–Z" },
    ],
    hideTableView: true,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `coupon-${index}`),
        raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      state.type && state.type !== "All" ? sieveFilter("type", SIEVE_OP.EQ, state.type) : undefined,
    primaryAction: {
      label: "Add Coupon",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    buildBulkActions: (selection): BulkActionItem[] => [
      ...(onBulkArchive
        ? [
            {
              id: "bulk-archive",
              label: ROW_ACTION_META[ROW_ACTION_ID.ARCHIVE].label,
              onClick: async () => {
                await onBulkArchive(selection.selectedIds);
                selection.clearSelection();
              },
            },
          ]
        : []),
      ...(onBulkDelete
        ? [
            buildBulkAction(ACTIONS.ADMIN["delete-coupon"], async () => {
              await onBulkDelete(selection.selectedIds);
              selection.clearSelection();
            }),
          ]
        : []),
    ],
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Type"
        tabs={ADMIN_COUPON_TYPE_TABS}
        value={pendingFilters.type ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
      />
    ),
    renderCards: (rows, _view, selectionCtx, isLoading) =>
      isLoading ? (
        <Div gap="3" className="fluid-grid-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <Stack border="subtle" 
              key={i}
              className="border-2 dark:border-slate-700 animate-pulse" gap="3" rounded="xl" padding="md"
            >
              <Div className="h-6 w-2/3" surface="subtle" rounded="default" />
              <Div className="h-4 w-full" surface="subtle" rounded="default" />
              <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
            </Stack>
          ))}
        </Div>
      ) : rows.length === 0 ? (
        <Div className="text-center" padding="y-4xl">
          <Text color="faint">No coupons found</Text>
        </Div>
      ) : (
        <Div gap="3" className="fluid-grid-card">
          {rows.map((row) => (
            <CouponCard
              key={row.id}
              coupon={row.raw}
              onEdit={selectionCtx.openEditPanel}
              onToggleActive={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </Div>
      ),
    renderEditor: ({ editId, closePanel }) => (
      <AdminCouponEditorView
        couponId={editId ?? undefined}
        onSaved={closePanel}
        onDeleted={closePanel}
        embedded
      />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Coupon" : "Edit Coupon"),
  };

  return <DataListingView config={config} />;
}
