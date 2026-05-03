"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../../admin/hooks/useAdminListingData";
import { AdminListingScaffold } from "../../admin/components/AdminListingScaffold";

export interface AdminEventsViewProps extends ListingViewShellProps {}

interface AdminEventsApiResponse {
  items?: unknown[];
  total?: number;
  totalPages?: number;
}

export function AdminEventsView({ children, ...props }: AdminEventsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") {
    filterParts.push(`status==${statusFilter}`);
  }
  if (typeFilter && typeFilter !== "All") {
    filterParts.push(`type==${typeFilter}`);
  }
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminEventsApiResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "events", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.EVENTS,
    filters,
    q: q || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `event-${index}`),
        primary: toStringValue(item.title, "Untitled event"),
        secondary: [
          toStringValue(item.type, "event"),
          toStringValue(item.startsAt, ""),
        ]
          .filter(Boolean)
          .join(" · "),
        status: toStringValue(item.status, "active"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Events"
      subtitle="Manage sales events, offers, polls, surveys, and feedback campaigns."
      actionLabel="New event"
      searchPlaceholder="Search events by title or type"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No events found"
      resultSummary={`Showing ${rows.length} of ${total} events`}
      onSearch={setQ}
      searchValue={q}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "published", "draft", "active", "ended"],
          active: statusFilter || "All",
          onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
        },
        {
          title: "Type",
          options: ["All", "contest", "giveaway", "sale", "poll", "survey", "flash-sale"],
          active: typeFilter || "All",
          onSelect: (opt) => setTypeFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
