"use client";

import { SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { Pencil } from "lucide-react";
import { Badge, Button, Div, FilterChipGroup, ListingLayout, Span, Text, TextLink } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_PRODUCT_STATUS_TABS } from "../constants/filter-tabs";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { AdminListingScaffoldRow, ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";

const STATUS_VARIANT: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
  published: "success",
  active: "success",
  draft: "default",
  pending: "warning",
  archived: "secondary",
  ended: "secondary",
  cancelled: "danger",
};

interface PrizeDrawAdminRow extends AdminListingScaffoldRow {
  entryFee: string;
  drawDate: string;
  storeName: string;
}

interface AdminProductsResponse {
  items?: unknown[];
  total?: number;
}

const PRIZE_DRAW_COLUMNS: AdminTableColumn<PrizeDrawAdminRow>[] = [
  {
    key: "primary",
    header: "Prize Draw",
    render: (row) => (
      <Stack gap="xs">
        <Text className="text-[var(--appkit-color-text)] line-clamp-1" weight="semibold">
          {row.primary}
        </Text>
        <Text className="text-[var(--appkit-color-text-muted)]" size="xs">{row.storeName}</Text>
      </Stack>
    ),
  },
  {
    key: "entryFee",
    header: "Entry Fee",
    className: "w-28 text-right",
    render: (row) => (
      <Span size="sm" weight="medium" className="text-[var(--appkit-color-text)]">{row.entryFee}</Span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    className: "w-28",
    render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>{row.status}</Badge>,
  },
  {
    key: "drawDate",
    header: "Draw Date",
    className: "w-32",
    render: (row) => (
      <Span size="sm" className="text-[var(--appkit-color-text-muted)]">{row.drawDate}</Span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    sortable: true,
    className: "w-32",
    render: (row) => (
      <Span size="sm" className="text-[var(--appkit-color-text-muted)]">{row.updatedAt}</Span>
    ),
  },
];

export type AdminPrizeDrawsViewProps = ListingLayoutProps;

export function AdminPrizeDrawsView({ children, ...props }: AdminPrizeDrawsViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminProductsResponse, PrizeDrawAdminRow> = {
    portal: "admin",
    title: "Prize Draws",
    searchPlaceholder: "Search prize draws by name or store…",
    emptyLabel: "No prize draws found",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "prize-draws", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "title", label: "Title A–Z" },
      { value: "prizeDrawEndDate", label: "Draw Date Soon" },
    ],
    columns: PRIZE_DRAW_COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const priceRaw = typeof item.price === "number" ? item.price : 0;
        return {
          id: toStringValue(item.id, `prize-draw-${index}`),
          primary: toStringValue(item.title ?? item.name, "Untitled prize draw"),
          secondary: toStringValue(item.sellerName, ""),
          storeName: toStringValue(item.sellerName ?? item.storeId, "Unknown store"),
          status: toStringValue(item.status, "draft"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          entryFee: priceRaw ? toRupees(priceRaw) : "Free",
          drawDate: item.prizeDrawEndDate
            ? toRelativeDate(item.prizeDrawEndDate as string)
            : "TBA",
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const status = state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : null;
      return ["listingType==prize-draw", status].filter(Boolean).join(",");
    },
    getRowHref: (row) => String(ROUTES.ADMIN.PRIZE_DRAWS_EDIT(row.id)),
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: "delete",
        label: ACTIONS.ADMIN["delete-prize-draw"].label,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderRowActions: (row) => (
      <Button variant="ghost" size="sm" asChild>
        <TextLink href={String(ROUTES.ADMIN.PRIZE_DRAWS_EDIT(row.id))} aria-label="Edit">
          <Pencil className="w-4 h-4" />
        </TextLink>
      </Button>
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_PRODUCT_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return <DataListingView config={config} />;
}
