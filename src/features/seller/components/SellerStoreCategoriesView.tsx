"use client";

import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { Badge, sortBy, type JsonArray } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { ConfirmDeleteModal } from "../../../ui/components/ConfirmDeleteModal";
import { Div } from "../../../ui/components/Div";
import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { Text } from "../../../ui/components/Typography";
import { useToast } from "../../../ui/components/toast-context";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ROUTES } from "../../../next/routing/route-map";
import { toRecordArray, toStringValue } from "../hooks/useSellerListingData";
import { useOptimisticRowFlag } from "../../admin/hooks/useOptimisticRowFlag";
import { apiClient } from "../../../http";
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
  /*
   * 🛑 `isActive` was a READ-ONLY badge here, and the update schema was built
   * to take it on its own — shipping-config's even says so in a comment: "a
   * PATCH may legitimately carry only `isActive`". Nothing in the client had
   * ever sent one, so flipping one boolean meant a full-editor round trip.
   *
   * The optimistic/rollback logic lives in the hook because eight listings
   * grew this control at once; see its header for why rollback must DELETE
   * the override key rather than write back a captured value.
   */
  const activeFlag = useOptimisticRowFlag<boolean>({
    mutate: (id, next) => apiClient.patch(SELLER_ENDPOINTS.STORE_CATEGORY_BY_ID(id), { isActive: next }),
    invalidate: [["seller", "store-categories", "listing"]],
    successMessage: (next) => (next ? "Category activated." : "Category deactivated."),
    errorMessage: "Could not change that category's status.",
  });

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
      const e = normalizeError(err);
      showToast(
        toUserMessage(e.code, undefined, { fallback: "Failed to delete category." }),
        "error",
      );
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
    // Search intentionally absent: this endpoint does not read `q`, so the box accepted typing and changed nothing. Restore it when the collection gains searchTxt — audit-listing-search-capability tracks it.
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
        // Resolved through the pending override so the Status badge and the
        // row toggle cannot disagree between the click and the refetch.
        isActive: activeFlag.resolve(toStringValue(item.id, `cat-${index}`), Boolean(item.isActive)),
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
          /*
           * 🛑 `isActive` was a read-only badge and the update schema was
           * built to accept it alone. A menu entry rather than a switch here,
           * to match the other actions in this menu — the menu is already
           * click-stopped in all three renderers.
           */
          {
            label: row.isActive ? "Deactivate" : "Activate",
            separator: true,
            disabled: activeFlag.pendingId === row.id,
            onClick: () => { void activeFlag.set(row.id, !row.isActive); },
          },
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
