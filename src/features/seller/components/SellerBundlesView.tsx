"use client";

import { SIEVE_OP, sieveFilter, sortBy, type JsonArray } from "@mohasinac/appkit";
import React from "react";
import { Badge, Button, FilterChipGroup, Stack, Text, TextLink } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { SELLER_BULK_ACTIONS } from "../../products/constants/action-defs";
import {
  BUNDLE_COPY,
  BUNDLE_STOCK_VARIANT,
} from "../../../_internal/shared/features/categories/bundle-copy";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

interface BundlesResponse {
  items?: JsonArray;
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

export interface SellerBundlesViewProps {
  getEditHref: (row: { id: string }) => string;
  newHref: string;
}

export function SellerBundlesView({ getEditHref, newHref }: SellerBundlesViewProps) {
  const config: ListingViewConfig<BundlesResponse, BundleRow> = {
    portal: "seller",
    title: "Bundles",
    searchPlaceholder: "Search bundles by name or slug…",
    emptyLabel: "No bundles yet — create a bundle to group multiple of your products together",
    filterKeys: ["isActive", "bundleStockStatus"],
    defaultSort: sortBy("name", "ASC"),
    queryKey: ["seller", "bundles", "listing"],
    endpoint: SELLER_ENDPOINTS.BUNDLES,
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
        <TextLink href={newHref} layout="flex" align="center" gap="xs">
          + New Bundle
        </TextLink>
      </Button>
    ),
    // Rule #7: bulk-action array sourced from the SELLER_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] => {
      const handlers: Record<(typeof SELLER_BULK_ACTIONS.bundles)[number], () => Promise<void>> = {
        [ROW_ACTION_ID.DELETE]: async () => {
          await Promise.all(
            selection.selectedIds.map((id) =>
              fetch(SELLER_ENDPOINTS.BUNDLE_BY_ID(id), { method: "DELETE" }),
            ),
          );
          selection.clearSelection();
        },
      };
      return SELLER_BULK_ACTIONS.bundles.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        destructive: ROW_ACTION_META[id].destructive,
        onClick: handlers[id],
      }));
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={[
            { id: "All", label: "All" },
            { id: "true", label: "Active" },
            { id: "false", label: "Inactive" },
          ]}
          value={pendingFilters.isActive || ""}
          onChange={(v) => setPendingFilters((p) => ({ ...p, isActive: v }))}
        />
        <FilterChipGroup
          label="Stock"
          tabs={[
            { id: "All", label: "All" },
            { id: "out_of_stock", label: "Sold out" },
          ]}
          value={pendingFilters.bundleStockStatus || ""}
          onChange={(v) => setPendingFilters((p) => ({ ...p, bundleStockStatus: v }))}
        />
      </>
    ),
  };

  return <DataListingView config={config} />;
}
