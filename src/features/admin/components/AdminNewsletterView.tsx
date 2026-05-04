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
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminNewsletterViewProps extends ListingViewShellProps {}

interface AdminNewsletterResponse {
  subscribers?: unknown[];
  meta?: {
    filteredTotal?: number;
    total?: number;
  };
}

export function AdminNewsletterView({ children, ...props }: AdminNewsletterViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminNewsletterResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "newsletter", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.NEWSLETTER,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.subscribers).map((item, index) => ({
        id: toStringValue(item.id, `sub-${index}`),
        primary: toStringValue(item.email, "Unknown email"),
        secondary: [
          toStringValue(item.source, ""),
          item.ipAddress ? "IP logged" : "",
        ].filter(Boolean).join(" · ") || "—",
        status: toStringValue(item.status, "unknown"),
        updatedAt: toRelativeDate((item as any).subscribedAt ?? (item as any).createdAt),
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
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
      title="Newsletter Subscribers"
      subtitle="View and manage email subscribers. Filter by status, search by email, and track subscription sources."
      searchPlaceholder="Search by email or source"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No subscribers found"
      resultSummary={`Showing ${rows.length} of ${total} subscribers`}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "active", "unsubscribed"],
          active: statusFilter || "All",
          onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
