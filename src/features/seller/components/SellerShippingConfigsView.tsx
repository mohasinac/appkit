"use client";
import { normalizeError } from "../../../errors/normalize";

import { Stack, sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import {
  Button,
  ConfirmDeleteModal,
  DataTable,
  Div,
  ListingToolbar,
  RowActionMenu,
  Span,
  Text,
  useToast,
} from "../../../ui";
import type { DataTableColumn } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../..";
import {
  toRecordArray,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { TABLE_KEYS } from "../../../constants/table-keys";

const PAGE_SIZE = 50;
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
  { value: "label", label: "Label A–Z" },
];

interface ShippingConfigRow {
  id: string;
  raw: Record<string, unknown>;
  label: string;
  method: string;
  estimatedDays: number | null;
  isDefault: boolean;
  isActive: boolean;
}

interface ShippingConfigsResponse {
  items?: unknown[];
  total?: number;
}

export interface SellerShippingConfigsViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
}

const COLUMNS: DataTableColumn<ShippingConfigRow>[] = [
  {
    key: "label",
    header: "Name",
    render: (row) => (
      <Div>
        <Text size="sm" weight="medium">{row.label}</Text>
        {row.isDefault && (
          <Span size="xs" weight="medium" className="mt-0.5 inline-flex items-center px-1.5 py-px bg-success-surface text-success" rounded="full">
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
      <Span size="xs" weight="medium" className="inline-flex items-center py-0.5" rounded="full" padding="x-xs" surface="subtle" color="muted" transform="capitalize">
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
      <Span
        className={`inline-flex items-center py-0.5 ${ row.isActive ? "bg-success-surface text-success" : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400" }`} size="xs" weight="medium" rounded="full" padding="x-xs"
      >
        {row.isActive ? "Active" : "Inactive"}
      </Span>
    ),
  },
];

export function SellerShippingConfigsView({
  onCreateClick,
  onEditClick,
  onDelete,
  onSetDefault,
}: SellerShippingConfigsViewProps) {
  const table = useUrlTable({ defaults: { sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: SELLER_ENDPOINTS.SHIPPING_CONFIG_BY_ID,
    deleteFn: onDelete,
    successMessage: "Shipping config deleted.",
    onSuccess: () => { refetch?.(); },
    fetchOptions: { credentials: "include" },
  });
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const { showToast } = useToast();

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const resetAll = useCallback(() => {
    table.setMany({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "" });
    setSearchInput("");
  }, [table]);

  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) || table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT;

  const { rows, isLoading, errorMessage, refetch } = useSellerListingData<
    ShippingConfigsResponse,
    ShippingConfigRow
  >({
    queryKey: ["seller", "shipping-configs"],
    endpoint: SELLER_ENDPOINTS.SHIPPING_CONFIGS,
    page: 1,
    pageSize: PAGE_SIZE,
    sorts: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `sc-${index}`),
        raw: item,
        label: String(item.label ?? ""),
        method: String(item.method ?? ""),
        estimatedDays:
          typeof item.estimatedDays === "number" ? item.estimatedDays : null,
        isDefault: Boolean(item.isDefault),
        isActive: Boolean(item.isActive),
      })),
  });

  const handleDelete = useCallback(async (id: string) => {
    // toast-handled-by-hook (useEntityDelete)
    await performDelete(id);
    setDeleteTargetId(null);
  }, [performDelete]);

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
      refetch?.();
      showToast("Default shipping config updated.", "success");
    } catch (err) {
      void normalizeError(err);
      showToast(err instanceof Error ? err.message : "Failed to update default.", "error");
    } finally {
      setSettingDefaultId(null);
    }
  }, [onSetDefault, refetch, showToast]);

  const handleCreate = useCallback(() => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      window.location.href = String(ROUTES.STORE.SHIPPING_CONFIGS_NEW);
    }
  }, [onCreateClick]);

  const handleEdit = useCallback((id: string) => {
    if (onEditClick) {
      onEditClick(id);
    } else {
      window.location.href = String(ROUTES.STORE.SHIPPING_CONFIGS_EDIT(id));
    }
  }, [onEditClick]);

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={0}
        searchValue={searchInput}
        searchPlaceholder="Search shipping configs..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button size="sm" onClick={handleCreate} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <Span>New Config</Span>
          </Button>
        }
      />

      <Div className="px-3 sm:px-4" padding="y-md">
        {errorMessage && (
          <Div className="mb-4 border border-error/20 px-4 text-sm text-error" surface="danger-surface" padding="y-sm" rounded="xl">
            {errorMessage}
          </Div>
        )}
        {isLoading ? (
          <Stack gap="sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <Div
                key={i}
                className="h-14 animate-pulse dark:border-slate-700" border="subtle" surface="muted" rounded="xl"
              />
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          <Div className="text-center" padding="y-4xl">
            <Text color="faint">
              No shipping configs yet — define your first shipping rule
            </Text>
            <Div className="mt-4">
              <Button size="sm" onClick={handleCreate}>
                Add shipping config
              </Button>
            </Div>
          </Div>
        ) : (
          <DataTable
            columns={COLUMNS}
            data={rows}
            keyExtractor={(r) => r.id}
            actions={(row) => (
              <RowActionMenu
                actions={[
                  {
                    label: ACTIONS.STORE["edit-listing"].label,
                    onClick: () => handleEdit(row.id),
                  },
                  ...(!row.isDefault
                    ? [
                        {
                          label: "Set as Default",
                          disabled: settingDefaultId === row.id,
                          onClick: () => handleSetDefault(row.id),
                        },
                      ]
                    : []),
                  {
                    label: ACTIONS.STORE["delete-listing"].label,
                    destructive: true,
                    onClick: () => setDeleteTargetId(row.id),
                    disabled: deletingId === row.id,
                  },
                ]}
              />
            )}
          />
        )}
      </Div>

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
    </Div>
  );
}
