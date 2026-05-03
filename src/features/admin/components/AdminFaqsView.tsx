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

export interface AdminFaqsViewProps extends ListingViewShellProps {}

interface AdminFaqsResponse {
  items?: unknown[];
  total?: number;
}

export function AdminFaqsView({ children, ...props }: AdminFaqsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("");

  const filterParts: string[] = [];
  if (activeFilter === "Active") filterParts.push("isActive==true");
  else if (activeFilter === "Inactive") filterParts.push("isActive==false");
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminFaqsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "faqs", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.FAQS,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `faq-${index}`),
        primary: toStringValue(item.question, "Untitled question"),
        secondary: toStringValue(item.category, "Uncategorized"),
        status: toStringValue(typeof item.isActive === "boolean" ? (item.isActive ? "Published" : "Draft") : item.status, "Draft"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="FAQ Library"
      subtitle="Keep support answers organized by category, visibility, and homepage priority."
      actionLabel="New FAQ"
      searchPlaceholder="Search questions, categories, or tokens"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No FAQs found"
      resultSummary={`Showing ${rows.length} of ${total} FAQs`}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "Active", "Inactive"],
          active: activeFilter || "All",
          onSelect: (opt) => setActiveFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
