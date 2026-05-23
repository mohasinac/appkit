"use client";

import React from "react";
import { FilterChipGroup, ListingLayout } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_EVENT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { AdminEventEditorView } from "./AdminEventEditorView";

// TODO(events): TYPE_OPTIONS list pre-dates the SB9 EventType union refresh
// (sale|offer|poll|survey|feedback|raffle|spin_wheel). Keep current values to
// avoid silently breaking saved-filter URLs — sync in a dedicated follow-up.
const TYPE_OPTIONS = [
  { id: "All", label: "All" },
  { id: "contest", label: "Contest" },
  { id: "giveaway", label: "Giveaway" },
  { id: "sale", label: "Sale" },
  { id: "poll", label: "Poll" },
  { id: "survey", label: "Survey" },
  { id: "flash-sale", label: "Flash Sale" },
] as const;

interface AdminEventsApiResponse {
  items?: unknown[];
  total?: number;
}

interface EventRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export interface AdminEventsViewProps extends ListingLayoutProps {
  getRowHref?: (row: { id: string }) => string;
}

export function AdminEventsView({ children, ...props }: AdminEventsViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminEventsApiResponse, EventRow> = {
    portal: "admin",
    title: "Events",
    searchPlaceholder: "Search events by title or type",
    emptyLabel: "No events found",
    filterKeys: ["status", "type"],
    defaultSort: "-startsAt",
    queryKey: ["admin", "events", "listing"],
    endpoint: ADMIN_ENDPOINTS.EVENTS,
    sortOptions: [
      { value: "-startsAt", label: "Starting soonest" },
      { value: "startsAt", label: "Starting latest" },
      { value: "-createdAt", label: "Newest" },
      { value: "title", label: "Title A–Z" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `event-${index}`),
        primary: toStringValue(item.title, "Untitled event"),
        secondary: [toStringValue(item.type, "event"), toStringValue(item.startsAt, "")]
          .filter(Boolean)
          .join(" · "),
        status: toStringValue(item.status, "active"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.status && state.status !== "All") parts.push(`status==${state.status}`);
      if (state.type && state.type !== "All") parts.push(`type==${state.type}`);
      return parts.join(",") || undefined;
    },
    primaryAction: {
      label: "Add Event",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: "delete",
        label: "Delete Selected",
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_EVENT_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        <FilterChipGroup
          label="Type"
          tabs={TYPE_OPTIONS}
          value={pendingFilters.type ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
        />
      </>
    ),
    renderEditor: ({ editId, closePanel }) => (
      <AdminEventEditorView eventId={editId ?? undefined} onSaved={closePanel} embedded />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Event" : "Edit Event"),
  };

  return <DataListingView config={config} />;
}
