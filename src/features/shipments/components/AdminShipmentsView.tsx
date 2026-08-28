"use client";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React from "react";
import { FilterChipGroup, ListingLayout } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { AdminShipmentEditorView } from "./AdminShipmentEditorView";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import { formatCurrency } from "../../../utils/number.formatter";

const STATUS_OPTIONS = [
  { id: "All", label: "All" },
  { id: "planning", label: "Planning" },
  { id: "ordered", label: "Ordered" },
  { id: "in_transit", label: "In Transit" },
  { id: "customs", label: "Customs" },
  { id: "received", label: "Received" },
  { id: "processing", label: "Processing" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

interface AdminShipmentsApiResponse {
  shipments?: JsonArray;
  meta?: { total?: number };
}

interface ShipmentRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  totalCost: string;
  projectedProfit: string;
  recalculating: boolean;
}

export type AdminShipmentsViewProps = ListingLayoutProps;

export function AdminShipmentsView({ children, ...props }: AdminShipmentsViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminShipmentsApiResponse, ShipmentRow> = {
    portal: "admin",
    title: "Procurement Shipments",
    // Search intentionally absent: this endpoint does not read `q`, so the box accepted typing and changed nothing. Restore it when the collection gains searchTxt — audit-listing-search-capability tracks it.
    emptyLabel: "No shipments found",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "shipments", "listing"],
    endpoint: ADMIN_ENDPOINTS.SHIPMENTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("etaDate", "ASC"), label: "ETA soonest" },
      { value: sortBy("projectedProfit", "DESC"), label: "Highest projected profit" },
      { value: "shipmentNumber", label: "Shipment # A–Z" },
    ],
    mapRows: (response) =>
      toRecordArray(response.shipments).map((item, index) => {
        const totals = (item.totals as Record<string, unknown>) ?? {};
        const totalsComputedAt = item.totalsComputedAt;
        const updatedAt = item.updatedAt;
        return {
          id: toStringValue(item.id, `shipment-${index}`),
          primary: toStringValue(item.shipmentNumber, "Untitled shipment"),
          secondary: [toStringValue(item.supplierName, ""), toStringValue(item.status, "")]
            .filter(Boolean)
            .join(" · "),
          status: toStringValue(item.status, "planning"),
          updatedAt: toRelativeDate(updatedAt),
          totalCost: formatCurrency(Number(totals.totalShipmentCost ?? 0)),
          projectedProfit: formatCurrency(Number(totals.projectedProfit ?? 0)),
          recalculating: !totalsComputedAt || (!!updatedAt && String(updatedAt) > String(totalsComputedAt)),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.status && state.status !== "All") parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      return parts.join(",") || undefined;
    },
    primaryAction: {
      label: "New Shipment",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    buildBulkActions: (selection): BulkActionItem[] =>
      ADMIN_BULK_ACTIONS.shipments.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        destructive: ROW_ACTION_META[id].destructive,
        onClick: () => selection.clearSelection(),
      })),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={STATUS_OPTIONS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
    renderEditor: ({ editId, closePanel }) => (
      <AdminShipmentEditorView shipmentId={editId ?? undefined} onSaved={closePanel} embedded />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "New Shipment" : "Edit Shipment"),
  };

  return <DataListingView config={config} />;
}
