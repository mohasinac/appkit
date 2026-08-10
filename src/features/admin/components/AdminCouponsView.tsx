"use client";
import { normalizeError } from "../../../errors/normalize";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Div, FilterChipGroup, ListingLayout, Text, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROW_ACTION_META, ROW_ACTION_ID, ADMIN_BULK_ACTIONS } from "../../products/constants/action-defs";
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
  items?: JsonArray;
  total?: number;
}

interface CouponRow {
  id: string;
  raw: Record<string, JsonValue>;
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
  // Mirrors the currently-rendered rows so renderEditor can seed
  // AdminCouponEditorView with data already in memory (raw: item) instead of
  // re-fetching a record the table already has — DataListingView's
  // renderEditor callback only receives { editId, closePanel }, not rows.
  const rowsRef = React.useRef<CouponRow[]>([]);

  const handleToggle = useCallback(
    async (id: string, currentlyActive: boolean) => {
      try {
        await apiClient.patch(ADMIN_ENDPOINTS.COUPON_BY_ID(id), {
          validity: { isActive: !currentlyActive },
        });
        showToast(currentlyActive ? "Coupon deactivated." : "Coupon activated.", "success");
        queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      } catch (_err) {
        void normalizeError(_err);
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
      } catch (_err) {
        void normalizeError(_err);
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
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS registry
    // preset (not hand-built inline objects) — each id maps to its
    // ROW_ACTION_META label/destructive flag, with the handler wired here.
    buildBulkActions: (selection): BulkActionItem[] => {
      const handlers: Partial<Record<(typeof ADMIN_BULK_ACTIONS.coupons)[number], () => Promise<void>>> = {
        [ROW_ACTION_ID.ARCHIVE]: onBulkArchive
          ? async () => { await onBulkArchive(selection.selectedIds); selection.clearSelection(); }
          : undefined,
        [ROW_ACTION_ID.DELETE]: onBulkDelete
          ? async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); }
          : undefined,
      };
      return ADMIN_BULK_ACTIONS.coupons
        .filter((id) => handlers[id])
        .map((id) => ({
          id,
          label: ROW_ACTION_META[id].label,
          destructive: ROW_ACTION_META[id].destructive,
          onClick: handlers[id]!,
        }));
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Type"
        tabs={ADMIN_COUPON_TYPE_TABS}
        value={pendingFilters.type ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
      />
    ),
    renderCards: (rows, _view, selectionCtx, isLoading) => {
      rowsRef.current = rows;
      return isLoading ? (
        <Div gap="3" className="fluid-grid-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <Stack border="skeleton"
              key={i}
              className="animate-pulse" gap="3" rounded="xl" padding="md"
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
      );
    },
    renderEditor: ({ editId, closePanel }) => (
      <AdminCouponEditorView
        couponId={editId ?? undefined}
        initialData={editId ? rowsRef.current.find((r) => r.id === editId)?.raw as Record<string, unknown> | undefined : undefined}
        onSaved={closePanel}
        onDeleted={closePanel}
        embedded
      />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Coupon" : "Edit Coupon"),
  };

  return <DataListingView config={config} />;
}
