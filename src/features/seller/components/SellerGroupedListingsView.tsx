"use client";

import React from "react";
import { Badge, Button, Div } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

const THEME_LABELS: Record<string, string> = {
  related: "Related",
  character: "Character",
  lineage: "Lineage",
  set: "Set",
  generic: "Generic",
};

const VISIBILITY_BADGE: Record<string, "success" | "warning"> = {
  visible: "success",
  hidden: "warning",
};

interface GroupedRow {
  id: string;
  title: string;
  groupTheme: string;
  productCount: number;
  isActive: boolean;
  visibilityStatus: string;
  createdAt: string;
}

interface GroupedListingsResponse {
  items?: unknown[];
  meta?: { total: number };
}

const COLUMNS: AdminTableColumn<GroupedRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (r) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.title}</span>,
  },
  {
    key: "groupTheme",
    header: "Theme",
    render: (r) => (
      <Badge variant="default">{THEME_LABELS[r.groupTheme] ?? r.groupTheme}</Badge>
    ),
  },
  {
    key: "productCount",
    header: "Products",
    render: (r) => <span className="text-sm text-zinc-600 dark:text-zinc-400">{r.productCount}</span>,
  },
  {
    key: "visibilityStatus",
    header: "Visibility",
    render: (r) => (
      <Badge variant={VISIBILITY_BADGE[r.visibilityStatus] ?? "default"}>
        {r.visibilityStatus === "visible" ? "Visible" : "Hidden"}
      </Badge>
    ),
  },
  {
    key: "isActive",
    header: "Status",
    render: (r) => (
      <Badge variant={r.isActive ? "success" : "default"}>
        {r.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    render: (r) => <span className="text-xs text-zinc-500 dark:text-zinc-400">{r.createdAt}</span>,
  },
];

export interface SellerGroupedListingsViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDeleteClick?: (id: string) => void;
}

export function SellerGroupedListingsView({
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: SellerGroupedListingsViewProps) {
  const config: ListingViewConfig<GroupedListingsResponse, GroupedRow> = {
    portal: "seller",
    title: "Grouped Listings",
    searchPlaceholder: "Search grouped listings",
    emptyLabel: "No grouped listings yet",
    filterKeys: [],
    defaultSort: "-createdAt",
    queryKey: ["seller", "grouped-listings"],
    endpoint: SELLER_ENDPOINTS.GROUPED_LISTINGS,
    sortOptions: [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
      { value: "title", label: "Title A–Z" },
      { value: "-title", label: "Title Z–A" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `group-${index}`),
        title: toStringValue(item.title, "Untitled group"),
        groupTheme: toStringValue(item.groupTheme, "generic"),
        productCount: Array.isArray(item.productIds) ? item.productIds.length : 0,
        isActive: item.isActive === true,
        visibilityStatus: toStringValue(item.visibilityStatus, "hidden"),
        createdAt: toRelativeDate(item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: () => undefined,
    primaryAction: onCreateClick
      ? { label: "New Group", onClick: () => onCreateClick() }
      : undefined,
    buildBulkActions: onDeleteClick
      ? (selection): BulkActionItem[] => [
          buildBulkAction(ACTIONS.STORE["delete-listing"], () => {
            for (const id of selection.selectedIds) onDeleteClick(id);
            selection.clearSelection();
          }),
        ]
      : undefined,
    renderRowActions: (row) => (
      <Div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => onEditClick?.(row.id)}>
          {ACTIONS.STORE["edit-listing"].label}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDeleteClick?.(row.id)}>
          {ACTIONS.STORE["delete-listing"].label}
        </Button>
      </Div>
    ),
  };

  return <DataListingView config={config} />;
}
