"use client";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import type { JsonValue, JsonArray } from "@mohasinac/appkit/client";

import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Badge } from "../../../ui/components/Badge";
import { ConfirmDeleteModal } from "../../../ui/components/ConfirmDeleteModal";
import { Div } from "../../../ui/components/Div";
import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { Span, Text } from "../../../ui/components/Typography";
import { useToast } from "../../../ui/components/toast-context";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../../constants/index";
import { toRecordArray, toStringValue } from "../hooks/useSellerListingData";
import { useOptimisticRowFlag } from "../../admin/hooks/useOptimisticRowFlag";
import { apiClient } from "../../../http";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
  { value: "label", label: "Label A–Z" },
];

interface ShippingConfigRow {
  id: string;
  raw: Record<string, JsonValue>;
  label: string;
  method: string;
  estimatedDays: number | null;
  isDefault: boolean;
  isActive: boolean;
}

interface ShippingConfigsResponse {
  items?: JsonArray;
  total?: number;
}

export interface SellerShippingConfigsViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
}

const COLUMNS: AdminTableColumn<ShippingConfigRow>[] = [
  {
    key: "label",
    header: "Name",
    render: (row) => (
      <Div>
        <Text size="sm" weight="medium">{row.label}</Text>
        {row.isDefault && (
          <Span layout="inline-flex" color="success" surface="success-surface" size="xs" weight="medium" className="mt-[0.125rem] px-[0.375rem] py-[1px]" rounded="full">
            Default
          </Span>
        )}
      </Div>
    ),
  },
  {
    key: "method",
    header: "Method",
    render: (row) => (
      <Span layout="inline-flex" size="xs" weight="medium" rounded="full" padding="pill-xs" surface="subtle" color="muted" transform="capitalize">
        {row.method.replace(/_/g, " ")}
      </Span>
    ),
  },
  {
    key: "estimatedDays",
    header: "Est. Days",
    render: (row) => (
      <Text className="tabular-nums" size="sm">
        {row.estimatedDays !== null ? `${row.estimatedDays}d` : "—"}
      </Text>
    ),
  },
  {
    key: "isActive",
    header: "Status",
    render: (row) => (
      <Badge variant={row.isActive ? "active" : "inactive"} size="xs">
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export function SellerShippingConfigsView({
  onCreateClick,
  onEditClick,
  onDelete,
  onSetDefault,
}: SellerShippingConfigsViewProps) {
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
    mutate: (id, next) => apiClient.patch(SELLER_ENDPOINTS.SHIPPING_CONFIG_BY_ID(id), { isActive: next }),
    invalidate: [["seller", "shipping-configs", "listing"]],
    successMessage: (next) => (next ? "Shipping option activated." : "Shipping option deactivated."),
    errorMessage: "Could not change that shipping option's status.",
  });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: SELLER_ENDPOINTS.SHIPPING_CONFIG_BY_ID,
    deleteFn: onDelete,
    successMessage: "Shipping config deleted.",
    fetchOptions: { credentials: "include" },
  });
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleDelete = useCallback(async (id: string) => {
    try {
      await performDelete(id);
    } catch (err) {
      const e = normalizeError(err);
      showToast(
        toUserMessage(e.code, undefined, { fallback: "Failed to delete shipping config." }),
        "error",
      );
    }
    setDeleteTargetId(null);
  }, [performDelete, showToast]);

  const handleSetDefault = useCallback(async (id: string) => {
    setSettingDefaultId(id);
    try {
      if (onSetDefault) {
        await onSetDefault(id);
      } else {
        await fetch(SELLER_ENDPOINTS.SHIPPING_CONFIG_BY_ID(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isDefault: true }),
        });
      }
      showToast("Default shipping config updated.", "success");
    } catch (err) {
      const e = normalizeError(err);
      showToast(
        toUserMessage(e.code, undefined, { fallback: "Failed to update default." }),
        "error",
      );
    } finally {
      setSettingDefaultId(null);
    }
  }, [onSetDefault, showToast]);

  const handleCreate = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else window.location.href = String(ROUTES.STORE.SHIPPING_CONFIGS_NEW);
  }, [onCreateClick]);

  const handleEdit = useCallback((id: string) => {
    if (onEditClick) onEditClick(id);
    else window.location.href = String(ROUTES.STORE.SHIPPING_CONFIGS_EDIT(id));
  }, [onEditClick]);

  const config: ListingViewConfig<ShippingConfigsResponse, ShippingConfigRow> = {
    portal: "seller",
    title: "Shipping Configs",
    searchPlaceholder: "Search shipping configs...",
    emptyLabel: "No shipping configs yet — define your first shipping rule",
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "shipping-configs", "listing"],
    endpoint: SELLER_ENDPOINTS.SHIPPING_CONFIGS,
    sortOptions: SORT_OPTIONS,
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `sc-${index}`),
        raw: item,
        label: String(item.label ?? ""),
        method: String(item.method ?? ""),
        estimatedDays: typeof item.estimatedDays === "number" ? item.estimatedDays : null,
        isDefault: Boolean(item.isDefault),
        // Resolved through the pending override so the Status badge and the
        // row toggle cannot disagree between the click and the refetch.
        isActive: activeFlag.resolve(toStringValue(item.id, `sc-${index}`), Boolean(item.isActive)),
      })),
    getTotal: (response, mappedRows) => (typeof response.total === "number" ? response.total : mappedRows.length),
    buildFilters: () => undefined,
    primaryAction: { label: "New Config", onClick: handleCreate },
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
          { label: ACTIONS.STORE["edit-listing"].label, onClick: () => handleEdit(row.id) },
          ...(!row.isDefault
            ? [{ label: "Set as Default", disabled: settingDefaultId === row.id, onClick: () => handleSetDefault(row.id) }]
            : []),
          {
            label: ACTIONS.STORE["delete-listing"].label,
            destructive: true,
            onClick: () => setDeleteTargetId(row.id),
            disabled: deletingId === row.id,
          },
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
          title="Delete Shipping Config"
          message="Are you sure you want to delete this shipping configuration? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
