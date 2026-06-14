"use client";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Div, ListingLayout, Text, useToast } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { normalizeError } from "../../../errors/normalize";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { CouponCard } from "../../promotions/components/CouponCard";

interface CouponRow {
  id: string;
  raw: Record<string, unknown>;
  isActive: boolean;
}

interface SellerCouponsResponse {
  coupons?: unknown[];
  total?: number;
}

function getIsActive(item: Record<string, unknown>): boolean {
  const validity = item.validity as Record<string, unknown> | undefined;
  return Boolean(validity?.isActive ?? item.isActive);
}

export interface SellerCouponsViewProps extends ListingLayoutProps {
  onCreateClick?: () => void;
  onEditClick?: (couponId: string) => void;
  onToggle?: (couponId: string, currentlyActive: boolean) => Promise<void>;
  onDelete?: (couponId: string) => Promise<void>;
}

export function SellerCouponsView({
  onCreateClick,
  onEditClick,
  onToggle,
  onDelete,
  children,
  ...props
}: SellerCouponsViewProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    deleteFn: onDelete,
    successMessage: "Coupon deleted.",
  });

  const handleEdit = useCallback((id: string) => onEditClick?.(id), [onEditClick]);

  const handleToggle = useCallback(
    async (id: string, currentlyActive: boolean) => {
      if (!onToggle) return;
      setTogglingId(id);
      try {
        await onToggle(id, currentlyActive);
        showToast("Coupon updated.", "success");
      } catch (err) {
        void normalizeError(err);
        showToast(err instanceof Error ? err.message : "Failed to update coupon.", "error");
      } finally {
        setTogglingId(null);
      }
    },
    [onToggle, showToast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!onDelete) return;
      await performDelete(id);
    },
    [onDelete, performDelete],
  );

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="seller" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<SellerCouponsResponse, CouponRow> = {
    portal: "seller",
    title: "Coupons",
    searchPlaceholder: "Search by coupon code",
    emptyLabel: "No coupons found — create your first coupon",
    filterKeys: ["isActive"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "coupons", "listing"],
    endpoint: SELLER_ENDPOINTS.COUPONS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "code", label: "Code A–Z" },
    ],
    hideTableView: true,
    mapRows: (response) =>
      toRecordArray(response.coupons).map((item, index) => ({
        id: toStringValue(item.id, `coupon-${index}`),
        raw: item,
        isActive: getIsActive(item),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      state.isActive ? sieveFilter("isActive", SIEVE_OP.EQ, state.isActive) : undefined,
    primaryAction: onCreateClick
      ? { label: "Add Coupon", onClick: () => onCreateClick() }
      : undefined,
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Div className="space-y-2">
        <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Status
        </Text>
        <Div className="flex flex-wrap gap-2">
          {[
            { label: "All", value: "" },
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setPendingFilters((p) => ({ ...p, isActive: opt.value }))}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                (pendingFilters.isActive || "") === opt.value
                  ? "bg-[var(--appkit-color-primary)] text-white border-[var(--appkit-color-primary)]"
                  : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </Div>
      </Div>
    ),
    renderCards: (rows, _view, _selection, isLoading) =>
      isLoading ? (
        <Div className="fluid-grid-card gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Div
              key={i}
              className="rounded-xl border-2 border-zinc-100 dark:border-slate-700 p-4 animate-pulse space-y-3"
            >
              <Div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
              <Div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
              <Div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
            </Div>
          ))}
        </Div>
      ) : (
        <Div className="fluid-grid-card gap-3">
          {rows.map((row) => (
            <CouponCard
              key={row.id}
              coupon={row.raw}
              onEdit={onEditClick ? handleEdit : undefined}
              onToggleActive={onToggle ? handleToggle : undefined}
              onDelete={onDelete ? handleDelete : undefined}
              className={
                togglingId === row.id || deletingId === row.id
                  ? "pointer-events-none opacity-60"
                  : undefined
              }
            />
          ))}
        </Div>
      ),
  };

  return <DataListingView config={config} />;
}
