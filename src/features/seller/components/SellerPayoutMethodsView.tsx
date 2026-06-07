"use client";

import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import {
  Button,
  ConfirmDeleteModal,
  Div,
  ListingToolbar,
  Span,
  Text,
  useToast,
} from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";

const CLS_TYPE_PILL = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
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

interface PayoutMethodRow {
  id: string;
  raw: Record<string, unknown>;
  label: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  maskedIdentifier: string;
}

interface PayoutMethodsResponse {
  items?: unknown[];
  total?: number;
}

export interface SellerPayoutMethodsViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
}

function getMaskedIdentifier(item: Record<string, unknown>): string {
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
    <span className={CLS_TYPE_PILL}>
      {type === "upi" ? "UPI" : type === "bank" ? "Bank" : type.toUpperCase()}
    </span>
  );
}

export function SellerPayoutMethodsView({
  onCreateClick,
  onEditClick,
  onDelete,
  onSetDefault,
}: SellerPayoutMethodsViewProps) {
  const table = useUrlTable({ defaults: { sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: SELLER_ENDPOINTS.PAYOUT_METHOD_BY_ID,
    deleteFn: onDelete,
    successMessage: "Payout method deleted.",
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
    PayoutMethodsResponse,
    PayoutMethodRow
  >({
    queryKey: ["seller", "payout-methods"],
    endpoint: SELLER_ENDPOINTS.PAYOUT_METHODS,
    page: 1,
    pageSize: PAGE_SIZE,
    sorts: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `pm-${index}`),
        raw: item,
        label: String(item.label ?? ""),
        type: String(item.type ?? ""),
        isDefault: Boolean(item.isDefault),
        isActive: Boolean(item.isActive),
        maskedIdentifier: getMaskedIdentifier(item),
      })),
  });

  const handleDelete = useCallback(async (id: string) => {
    await performDelete(id);
    setDeleteTargetId(null);
  }, [performDelete]);

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
      refetch?.();
      showToast("Default payout method updated.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update default.", "error");
    } finally {
      setSettingDefaultId(null);
    }
  }, [onSetDefault, refetch, showToast]);

  const handleCreate = useCallback(() => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      window.location.href = String(ROUTES.STORE.PAYOUT_METHODS_NEW);
    }
  }, [onCreateClick]);

  const handleEdit = useCallback((id: string) => {
    if (onEditClick) {
      onEditClick(id);
    } else {
      window.location.href = String(ROUTES.STORE.PAYOUT_METHODS_EDIT(id));
    }
  }, [onEditClick]);

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={0}
        searchValue={searchInput}
        searchPlaceholder="Search payout methods..."
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
            <span>New Method</span>
          </Button>
        }
      />

      <Div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
            {errorMessage}
          </Div>
        )}
        {isLoading ? (
          <Div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-zinc-100 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800"
              />
            ))}
          </Div>
        ) : rows.length === 0 ? (
          <Div className="py-16 text-center">
            <Text className="text-zinc-400 dark:text-zinc-400">
              No payout methods yet — add a UPI VPA or bank account to receive payouts
            </Text>
            <Div className="mt-4">
              <Button size="sm" onClick={handleCreate}>
                Add payout method
              </Button>
            </Div>
          </Div>
        ) : (
          <Div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
              >
                <Div className="flex items-start justify-between gap-4">
                  <Div className="flex items-start gap-3 min-w-0">
                    <Div className="min-w-0 flex-1">
                      <Div className="flex items-center gap-2 flex-wrap">
                        <Text className="text-sm font-medium">{row.label}</Text>
                        <TypeBadge type={row.type} />
                        {row.isDefault && (
                          <Span size="xs" weight="medium" className="inline-flex items-center rounded-full px-2 py-0.5 bg-success-surface text-success">
                            Default
                          </Span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.isActive
                              ? "bg-success-surface text-success"
                              : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      </Div>
                      <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {row.maskedIdentifier}
                      </Text>
                    </Div>
                  </Div>
                  <Div className="flex items-center gap-2 shrink-0">
                    {!row.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={settingDefaultId === row.id}
                        onClick={() => handleSetDefault(row.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(row.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={deletingId === row.id}
                      onClick={() => setDeleteTargetId(row.id)}
                    >
                      Delete
                    </Button>
                  </Div>
                </Div>
              </div>
            ))}
          </Div>
        )}
      </Div>

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
    </Div>
  );
}
