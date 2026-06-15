"use client";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { Badge, Button, Div, Stack, Text, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import {
  BUNDLE_COPY,
  BUNDLE_STOCK_VARIANT,
} from "../../../_internal/shared/features/categories/bundle-copy";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import type { AdminTableColumn } from "../types";

interface BundlesResponse {
  items?: unknown[];
  total?: number;
}

type BundleRow = {
  id: string;
  primary: string;
  secondary: string;
  price: string;
  members: string;
  stockStatus: string;
  isActive: boolean;
  status: string;
  updatedAt: string;
};

function formatPrice(paise: unknown): string {
  if (typeof paise !== "number" || paise <= 0) return "—";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const COLUMNS: AdminTableColumn<BundleRow>[] = [
  {
    key: "primary",
    header: "Name",
    render: (row) => (
      <Stack gap="xs">
        <Text weight="medium" color="primary">{row.primary}</Text>
        <Text size="xs" color="muted">{row.secondary}</Text>
      </Stack>
    ),
  },
  { key: "price", header: "Price", className: "w-28" },
  { key: "members", header: "Members", className: "w-24" },
  {
    key: "stockStatus",
    header: "Stock",
    className: "w-28",
    render: (row) => (
      <Badge
        variant={
          BUNDLE_STOCK_VARIANT[row.stockStatus as keyof typeof BUNDLE_STOCK_VARIANT] ?? "default"
        }
      >
        {row.stockStatus === "in_stock"
          ? BUNDLE_COPY.stockBadge.listVariantInStock
          : BUNDLE_COPY.stockBadge.listVariantOutOfStock}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-24",
    render: (row) => (
      <Badge variant={row.isActive ? "success" : "default"}>{row.status}</Badge>
    ),
  },
  { key: "updatedAt", header: "Updated", className: "w-28" },
];

export interface AdminBundlesViewProps {
  getEditHref: (row: { id: string }) => string;
  newHref: string;
}

export function AdminBundlesView({ getEditHref, newHref }: AdminBundlesViewProps) {
  const [rebuildingId, setRebuildingId] = useState<string | null>(null);
  const toast = useToast();

  const handleRebuild = useCallback(
    async (bundleId: string) => {
      setRebuildingId(bundleId);
      try {
        const res = await fetch(ADMIN_ENDPOINTS.BUNDLE_REBUILD(bundleId), { method: "POST" });
        if (!res.ok) throw new Error("Rebuild failed");
        toast.showToast("Bundle stock rebuilt.", "success");
      } catch {
        toast.showToast("Failed to rebuild bundle stock.", "error");
      } finally {
        setRebuildingId(null);
      }
    },
    [toast],
  );

  const config: ListingViewConfig<BundlesResponse, BundleRow> = {
    portal: "admin",
    title: "Bundles",
    searchPlaceholder: "Search bundles by name or slug…",
    emptyLabel: BUNDLE_COPY.adminList.empty,
    filterKeys: ["isActive", "bundleStockStatus"],
    defaultSort: sortBy("name", "ASC"),
    queryKey: ["admin", "bundles", "listing"],
    endpoint: ADMIN_ENDPOINTS.BUNDLES,
    sortOptions: [
      { value: sortBy("name", "ASC"), label: "Name A–Z" },
      { value: sortBy("name", "DESC"), label: "Name Z–A" },
      { value: sortBy("bundlePriceInPaise", "DESC"), label: "Price high→low" },
      { value: "bundlePriceInPaise", label: "Price low→high" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `bundle-${index}`),
        primary: toStringValue(item.name, "Untitled bundle"),
        secondary: toStringValue(item.slug, "no-slug"),
        price: formatPrice(item.bundlePriceInPaise),
        members: String(Array.isArray(item.bundleProductIds) ? item.bundleProductIds.length : 0),
        stockStatus: toStringValue(item.bundleStockStatus, "in_stock"),
        isActive: item.isActive === true,
        status:
          item.isActive === true
            ? BUNDLE_COPY.adminList.activeBadge
            : BUNDLE_COPY.adminList.inactiveBadge,
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const parts: string[] = [];
      if (filterState.isActive) parts.push(sieveFilter("isActive", SIEVE_OP.EQ, filterState.isActive));
      if (filterState.bundleStockStatus)
        parts.push(sieveFilter("bundleStockStatus", SIEVE_OP.EQ, filterState.bundleStockStatus));
      return parts.join(",") || undefined;
    },
    getRowHref: getEditHref,
    toolbarExtra: (
      <Button asChild size="sm" variant="primary">
        <a href={newHref} className="flex items-center gap-1.5">
          + {BUNDLE_COPY.adminList.newButton}
        </a>
      </Button>
    ),
    buildBulkActions: (selection): BulkActionItem[] => [
      buildBulkAction(ACTIONS.ADMIN["activate-bundle"], async () => {
        await Promise.all(
          selection.selectedIds.map((id) =>
            fetch(ADMIN_ENDPOINTS.BUNDLE_BY_ID(id), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive: true }),
            }),
          ),
        );
        selection.clearSelection();
      }),
      buildBulkAction(ACTIONS.ADMIN["deactivate-bundle"], async () => {
        await Promise.all(
          selection.selectedIds.map((id) =>
            fetch(ADMIN_ENDPOINTS.BUNDLE_BY_ID(id), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive: false }),
            }),
          ),
        );
        selection.clearSelection();
      }),
      buildBulkAction(ACTIONS.ADMIN["delete-bundle"], async () => {
        await Promise.all(
          selection.selectedIds.map((id) =>
            fetch(ADMIN_ENDPOINTS.BUNDLE_BY_ID(id), { method: "DELETE" }),
          ),
        );
        selection.clearSelection();
      }),
    ],
    renderRowActions: (row) => (
      <Button
        variant="ghost"
        size="sm"
        isLoading={rebuildingId === row.id}
        disabled={rebuildingId === row.id}
        onClick={() => void handleRebuild(row.id)}
      >
        {ACTIONS.ADMIN["rebuild-bundle"].label}
      </Button>
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <Stack gap="sm">
          <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
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
                    ? "bg-primary text-white border-primary"
                    : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </Div>
        </Stack>
        <Stack gap="sm">
          <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
            Stock
          </Text>
          <Div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "" },
              { label: "Sold out", value: "out_of_stock" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  setPendingFilters((p) => ({ ...p, bundleStockStatus: opt.value }))
                }
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  (pendingFilters.bundleStockStatus || "") === opt.value
                    ? "bg-primary text-white border-primary"
                    : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </Div>
        </Stack>
      </>
    ),
  };

  return <DataListingView config={config} />;
}
