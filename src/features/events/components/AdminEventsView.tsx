"use client";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React from "react";
import { FilterChipGroup, ListingLayout } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_EVENT_STATUS_TABS, ALL_TAB } from "../../admin/constants/filter-tabs";
import { ALL_EVENT_TYPES, EVENT_TYPE_LABELS } from "../types";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { AdminEventEditorView } from "./AdminEventEditorView";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";

/**
 * Derived from the `EventType` union (2026-08-24).
 *
 * The hand-written list this replaces offered `contest`, `giveaway` and
 * `flash-sale` — none of which are `EventType` values, so each was fed straight
 * into `sieveFilter("type", EQ, id)` and matched zero rows forever — while
 * omitting five real types (`offer`, `feedback`, `raffle`, `spin_wheel`,
 * `lottery`). It carried a TODO deferring the fix on the grounds of "avoid
 * silently breaking saved-filter URLs"; that reasoning didn't hold, since a URL
 * naming a dead id was already returning nothing (Root Cause #33 + #61).
 */
const TYPE_OPTIONS = [
  ALL_TAB,
  ...ALL_EVENT_TYPES.map((type) => ({ id: type, label: EVENT_TYPE_LABELS[type] })),
];

interface AdminEventsApiResponse {
  items?: JsonArray;
  total?: number;
}

interface EventRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export type AdminEventsViewProps = ListingLayoutProps;

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
    // buildEventSearchTxt indexes title + description + type + tags.
    // buildEventSearchTxt indexes title + description + type + tags.
    search: {
      placeholder: "Search by title, description, type or tag…",
      mode: "partial",
      fields: ["title", "description", "type", "tags"],
      commit: "debounce",
    },
    emptyLabel: "No events found",
    filterKeys: ["status", "type"],
    defaultSort: sortBy("startsAt", "DESC"),
    queryKey: ["admin", "events", "listing"],
    endpoint: ADMIN_ENDPOINTS.EVENTS,
    sortOptions: [
      { value: sortBy("startsAt", "DESC"), label: "Starting soonest" },
      { value: "startsAt", label: "Starting latest" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
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
      if (state.status && state.status !== "All") parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      if (state.type && state.type !== "All") parts.push(sieveFilter("type", SIEVE_OP.EQ, state.type));
      return parts.join(",") || undefined;
    },
    primaryAction: {
      label: "Add Event",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] =>
      ADMIN_BULK_ACTIONS.events.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        destructive: ROW_ACTION_META[id].destructive,
        onClick: () => selection.clearSelection(),
      })),
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
