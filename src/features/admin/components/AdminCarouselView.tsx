"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { HOMEPAGE_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminCarouselViewProps extends ListingViewShellProps {}

interface AdminCarouselResponse {
  data?: unknown;
  items?: unknown[];
  total?: number;
}

export function AdminCarouselView({
  children,
  ...props
}: AdminCarouselViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminCarouselResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "carousel", "listing"],
    endpoint: `${HOMEPAGE_ENDPOINTS.CAROUSEL}?includeInactive=true`,
    mapRows: (response) => {
      const sourceItems = Array.isArray(response.data)
        ? response.data
        : response.items;

      return toRecordArray(sourceItems).map((item, index) => {
        const orderValue =
          typeof item.order === "number" ? String(item.order) : "-";
        const mediaType = toStringValue((item.media as { type?: unknown } | undefined)?.type, "image");
        const linkUrl = toStringValue((item.link as { url?: unknown } | undefined)?.url, "no-link");

        return {
          id: toStringValue(item.id, `slide-${index}`),
          primary: toStringValue(item.title, `Carousel slide ${index + 1}`),
          secondary: `Order: ${orderValue} · Media: ${mediaType} · Link: ${linkUrl}`,
          status:
            typeof item.active === "boolean"
              ? item.active
                ? "Active"
                : "Inactive"
              : toStringValue(item.status, "Inactive"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        };
      });
    },
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
      title="Homepage Carousel"
      subtitle="Manage hero slide ordering, activation state, and destination links in one listing workflow."
      actionLabel="New slide"
      searchPlaceholder="Search slide titles or link URLs"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No carousel slides found"
      resultSummary={`Showing ${rows.length} of ${total} slides`}
    />
  );
}
