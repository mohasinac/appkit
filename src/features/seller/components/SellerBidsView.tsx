"use client";
import { normalizeError } from "../../../errors/normalize";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";

import { Badge, Button, Div, FilterChipGroup, Span, Text, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { SELLER_BID_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { toRecordArray, toRelativeDate, toCurrency, toStringValue } from "../hooks/useSellerListingData";
import { DataTable } from "../../admin/components/DataTable";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig, ListingSelectionContext } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

const DEFAULT_SORT = "-bidDate";
const SORT_OPTIONS = [
  { value: sortBy("bidDate", "DESC"), label: "Newest" },
  { value: "bidDate", label: "Oldest" },
  { value: sortBy("bidAmount", "DESC"), label: "Highest Bid" },
  { value: "bidAmount", label: "Lowest Bid" },
];
const STATUS_OPTIONS = SELLER_BID_STATUS_TABS;
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  SELLER_BID_STATUS_TABS.map((t) => [t.id, t.label]),
);

const STATUS_BADGE: Record<string, "success" | "info" | "warning" | "danger" | "default"> = {
  active: "success",
  won: "info",
  outbid: "warning",
  lost: "default",
  cancelled: "danger",
};

interface BidRow {
  id: string;
  productTitle: string;
  productId: string;
  userName: string;
  bidAmount: number;
  status: string;
  bidDate: string;
}

interface SellerBidsResponse {
  bids?: JsonArray;
  total?: number;
  auctions?: { id: string; title: string }[];
}

export interface SellerBidsViewProps {
  endpoint?: string;
}

export function SellerBidsView({ endpoint = SELLER_ENDPOINTS.BIDS }: SellerBidsViewProps) {
  const { showToast } = useToast();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) =>
    setCollapsedGroups((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const columns: AdminTableColumn<BidRow>[] = [
    {
      key: "productTitle",
      header: "Auction",
      render: (row) => (
        <Stack gap="none">
          <Text className="line-clamp-1" color="primary" size="sm" weight="medium">{row.productTitle}</Text>
          <Text className="font-mono" color="faint" size="xs">{row.productId}</Text>
        </Stack>
      ),
    },
    {
      key: "userName",
      header: "Bidder",
      className: "w-36",
      render: (row) => <Span size="sm" color="muted">{row.userName}</Span>,
    },
    {
      key: "bidAmount",
      header: "Bid",
      className: "w-28 text-right",
      render: (row) => (
        <Span size="sm" weight="semibold" color="primary">
          {toCurrency(row.bidAmount)}
        </Span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-24",
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] ?? "default"}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "bidDate",
      header: "Date",
      className: "w-28",
      render: (row) => <Span size="xs" color="muted">{row.bidDate}</Span>,
    },
  ];

  const bulkCancel = useCallback(async (selection: ListingSelectionContext<BidRow>) => {
    if (!selection.selectedIds.length) return;
    try {
      const results = await Promise.all(
        selection.selectedIds.map((id) =>
          fetch(SELLER_ENDPOINTS.BID_BY_ID(id), { method: "DELETE" }).then((r) => r.ok),
        ),
      );
      const failed = results.filter((ok) => !ok).length;
      if (failed > 0) showToast(`${failed} bid(s) failed to cancel.`, "error");
      else showToast(`${results.length} bid(s) cancelled.`, "success");
      selection.clearSelection();
    } catch (err) {
      void normalizeError(err);
      showToast(err instanceof Error ? err.message : "Failed to cancel bids.", "error");
    }
  }, [showToast]);

  const config: ListingViewConfig<SellerBidsResponse, BidRow> = {
    portal: "seller",
    title: "Bids",
    searchPlaceholder: "Search by bidder name",
    emptyLabel: "No bids found for your auctions",
    filterKeys: ["status"],
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "bids", "listing"],
    endpoint,
    sortOptions: SORT_OPTIONS,
    initialView: "list",
    columns,
    mapRows: (response) =>
      toRecordArray(response.bids).map((item, idx) => ({
        id: toStringValue(item.id, `bid-${idx}`),
        productTitle: toStringValue(item.productTitle, "Unknown auction"),
        productId: toStringValue(item.productId, ""),
        userName: toStringValue(item.userName, "—"),
        bidAmount: Number(item.bidAmount ?? 0),
        status: toStringValue(item.status, "active"),
        bidDate: toRelativeDate(item.bidDate ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) => (typeof response.total === "number" ? response.total : mappedRows.length),
    buildFilters: (state) => (state.status ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Bid Status"
        tabs={STATUS_OPTIONS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        allId=""
      />
    ),
    buildBulkActions: (selection) => [
      buildBulkAction(ACTIONS.SELLER["cancel-bid"], () => void bulkCancel(selection)),
    ] as BulkActionItem[],
    // Grid/list view groups bids by auction with collapsible sections
    // (S-STORE-4-B); table view shows the flat per-bid list via `columns`.
    renderCards: (rows, _view, selection, isLoading) => {
      const groups = new Map<string, { title: string; bids: BidRow[] }>();
      for (const row of rows) {
        const key = row.productId || row.productTitle;
        const g = groups.get(key) ?? { title: row.productTitle, bids: [] };
        g.bids.push(row);
        groups.set(key, g);
      }
      const groupedRows = Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));

      if (groupedRows.length === 0 && !isLoading) {
        return <Text size="sm" color="muted">No bids found for your auctions.</Text>;
      }

      return (
        <Stack gap="3">
          {groupedRows.map((group) => {
            const collapsed = collapsedGroups.has(group.id);
            return (
              <Div
                key={group.id}
                className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="lg"
              >
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  justify="between"
                  paddingX="md"
                  paddingY="y-xs-tall"
                  textSize="sm"
                  weight="semibold"
                  textColor="default"
                  className="w-full hover:bg-[var(--appkit-color-surface-raised)]"
                >
                  <Span className="truncate">
                    {group.title}{" "}
                    <Span size="xs" weight="normal" className="text-[var(--appkit-color-text-muted)]">
                      · {group.bids.length} bid{group.bids.length === 1 ? "" : "s"}
                    </Span>
                  </Span>
                  <Span aria-hidden className="text-[var(--appkit-color-text-muted)]">
                    {collapsed ? "▸" : "▾"}
                  </Span>
                </Button>
                {!collapsed && (
                  <Div className="border-t border-[var(--appkit-color-border)]">
                    <DataTable
                      rows={group.bids}
                      columns={columns}
                      isLoading={false}
                      emptyLabel=""
                      selectedIds={new Set(selection.selectedIds)}
                      onToggleSelect={selection.toggleSelect}
                    />
                  </Div>
                )}
              </Div>
            );
          })}
        </Stack>
      );
    },
  };

  return <DataListingView config={config} />;
}
