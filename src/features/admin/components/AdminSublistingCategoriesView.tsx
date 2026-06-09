"use client";

import { sortBy } from "@mohasinac/appkit";
import React from "react";
import type { BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface SublistingCategoriesResponse {
  items?: unknown[];
  total?: number;
}

interface SublistingRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

interface AdminSublistingCategoriesViewProps {
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function AdminSublistingCategoriesView({
  onBulkDelete,
}: AdminSublistingCategoriesViewProps) {
  const config: ListingViewConfig<SublistingCategoriesResponse, SublistingRow> = {
    portal: "admin",
    title: "Sub-listing Categories",
    searchPlaceholder: "Search sub-listing categories…",
    emptyLabel: "No sub-listing categories found",
    filterKeys: [],
    defaultSort: sortBy("name", "ASC"),
    queryKey: ["admin", "sublisting-categories", "listing"],
    endpoint: ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES,
    sortOptions: [
      { value: sortBy("name", "ASC"), label: "Name A–Z" },
      { value: sortBy("name", "DESC"), label: "Name Z–A" },
      { value: sortBy("productCount", "DESC"), label: "Most listings" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `sc-${index}`),
        primary: toStringValue(item.name, "Untitled"),
        secondary: [
          item.itemCode ? `Code: ${item.itemCode}` : "",
          `${typeof item.productCount === "number" ? item.productCount : 0} listing${
            item.productCount === 1 ? "" : "s"
          }`,
        ]
          .filter(Boolean)
          .join(" · "),
        status: "",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: () => undefined,
    buildBulkActions: onBulkDelete
      ? (selection): BulkActionItem[] => [
          buildBulkAction(ACTIONS.ADMIN["delete-sublisting-category"], async () => {
            await onBulkDelete(selection.selectedIds);
            selection.clearSelection();
          }),
        ]
      : undefined,
  };

  return <DataListingView config={config} />;
}
