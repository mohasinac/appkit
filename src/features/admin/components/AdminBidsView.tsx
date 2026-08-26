"use client";

import { useApiMutation, type JsonArray, type JsonObject } from "@mohasinac/appkit/client";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ConfirmDeleteModal,
  FilterChipGroup,
  ListingLayout,
  RecordDetailModal,
  RowActionMenu,
  useToast,
} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BID_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { buildBidDetailFields, bidStatusBadge } from "../../auctions/components/bid-detail-fields";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";
import { RecordStatusTimeline } from "../../status-history/components/RecordStatusTimeline";
import { TextLink } from "../../../ui";
import { ROUTES } from "../../../constants/index";

interface AdminBidsResponse {
  items?: JsonArray;
  total?: number;
}

interface BidRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  /**
   * The raw bid, kept so the detail modal can render it.
   *
   * The row's other fields are display strings — `primary` is already a
   * title-and-amount composite — so a modal built from them could only repeat
   * the row. Carrying the document is the same thing `AdminOffersView` does,
   * and it costs nothing: the response already contains it.
   */
  detail: JsonObject;
}

export type AdminBidsViewProps = ListingLayoutProps;

export function AdminBidsView({ children, ...props }: AdminBidsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BidRow | null>(null);
  const [detail, setDetail] = useState<BidRow | null>(null);

  const cancelMutation = useApiMutation({
    mutationFn: async (bidId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.BID_BY_ID(bidId), { status: "cancelled" });
    },
    onSuccess: () => {
      showToast("Bid cancelled.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "bids"] });
      setCancelOpen(false);
      setSelectedRow(null);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to cancel bid.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminBidsResponse, BidRow> = {
    portal: "admin",
    title: "Bids",
    searchPlaceholder: "Search bids, products, or bidder IDs",
    emptyLabel: "No bids found",
    filterKeys: ["status"],
    defaultSort: sortBy("bidDate", "DESC"),
    queryKey: ["admin", "bids", "listing"],
    endpoint: ADMIN_ENDPOINTS.BIDS,
    sortOptions: [
      { value: sortBy("bidDate", "DESC"), label: "Newest" },
      { value: "bidDate", label: "Oldest" },
      { value: sortBy("bidAmount", "DESC"), label: "Highest amount" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `bid-${index}`),
        primary: [
          toStringValue(item.productName ?? item.productTitle, "Unknown item"),
          toCurrency(item.bidAmount ?? item.amount),
        ].join(" · "),
        secondary: toStringValue(item.bidderId ?? item.bidderName ?? item.userId, "Unknown bidder"),
        status: toStringValue(item.status, "active"),
        updatedAt: toRelativeDate(
          item.bidDate ?? item.updatedAt ?? item.createdAt,
        ),
        detail: item as JsonObject,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined,
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: ROW_ACTION_ID.CANCEL,
        label: ACTIONS.ADMIN["cancel-bid"].label,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderRowActions: (row) => {
      const isCancelled = row.status === "cancelled" || row.status === "voided";
      return (
        <RowActionMenu
          actions={[
            // A menu of pure MUTATIONS is not a detail affordance (Root Cause
            // #56): it let an admin cancel a bid they had never been able to
            // read. View comes first for that reason.
            {
              label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label,
              onClick: () => setDetail(row),
            },
            {
              label: ROW_ACTION_META[ROW_ACTION_ID.CANCEL].label,
              destructive: ROW_ACTION_META[ROW_ACTION_ID.CANCEL].destructive,
              disabled: isCancelled,
              onClick: () => {
                setSelectedRow(row);
                setCancelOpen(true);
              },
            },
          ]}
        />
      );
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_BID_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  const detailBadge = detail ? bidStatusBadge(detail.status) : null;

  return (
    <>
      <DataListingView config={config} />
      <RecordDetailModal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={toStringValue(detail?.detail?.productTitle, "Bid")}
        badges={detailBadge ? [{ label: detailBadge.label }] : undefined}
        fields={
          detail
            ? buildBidDetailFields(detail.detail as never, "admin")
            : undefined
        }
        footer={
          detail ? (
            // The full page — a modal cannot be linked, bookmarked or reloaded
            // into, which is the whole reason the page exists.
            <TextLink href={String(ROUTES.ADMIN.BID_DETAIL(detail.id))}>
              Open full page →
            </TextLink>
          ) : undefined
        }
        extra={
          // A bid moves through more states than any record a buyer owns, and
          // every one of them happened inside a settlement batch with nothing
          // recording it until W18. Absent history renders the empty label,
          // never a step invented from `updatedAt`.
          <RecordStatusTimeline
            entries={(detail?.detail as { statusHistory?: never[] } | undefined)?.statusHistory}
            truncatedCount={
              (detail?.detail as { statusHistoryTruncated?: number } | undefined)?.statusHistoryTruncated
            }
          />
        }
      />
      <ConfirmDeleteModal
        isOpen={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setSelectedRow(null);
        }}
        onConfirm={() => {
          if (selectedRow) cancelMutation.mutate(selectedRow.id);
        }}
        isDeleting={cancelMutation.isPending}
        title="Cancel this bid?"
        message="This will mark the bid as cancelled and notify the bidder. The auction will continue with remaining active bids."
        confirmText="Cancel bid"
        variant="warning"
      />
    </>
  );
}
