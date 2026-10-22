"use client";
import { normalizeError } from "../../../errors/normalize";
import type { JsonValue, JsonArray } from "@mohasinac/appkit/client";

import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Badge, ConfirmDeleteModal, Div, Row, RowActionMenu, Span, Text, useToast } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../constants/index";
import { toRecordArray, toStringValue } from "../hooks/useSellerListingData";
import { useOptimisticRowFlag } from "../../admin/hooks/useOptimisticRowFlag";
import { apiClient } from "../../../http";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

const CLS_TYPE_PILL = "inline-flex items-center rounded-full px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";

const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
  { value: "label", label: "Label A–Z" },
];

interface PayoutMethodRow {
  id: string;
  raw: Record<string, JsonValue>;
  label: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  maskedIdentifier: string;
}

interface PayoutMethodsResponse {
  items?: JsonArray;
  total?: number;
}

export interface SellerPayoutMethodsViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
}

function getMaskedIdentifier(item: Record<string, JsonValue>): string {
  if (item.upiVpa && typeof item.upiVpa === "string") {
    return item.upiVpa;
  }
  if (item.accountNumber && typeof item.accountNumber === "string") {
    const acc = item.accountNumber;
    return `••••${acc.slice(-4)}`;
  }
  return "—";
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Span className={CLS_TYPE_PILL}>
      {type === "upi" ? "UPI" : type === "bank" ? "Bank" : type.toUpperCase()}
    </Span>
  );
}

const COLUMNS: AdminTableColumn<PayoutMethodRow>[] = [
  {
    key: "label",
    header: "Method",
    render: (row) => (
      <Div>
        <Row align="center" gap="sm" wrap>
          <Text size="sm" weight="medium">{row.label}</Text>
          <TypeBadge type={row.type} />
          {row.isDefault && (
            <Span layout="inline-flex" color="success" surface="success-surface" size="xs" weight="medium" rounded="full" padding="pill-xs">
              Default
            </Span>
          )}
        </Row>
        <Text className="mt-1 font-mono" color="muted" size="xs">{row.maskedIdentifier}</Text>
      </Div>
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

export function SellerPayoutMethodsView({
  onCreateClick,
  onEditClick,
  onDelete,
  onSetDefault,
}: SellerPayoutMethodsViewProps) {
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
    mutate: (id, next) => apiClient.patch(SELLER_ENDPOINTS.PAYOUT_METHOD_BY_ID(id), { isActive: next }),
    invalidate: [["seller", "payout-methods", "listing"]],
    successMessage: (next) => (next ? "Payout method activated." : "Payout method deactivated."),
    errorMessage: "Could not change that payout method's status.",
  });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: SELLER_ENDPOINTS.PAYOUT_METHOD_BY_ID,
    deleteFn: onDelete,
    successMessage: "Payout method deleted.",
    fetchOptions: { credentials: "include" },
  });
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleDelete = useCallback(async (id: string) => {
    try {
      await performDelete(id);
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to delete payout method", "error");
    }
    setDeleteTargetId(null);
  }, [performDelete, showToast]);

  const handleSetDefault = useCallback(async (id: string) => {
    setSettingDefaultId(id);
    try {
      if (onSetDefault) {
        await onSetDefault(id);
      } else {
        await fetch(SELLER_ENDPOINTS.PAYOUT_METHOD_BY_ID(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isDefault: true }),
        });
      }
      showToast("Default payout method updated.", "success");
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to update default.", "error");
    } finally {
      setSettingDefaultId(null);
    }
  }, [onSetDefault, showToast]);

  const handleCreate = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else window.location.href = String(ROUTES.STORE.PAYOUT_METHODS_NEW);
  }, [onCreateClick]);

  const handleEdit = useCallback((id: string) => {
    if (onEditClick) onEditClick(id);
    else window.location.href = String(ROUTES.STORE.PAYOUT_METHODS_EDIT(id));
  }, [onEditClick]);

  const config: ListingViewConfig<PayoutMethodsResponse, PayoutMethodRow> = {
    portal: "seller",
    title: "Payout Methods",
    searchPlaceholder: "Search payout methods...",
    emptyLabel: "No payout methods yet — add a UPI VPA or bank account to receive payouts",
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "payout-methods", "listing"],
    endpoint: SELLER_ENDPOINTS.PAYOUT_METHODS,
    sortOptions: SORT_OPTIONS,
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `pm-${index}`),
        raw: item,
        label: String(item.label ?? ""),
        type: String(item.type ?? ""),
        isDefault: Boolean(item.isDefault),
        // Resolved through the pending override so the Status badge and the
        // row toggle cannot disagree between the click and the refetch.
        isActive: activeFlag.resolve(toStringValue(item.id, `pm-${index}`), Boolean(item.isActive)),
        maskedIdentifier: getMaskedIdentifier(item),
      })),
    getTotal: (response, mappedRows) => (typeof response.total === "number" ? response.total : mappedRows.length),
    buildFilters: () => undefined,
    primaryAction: { label: "New Method", onClick: handleCreate },
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
          ...(!row.isDefault
            ? [{ label: "Set as Default", disabled: settingDefaultId === row.id, onClick: () => handleSetDefault(row.id) }]
            : []),
          { label: "Edit", onClick: () => handleEdit(row.id) },
          {
            label: "Delete",
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
          title="Delete Payout Method"
          message="Are you sure you want to delete this payout method? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
