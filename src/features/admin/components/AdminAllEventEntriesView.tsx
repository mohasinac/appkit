"use client";

import { useApiMutation, type JsonArray } from "@mohasinac/appkit/client";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FilterChipGroup, ListingLayout, RecordDetailModal, RowActionMenu, useToast } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import type { JsonValue } from "../../../schemas/types";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_EVENT_ENTRY_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";

interface AdminEventEntriesResponse {
  items?: JsonArray;
  total?: number;
}

interface EntryRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  eventId?: string;
  _raw: Record<string, JsonValue>;
}

export type AdminAllEventEntriesViewProps = ListingLayoutProps;

export function AdminAllEventEntriesView({ children, ...props }: AdminAllEventEntriesViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selected, setSelected] = React.useState<EntryRow | null>(null);

  const updateMutation = useApiMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ADMIN_EVENT_ENTRY_BY_ID(id), { status });
    },
    onSuccess: () => {
      showToast("Entry updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "event-entries"] });
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to update entry.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminEventEntriesResponse, EntryRow> = {
    portal: "admin",
    title: "Event Entries",
    searchPlaceholder: "Search by user name or event ID",
    emptyLabel: "No entries found",
    filterKeys: ["status"],
    defaultSort: sortBy("submittedAt", "DESC"),
    queryKey: ["admin", "event-entries", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_EVENT_ENTRIES,
    sortOptions: [
      { value: sortBy("submittedAt", "DESC"), label: "Newest" },
      { value: "submittedAt", label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `entry-${index}`),
        primary: toStringValue(item.userDisplayName ?? item.userName, "Unknown user"),
        secondary:
          [toStringValue(item.eventId, ""), toStringValue(item.userEmail, "")]
            .filter(Boolean)
            .join(" · "),
        status: toStringValue(item.status ?? item.reviewStatus, "PENDING"),
        updatedAt: toRelativeDate(item.submittedAt ?? item.createdAt),
        eventId: toStringValue(item.eventId, ""),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined,
    // Confirm/waitlist/cancel used to be the only affordances — an admin
    // decided an entry's fate without ever seeing the entrant's answers.
    onRowClick: (row) => setSelected(row),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: "View details",
            onClick: () => setSelected(row),
          },
          {
            label: ACTIONS.ADMIN["confirm-entry"].label,
            onClick: () => updateMutation.mutate({ id: row.id, status: "CONFIRMED" }),
          },
          {
            label: ACTIONS.ADMIN["waitlist-entry"].label,
            onClick: () => updateMutation.mutate({ id: row.id, status: "WAITLISTED" }),
          },
          {
            label: ACTIONS.ADMIN["cancel-entry"].label,
            destructive: true,
            onClick: () => updateMutation.mutate({ id: row.id, status: "CANCELLED" }),
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_EVENT_ENTRY_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  const raw = selected?._raw ?? {};

  return (
    <>
      <DataListingView config={config} />
      <RecordDetailModal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.primary ?? "Event Entry"}
        badges={[{ label: selected?.status ?? "PENDING", variant: "default" }]}
        fields={[
          { label: "Event", value: toStringValue(raw.eventId, "—") },
          { label: "Email", value: toStringValue(raw.userEmail, "—") },
          { label: "Points", value: String(raw.points ?? "—") },
          { label: "Submitted", value: selected?.updatedAt ?? "—" },
        ]}
        metadata={(raw.responses as Record<string, JsonValue>) ?? undefined}
      />
    </>
  );
}
