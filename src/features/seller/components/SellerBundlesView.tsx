"use client";

import { SIEVE_OP, sieveFilter, sortBy, type JsonArray } from "@mohasinac/appkit/client";
import React from "react";
import { Badge } from "../../../ui/components/Badge";
import { Button } from "../../../ui/components/Button";
import { FilterChipGroup } from "../../../ui/components/FilterChipGroup";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { Toggle } from "../../../ui/components/Toggle";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
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
import { useOptimisticRowFlag } from "../../admin/hooks/useOptimisticRowFlag";
import { apiClient } from "../../../http";
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

function formatPrice(value: unknown): string {
  if (typeof value !== "number" || value <= 0) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
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
  /** Plain string with an `{id}` placeholder — safe to build in a Server Component page.tsx. */
  editHrefTemplate: string;
  newHref: string;
}

export function SellerBundlesView({ editHrefTemplate, newHref }: SellerBundlesViewProps) {
  /*
   * 🛑 `isActive` was a READ-ONLY badge here, and the update schema was built
   * to take it on its own — shipping-config's even says so in a comment: "a
   * PATCH may legitimately carry only `isActive`". Nothing in the client had
   * ever sent one, so flipping one boolean meant a full-editor round trip.
   *
   * The optimistic/rollback logic lives in the hook because eight listings
   * grew this control at once; see its header for why rollback must DELETE
   * the override key rather than write back a captured value.
   */
  const activeFlag = useOptimisticRowFlag<boolean>({
    mutate: (id, next) => apiClient.put(SELLER_ENDPOINTS.BUNDLE_BY_ID(id), { isActive: next }),
    invalidate: [["seller", "bundles", "listing"], ["bundles"]],
    successMessage: (next) => (next ? "Bundle activated." : "Bundle deactivated."),
    errorMessage: "Could not change that bundle's status.",
  });

  const config: ListingViewConfig<BundlesResponse, BundleRow> = {
    portal: "seller",
    title: "Bundles",
    search: {
      placeholder: "Search bundles by name or slug…",
      // `/api/store/bundles` filters in memory on `b.name` and `b.slug`.
      fields: ["name", "slug"],
    },
    emptyLabel: "No bundles yet — create a bundle to group multiple of your products together",
    filterKeys: ["isActive", "bundleStockStatus"],
    defaultSort: sortBy("name", "ASC"),
    queryKey: ["seller", "bundles", "listing"],
    endpoint: SELLER_ENDPOINTS.BUNDLES,
    sortOptions: [
      { value: sortBy("name", "ASC"), label: "Name A–Z" },
      { value: sortBy("name", "DESC"), label: "Name Z–A" },
      { value: sortBy("bundlePrice", "DESC"), label: "Price high→low" },
      { value: "bundlePrice", label: "Price low→high" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const id = toStringValue(item.id, `bundle-${index}`);
        /*
         * Resolved ONCE, through the pending override, and then used for both
         * `isActive` and the `status` LABEL below. Deriving the label from the
         * raw value while the flag read the override is how the badge ends up
         * saying "Inactive" beside a switch that is on.
         */
        const isActive = activeFlag.resolve(id, item.isActive === true);
        return {
          id,
          primary: toStringValue(item.name, "Untitled bundle"),
          secondary: toStringValue(item.slug, "no-slug"),
          price: formatPrice(item.bundlePrice),
          members: String(Array.isArray(item.bundleProductIds) ? item.bundleProductIds.length : 0),
          stockStatus: toStringValue(item.bundleStockStatus, "in_stock"),
          isActive,
          status: isActive
            ? BUNDLE_COPY.adminList.activeBadge
            : BUNDLE_COPY.adminList.inactiveBadge,
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const parts: string[] = [];
      if (filterState.isActive) parts.push(sieveFilter("isActive", SIEVE_OP.EQ, filterState.isActive));
      if (filterState.bundleStockStatus)
        parts.push(sieveFilter("bundleStockStatus", SIEVE_OP.EQ, filterState.bundleStockStatus));
      return parts.join(",") || undefined;
    },
    rowHrefTemplate: editHrefTemplate,
    /*
     * 🛑 This view had NO renderRowActions at all — the only per-row
     * affordance was the row link to the editor, so a bundle could only be
     * activated or deactivated by opening it.
     *
     * The toggle lives here rather than in a column because `rowHrefTemplate`
     * makes the row an anchor: a normal column cell does not stop
     * propagation, so a switch there would flip AND navigate. This slot is
     * already click-stopped in all three renderers.
     */
    renderRowActions: (row) => (
      <Toggle
        size="sm"
        checked={row.isActive}
        disabled={activeFlag.pendingId === row.id}
        ariaLabel={`${row.isActive ? "Deactivate" : "Activate"} ${row.primary}`}
        onChange={(next) => { void activeFlag.set(row.id, next); }}
      />
    ),
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
