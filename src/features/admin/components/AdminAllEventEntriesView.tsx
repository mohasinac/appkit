"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingViewShell, RowActionMenu, useToast } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { apiClient } from "../../../http";

export interface AdminAllEventEntriesViewProps extends ListingViewShellProps {}

interface AdminEventEntriesResponse {
  items?: unknown[];
  total?: number;
}

interface EntryRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  eventId?: string;
}

export function AdminAllEventEntriesView({ children, ...props }: AdminAllEventEntriesViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminEventEntriesResponse,
    EntryRow
  >({
    queryKey: ["admin", "event-entries", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.ADMIN_EVENT_ENTRIES,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `entry-${index}`),
        primary: toStringValue(item.userDisplayName ?? item.userName, "Unknown user"),
        secondary: [
          toStringValue(item.eventId, ""),
          toStringValue(item.userEmail, ""),
        ].filter(Boolean).join(" · "),
        status: toStringValue(item.status ?? item.reviewStatus, "PENDING"),
        updatedAt: toRelativeDate(item.submittedAt ?? item.createdAt),
        eventId: toStringValue(item.eventId, ""),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ADMIN_EVENT_ENTRY_BY_ID(id), { status });
    },
    onSuccess: () => {
      showToast("Entry updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "event-entries"] });
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update entry.", "error");
    },
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const rowActions = (row: EntryRow) => [
    {
      label: "Confirm",
      onClick: () => updateMutation.mutate({ id: row.id, status: "CONFIRMED" }),
    },
    {
      label: "Waitlist",
      onClick: () => updateMutation.mutate({ id: row.id, status: "WAITLISTED" }),
    },
    {
      label: "Cancel",
      destructive: true,
      onClick: () => updateMutation.mutate({ id: row.id, status: "CANCELLED" }),
    },
  ];

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Event Entries"
      subtitle="Review and moderate participant entries across all platform events."
      searchPlaceholder="Search by user name or event ID"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No entries found"
      resultSummary={`Showing ${rows.length} of ${total} entries`}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "CONFIRMED", "WAITLISTED", "CANCELLED"],
          active: statusFilter || "All",
          onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
        },
      ]}
      renderRowActions={(row) => (
        <RowActionMenu actions={rowActions(row as EntryRow)} />
      )}
    />
  );
}
