"use client";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React from "react";
import { Pencil, ListChecks } from "lucide-react";
import { Badge, Button, FilterChipGroup, ListingLayout, Row, Span, Text, TextLink } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import { ADMIN_PRODUCT_STATUS_TABS } from "../constants/filter-tabs";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { AdminListingScaffoldRow, ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";
import { useAvailabilityScope } from "../../products/hooks/useAvailabilityScope";
import type { ListingType } from "../../products/types";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

const PRIZE_DRAW_TYPES: readonly ListingType[] = ["prize-draw"];

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
  items?: JsonArray;
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
  /*
   * 🛑 Before the early return, not after.
   *
   * This hook used to sit BELOW the `React.Children.count` branch, so the
   * component called a different number of hooks depending on whether it was
   * given children — a rules-of-hooks violation that React only reports once
   * the branch actually flips at runtime. The page renders `<AdminPrizeDrawsView />`
   * with no children, so the violating path was the one always taken and the
   * bug stayed latent. `SellerPreOrdersView` had the identical shape and was
   * deleted in the same commit for being unreachable.
   */
  const scope = useAvailabilityScope(PRIZE_DRAW_TYPES);

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
      { value: "prizeRevealWindowEnd", label: "Draw Date Soon" },
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
          entryFee: priceRaw ? toCurrency(priceRaw) : "Free",
          drawDate: item.prizeRevealWindowEnd
            ? toRelativeDate(item.prizeRevealWindowEnd as string)
            : "TBA",
          image: toStringValue(item.mainImage, "") || undefined,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const status = state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : null;
      return [sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, "prize-draw"), status]
        .filter(Boolean)
        .join(",");
    },
    buildExtraParams: () => scope.extraParams,
    renderAboveContent: scope.renderAboveContent,
    rowHrefTemplate: String(ROUTES.ADMIN.PRIZE_DRAWS_EDIT("{id}")),
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] =>
      ADMIN_BULK_ACTIONS.prizeDraws.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        destructive: ROW_ACTION_META[id].destructive,
        onClick: () => selection.clearSelection(),
      })),
    renderRowActions: (row) => (
      <Row gap="xs">
        <Button variant="ghost" size="sm" asChild>
          <TextLink href={String(ROUTES.ADMIN.PRIZE_DRAWS_EDIT(row.id))} aria-label="Edit">
            <Pencil className="w-4 h-4" />
          </TextLink>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <TextLink href={String(ROUTES.ADMIN.PRIZE_DRAWS_ENTRIES(row.id))} aria-label="View entries">
            <ListChecks className="w-4 h-4" />
          </TextLink>
        </Button>
      </Row>
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
