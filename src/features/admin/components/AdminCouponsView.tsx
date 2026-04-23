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

export interface AdminCouponsViewProps extends ListingViewShellProps {}

interface AdminCouponsResponse {
  items?: unknown[];
  total?: number;
}

export function AdminCouponsView({ children, ...props }: AdminCouponsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminCouponsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "coupons", "listing"],
    endpoint: ADMIN_ENDPOINTS.COUPONS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `coupon-${index}`),
        primary: toStringValue(item.code, "Unknown code"),
        secondary: [
          toStringValue(item.name, "Untitled campaign"),
          toStringValue(item.type, "Unknown type"),
        ].join(" · "),
        status: toStringValue(
          ((item.validity as { isActive?: boolean } | undefined)?.isActive
            ? "Active"
            : item.status),
          "Inactive",
        ),
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
      title="Coupons & Promotions"
      subtitle="Monitor campaign status, stacking rules, and expiry windows from a single control table."
      actionLabel="Create coupon"
      searchPlaceholder="Search codes, campaigns, or seller scopes"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No coupons found"
      resultSummary={`Showing ${rows.length} of ${total} coupons`}
    />
  );
}
