"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminCartsViewProps extends ListingViewShellProps {}

interface AdminCartsResponse {
  items?: unknown[];
  total?: number;
}

interface CartRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminCartsView({ children, ...props }: AdminCartsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminCartsResponse,
    CartRow
  >({
    queryKey: ["admin", "carts", "listing", q, typeFilter],
    endpoint: ADMIN_ENDPOINTS.ADMIN_CARTS,
    q,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const isGuest = !item.userId;
        if (typeFilter === "guest" && !isGuest) return null as unknown as CartRow;
        if (typeFilter === "auth" && isGuest) return null as unknown as CartRow;
        const itemCount = Array.isArray(item.items) ? (item.items as unknown[]).length : 0;
        const sessionShort = toStringValue(item.sessionId, "").slice(0, 8);
        return {
          id: toStringValue(item.id, `cart-${index}`),
          primary: isGuest
            ? `Guest · ${sessionShort || "—"}`
            : toStringValue(item.userId, `user-${index}`),
          secondary: `${itemCount} item${itemCount !== 1 ? "s" : ""}`,
          status: isGuest ? "Guest" : "Authenticated",
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        };
      }).filter(Boolean) as CartRow[],
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
      title="Abandoned Carts"
      subtitle="Analyse cart activity to identify abandoned cart patterns across guest and authenticated users."
      searchPlaceholder="Search by user ID or session"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No carts found"
      resultSummary={`Showing ${rows.length} of ${total} carts`}
      filterGroups={[
        {
          title: "Type",
          options: ["All", "guest", "auth"],
          active: typeFilter || "All",
          onSelect: (opt) => setTypeFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
