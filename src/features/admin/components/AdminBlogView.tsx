"use client";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { FilterChipGroup, ListingLayout } from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BLOG_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminBlogEditorView } from "./AdminBlogEditorView";

const FEATURED_TABS = [
  { id: "", label: "All" },
  { id: "true", label: "Featured only" },
] as const;

interface AdminBlogResponse {
  posts?: JsonArray;
  meta?: { filteredTotal?: number; total?: number };
}

interface BlogRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export type AdminBlogViewProps = ListingLayoutProps;

export function AdminBlogView({ children, ...props }: AdminBlogViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminBlogResponse, BlogRow> = {
    portal: "admin",
    title: "Blog Posts",
    searchPlaceholder: "Search articles, authors, or tags",
    emptyLabel: "No blog posts found",
    filterKeys: ["status", "isFeatured"],
    defaultSort: sortBy("publishedAt", "DESC"),
    queryKey: ["admin", "blog", "listing"],
    endpoint: ADMIN_ENDPOINTS.BLOG,
    sortOptions: [
      { value: sortBy("publishedAt", "DESC"), label: "Latest" },
      { value: "publishedAt", label: "Oldest" },
      { value: sortBy("createdAt", "DESC"), label: "Newest draft" },
      { value: "title", label: "Title A–Z" },
    ],
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
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
    buildFilters: (state) => {
      const filterParts: string[] = [];
      if (state.status && state.status !== "All") filterParts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      if (state.isFeatured === "true") filterParts.push("isFeatured==true");
      return filterParts.join(",") || undefined;
    },
    primaryAction: {
      label: "New Post",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: "publish",
        label: ACTIONS.ADMIN["publish-blog"].label,
        variant: "primary",
        onClick: () => selection.clearSelection(),
      },
      {
        id: "draft",
        label: ACTIONS.ADMIN["draft-blog"].label,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_BLOG_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        <FilterChipGroup
          label="Featured"
          tabs={FEATURED_TABS}
          value={pendingFilters.isFeatured ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, isFeatured: id }))}
          allId=""
        />
      </>
    ),
    renderEditor: ({ editId, closePanel }) => (
      <AdminBlogEditorView
        postId={editId ?? undefined}
        onSaved={closePanel}
        onDeleted={closePanel}
        embedded
      />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "New Post" : "Edit Post"),
  };

  return <DataListingView config={config} />;
}
