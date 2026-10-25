"use client";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React from "react";
import { FilterChipGroup } from "../../../ui/components/FilterChipGroup";
import { ListingLayout } from "../../../ui/components/ListingLayout";
import { TextLink } from "../../../ui/components/TextLink";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import type { ListingLayoutProps } from "../../../ui/components/ListingLayout";
// 🛑 From the DEFINING module, not `@mohasinac/appkit/client` — this file is a
// client component, but `ROUTES` is a runtime value and the `/client` entry is
// where Root Cause #76's React #441 comes from when a server component touches
// the same import. One spelling everywhere is cheaper than two rules.
import { ROUTES } from "../../../next/routing/route-map";
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
  items?: JsonArray;
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
      toRecordArray(response.items).map((item, index) => {
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
    /*
     * 🛑 THE ONLY LINK TO THE RECEIVE STATION.
     *
     * `ROUTES.ADMIN.SHIPMENT_RECEIVE` existed with ZERO consumers — a built
     * page reachable only by typing its URL, which is Root Cause #37's shape
     * and the reason ~25 working admin features sat unreachable. Receiving
     * belongs on the row rather than in the nav because it is always about one
     * shipment; a nav entry would have to ask which.
     */
    renderRowActions: (row) => (
      <TextLink href={String(ROUTES.ADMIN.SHIPMENT_RECEIVE(row.id))}>
        Receive
      </TextLink>
    ),
    renderEditor: ({ editId, closePanel }) => (
      <AdminShipmentEditorView shipmentId={editId ?? undefined} onSaved={closePanel} embedded />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "New Shipment" : "Edit Shipment"),
  };

  return <DataListingView config={config} />;
}
