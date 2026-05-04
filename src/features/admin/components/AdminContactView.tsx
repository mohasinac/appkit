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

export interface AdminContactViewProps extends ListingViewShellProps {}

interface AdminContactResponse {
  submissions?: unknown[];
  meta?: {
    filteredTotal?: number;
    total?: number;
  };
}

export function AdminContactView({ children, ...props }: AdminContactViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminContactResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "contact", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.CONTACT_SUBMISSIONS,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.submissions).map((item, index) => ({
        id: toStringValue(item.id, `msg-${index}`),
        primary: toStringValue(item.subject, "No subject"),
        secondary: [
          toStringValue(item.name, "Unknown"),
          toStringValue(item.email, ""),
        ].filter(Boolean).join(" · ") || "—",
        status: toStringValue(item.status, "new"),
        updatedAt: toRelativeDate((item as any).createdAt),
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
      title="Contact Submissions"
      subtitle="Review inbound contact form messages from users and visitors. Filter by status and search by subject or sender."
      searchPlaceholder="Search by subject, name, or email"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No contact submissions found"
      resultSummary={`Showing ${rows.length} of ${total} submissions`}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "new", "read", "resolved"],
          active: statusFilter || "All",
          onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
