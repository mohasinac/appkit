"use client";

import { normalizeError } from "../../../errors/normalize";
import { Badge, sortBy, type JsonArray } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { ConfirmDeleteModal, Div, RowActionMenu, Text, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ROUTES } from "../../../next";
import { toRecordArray, toStringValue } from "../hooks/useSellerListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig, ListingSelectionContext } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

const DEFAULT_SORT = "displayOrder";
const SORT_OPTIONS = [
  { value: sortBy("displayOrder", "ASC"), label: "Display Order" },
  { value: "label", label: "Label A–Z" },
  { value: sortBy("label", "DESC"), label: "Label Z–A" },
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
];

interface CategoryRow {
  id: string;
  raw: Record<string, JsonValue>;
  label: string;
  slug: string;
  productCount: number;
  isActive: boolean;
}

interface StoreCategoriesResponse {
  items?: JsonArray;
  total?: number;
}

export interface SellerStoreCategoriesViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkActivate?: (ids: string[]) => Promise<void>;
  onBulkDeactivate?: (ids: string[]) => Promise<void>;
}

const COLUMNS: AdminTableColumn<CategoryRow>[] = [
  {
    key: "label",
    header: "Label",
    render: (row) => (
      <Div>
        <Text size="sm" weight="medium">{row.label}</Text>
        <Text className="text-[var(--appkit-color-text-muted)]" size="xs">/{row.slug}</Text>
      </Div>
    ),
  },
  {
    key: "productCount",
    header: "Products",
    render: (row) => <Text className="tabular-nums" size="sm">{row.productCount}</Text>,
  },
  {
    key: "isActive",
    header: "Status",
    render: (row) => (
      <Badge variant={row.isActive ? "active" : "inactive"} size="xs">
        {row.isActive ? "Active" : "Hidden"}
      </Badge>
    ),
  },
];

export function SellerStoreCategoriesView({
  onCreateClick,
  onEditClick,
  onDelete,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
}: SellerStoreCategoriesViewProps) {
  const { showToast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    deleteFn: onDelete,
    successMessage: "Category deleted.",
  });

  const handleDelete = useCallback(async (id: string) => {
    if (!onDelete) return;
    try {
      await performDelete(id);
    } catch (err) {
      void normalizeError(err);
      showToast(err instanceof Error ? err.message : "Failed to delete category", "error");
    }
    setDeleteTargetId(null);
  }, [onDelete, performDelete, showToast]);

  const handleNavigateNew = () => {
    if (onCreateClick) { onCreateClick(); return; }
    window.location.href = String(ROUTES.STORE.STORE_CATEGORIES_NEW);
  };

  const config: ListingViewConfig<StoreCategoriesResponse, CategoryRow> = {
    portal: "seller",
    title: "Store Categories",
    searchPlaceholder: "Search categories by label...",
    emptyLabel: "No categories yet — add your first storefront category",
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "store-categories", "listing"],
    endpoint: SELLER_ENDPOINTS.STORE_CATEGORIES,
    sortOptions: SORT_OPTIONS,
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `cat-${index}`),
        raw: item,
        label: String(item.label ?? ""),
        slug: String(item.slug ?? ""),
        productCount: Number((item.productIds as unknown[])?.length ?? 0),
        isActive: Boolean(item.isActive),
      })),
    getTotal: (response, rows) => (typeof response.total === "number" ? response.total : rows.length),
    buildFilters: () => undefined,
    primaryAction: { label: "New Category", onClick: handleNavigateNew },
    buildBulkActions: (selection: ListingSelectionContext<CategoryRow>) => {
      const actions: BulkActionItem[] = [
        ...(onBulkDelete ? [buildBulkAction(ACTIONS.STORE["delete-listing"], async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); })] : []),
        ...(onBulkActivate ? [buildBulkAction(ACTIONS.ADMIN["activate-bundle"], async () => { await onBulkActivate(selection.selectedIds); selection.clearSelection(); })] : []),
        ...(onBulkDeactivate ? [buildBulkAction(ACTIONS.ADMIN["deactivate-bundle"], async () => { await onBulkDeactivate(selection.selectedIds); selection.clearSelection(); })] : []),
      ];
      return actions;
    },
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.STORE["edit-listing"].label,
            onClick: () => onEditClick
              ? onEditClick(row.id)
              : (window.location.href = String(ROUTES.STORE.STORE_CATEGORIES_EDIT(row.id))),
          },
          ...(onDelete ? [{
            label: ACTIONS.STORE["delete-listing"].label,
            destructive: true,
            onClick: () => setDeleteTargetId(row.id),
            disabled: deletingId === row.id,
          }] : []),
        ]}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Category"
          message="Are you sure you want to delete this category? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
