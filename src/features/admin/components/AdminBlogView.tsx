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

export interface AdminBlogViewProps extends ListingViewShellProps {}

interface AdminBlogResponse {
  posts?: unknown[];
  meta?: {
    filteredTotal?: number;
    total?: number;
  };
}

export function AdminBlogView({ children, ...props }: AdminBlogViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminBlogResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "blog", "listing"],
    endpoint: ADMIN_ENDPOINTS.BLOG,
    mapRows: (response) =>
      toRecordArray(response.posts).map((item, index) => ({
        id: toStringValue(item.id, `post-${index}`),
        primary: toStringValue(item.title, "Untitled post"),
        secondary: [
          toStringValue(item.authorName, "Unknown author"),
          toStringValue(item.category, "Uncategorized"),
        ].join(" · "),
        status: toStringValue(item.status, "Draft"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") {
        return response.meta.filteredTotal;
      }
      if (typeof response.meta?.total === "number") {
        return response.meta.total;
      }
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
      title="Blog Publishing"
      subtitle="Manage editorial drafts, featured placement, and publish readiness in the shared listing frame."
      actionLabel="New article"
      searchPlaceholder="Search articles, authors, or tags"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No blog posts found"
      resultSummary={`Showing ${rows.length} of ${total} posts`}
    />
  );
}
