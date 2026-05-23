"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilterChipGroup, ListingLayout, RowActionMenu, useToast } from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_STORE_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";
import { AdminStoreEditorView } from "./AdminStoreEditorView";

interface AdminStoresResponse {
  items?: unknown[];
  total?: number;
}

interface StoreRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminStoresViewProps extends ListingLayoutProps {}

export function AdminStoresView({ children, ...props }: AdminStoresViewProps) {
  const [editorRow, setEditorRow] = useState<StoreRow | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const verifyStore = useMutation({
    mutationFn: (storeId: string) =>
      apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(storeId), { isVerified: true }),
    onSuccess: () => {
      toast.showToast("Store verified.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "stores", "listing"] });
    },
    onError: () => {
      toast.showToast("Failed to verify store.", "error");
    },
  });

  const suspendStore = useMutation({
    mutationFn: (storeId: string) =>
      apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(storeId), { storeStatus: "suspended" }),
    onSuccess: () => {
      toast.showToast("Store suspended.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "stores", "listing"] });
    },
    onError: () => {
      toast.showToast("Failed to suspend store.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminStoresResponse, StoreRow> = {
    portal: "admin",
    title: "Stores",
    searchPlaceholder: "Search stores, slugs, or owner names",
    emptyLabel: "No stores found",
    filterKeys: ["status"],
    defaultSort: "-createdAt",
    queryKey: ["admin", "stores", "listing"],
    endpoint: ADMIN_ENDPOINTS.STORES,
    sortOptions: [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
      { value: "storeName", label: "Name A–Z" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `store-${index}`),
        primary: toStringValue(item.storeName, "Unnamed store"),
        secondary: [
          toStringValue(item.storeSlug, "No slug"),
          toStringValue(item.ownerId, "No owner"),
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? `status==${state.status}` : undefined,
    onRowClick: (row) => setEditorRow(row),
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: "manage",
        label: ACTIONS.ADMIN["manage-store"].label,
        variant: "primary",
        onClick: () => {
          const id = selection.selectedIds[0];
          const row = selection.rows.find((r) => r.id === id) ?? null;
          if (row) setEditorRow(row);
          selection.clearSelection();
        },
      },
    ],
    renderRowActions: (row) => {
      const isSuspended = row.status?.toLowerCase() === "suspended";
      const isVerified = Boolean(row._raw?.isVerified);
      return (
        <RowActionMenu
          actions={[
            {
              label: ACTIONS.ADMIN["manage-store"].label,
              onClick: () => setEditorRow(row),
            },
            {
              label: ACTIONS.ADMIN["verify-store"].label,
              onClick: () => verifyStore.mutate(row.id),
              disabled: isVerified || verifyStore.isPending,
            },
            {
              label: ACTIONS.ADMIN["suspend-store"].label,
              onClick: () => suspendStore.mutate(row.id),
              disabled: isSuspended || suspendStore.isPending,
            },
          ]}
        />
      );
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_STORE_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <AdminStoreEditorView
        open={Boolean(editorRow)}
        onClose={() => setEditorRow(null)}
        storeId={editorRow?.id}
        storeName={editorRow?.primary}
        currentStatus={editorRow?.status?.toLowerCase()}
        currentIsVerified={Boolean(editorRow?._raw?.isVerified)}
        currentCapabilities={
          Array.isArray(editorRow?._raw?.capabilities)
            ? (editorRow!._raw!.capabilities as string[])
            : undefined
        }
      />
    </>
  );
}
