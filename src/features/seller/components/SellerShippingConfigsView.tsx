"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import {
  Button,
  ConfirmDeleteModal,
  DataTable,
  Div,
  ListingToolbar,
  RowActionMenu,
  Text,
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
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
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
        <Text className="text-sm font-medium">{row.label}</Text>
        {row.isDefault && (
          <span className="mt-0.5 inline-flex items-center rounded-full px-1.5 py-px text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Default
          </span>
        )}
      </Div>
    ),
  },
  {
    key: "method",
    header: "Method",
    render: (row) => (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400 capitalize">
        {row.method.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "estimatedDays",
    header: "Est. Days",
    render: (row) => (
      <Text className="text-sm tabular-nums">
        {row.estimatedDays !== null ? `${row.estimatedDays}d` : "—"}
      </Text>
    ),
  },
  {
    key: "isActive",
    header: "Status",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          row.isActive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.isActive ? "Active" : "Inactive"}
      </span>
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

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
    setDeletingId(id);
    try {
      if (onDelete) {
        await onDelete(id);
      } else {
        await fetch(SELLER_ENDPOINTS.SHIPPING_CONFIG_BY_ID(id), {
          method: "DELETE",
          credentials: "include",
        });
      }
      refetch?.();
    } finally {
      setDeletingId(null);
      setDeleteTargetId(null);
    }
  }, [onDelete, refetch]);

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
    } finally {
      setSettingDefaultId(null);
    }
  }, [onSetDefault, refetch]);

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
    <div className="min-h-screen">
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
            <span>New Config</span>
          </Button>
        }
      />

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {errorMessage}
          </Div>
        )}
        {isLoading ? (
          <Div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Div
                key={i}
                className="h-14 animate-pulse rounded-xl border border-zinc-100 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800"
              />
            ))}
          </Div>
        ) : rows.length === 0 ? (
          <Div className="py-16 text-center">
            <Text className="text-zinc-400 dark:text-zinc-400">
              No shipping configs yet — define your first shipping rule
            </Text>
            <div className="mt-4">
              <Button size="sm" onClick={handleCreate}>
                Add shipping config
              </Button>
            </div>
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
      </div>

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
    </div>
  );
}
