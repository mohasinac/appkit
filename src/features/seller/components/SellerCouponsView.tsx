"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { AdminListingScaffold } from "../../admin/components/AdminListingScaffold";

export interface SellerCouponsViewProps extends ListingViewShellProps {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
}

interface SellerCouponsResponse {
  coupons?: unknown[];
  total?: number;
}

export function SellerCouponsView({
  renderHeader,
  children,
  ...props
}: SellerCouponsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerCouponsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["seller", "coupons", "listing"],
    endpoint: SELLER_ENDPOINTS.COUPONS,
    mapRows: (response) =>
      toRecordArray(response.coupons).map((item, index) => ({
        id: toStringValue(item.id, `coupon-${index}`),
        primary: toStringValue(item.code, "Untitled coupon"),
        secondary: [
          toStringValue(item.discountType === "percentage" ? `${item.discountValue}%` : `₹${item.discountValue}`, "No discount"),
          `Expires: ${toRelativeDate(item.expiresAt)}`,
        ].join(" · "),
        status: item.isActive ? "Active" : "Inactive",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="seller" {...props}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="seller"
      {...props}
      title="Coupons"
      subtitle="Create and manage discount codes for your customers"
      actionLabel="New Coupon"
      searchPlaceholder="Search coupons by code"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No coupons found"
      resultSummary={`Showing ${rows.length} of ${total} coupons`}
    />
  );
}
