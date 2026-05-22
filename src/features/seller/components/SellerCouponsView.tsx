"use client";

import React, { useState, useCallback } from "react";
import { X, Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { BulkActionBar, Button, Div, ListingToolbar, Pagination, ListingViewShell, Text, useToast } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { CouponCard } from "../../promotions/components/CouponCard";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;
const FILTER_KEYS = ["isActive"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "code", label: "Code A–Z" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CouponRow {
  id: string;
  raw: Record<string, unknown>;
  isActive: boolean;
}

interface SellerCouponsResponse {
  coupons?: unknown[];
  total?: number;
}

export interface SellerCouponsViewProps extends ListingViewShellProps {
  onCreateClick?: () => void;
  onEditClick?: (couponId: string) => void;
  onToggle?: (couponId: string, currentlyActive: boolean) => Promise<void>;
  onDelete?: (couponId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIsActive(item: Record<string, unknown>): boolean {
  const validity = item.validity as Record<string, unknown> | undefined;
  return Boolean(validity?.isActive ?? item.isActive);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SellerCouponsView({
  onCreateClick,
  onEditClick,
  onToggle,
  onDelete,
  children,
  ...props
}: SellerCouponsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { q: "", sort: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => { table.set("q", searchInput.trim()); }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const isActiveRaw = table.get("isActive");
  const filters = isActiveRaw ? `isActive==${isActiveRaw}` : undefined;

  const { rows, total, isLoading, errorMessage, refetch } = useSellerListingData<
    SellerCouponsResponse,
    CouponRow
  >({
    queryKey: ["seller", "coupons", "listing"],
    endpoint: SELLER_ENDPOINTS.COUPONS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.coupons).map((item, index) => ({
        id: toStringValue(item.id, `coupon-${index}`),
        raw: item,
        isActive: getIsActive(item),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleEdit = useCallback((id: string) => { onEditClick?.(id); }, [onEditClick]);

  const handleToggle = useCallback(async (id: string, currentlyActive: boolean) => {
    if (!onToggle) return;
    setTogglingId(id);
    try { await onToggle(id, currentlyActive); refetch?.(); showToast("Coupon updated.", "success"); }
    catch (err) { showToast(err instanceof Error ? err.message : "Failed to update coupon.", "error"); }
    finally { setTogglingId(null); }
  }, [onToggle, refetch, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    try { await onDelete(id); refetch?.(); showToast("Coupon deleted.", "success"); }
    catch (err) { showToast(err instanceof Error ? err.message : "Failed to delete coupon.", "error"); }
    finally { setDeletingId(null); }
  }, [onDelete, refetch, showToast]);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  if (hasChildren) {
    return <ListingViewShell portal="seller" {...props}>{children}</ListingViewShell>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search by coupon code"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          onCreateClick
            ? (
                <Button size="sm" onClick={onCreateClick} className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Add Coupon</span>
                </Button>
              )
            : undefined
        }
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {errorMessage}
          </Div>
        )}
        {isLoading ? (
          <Div className="fluid-grid-card gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Div
                key={i}
                className="rounded-xl border-2 border-zinc-100 dark:border-slate-700 p-4 animate-pulse space-y-3"
              >
                <Div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
                <Div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                <Div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
              </Div>
            ))}
          </Div>
        ) : rows.length === 0 ? (
          <Div className="py-16 text-center">
            <Text className="text-zinc-400 dark:text-zinc-400">No coupons found — create your first coupon</Text>
          </Div>
        ) : (
          <Div className="fluid-grid-card gap-3">
            {rows.map((row) => (
              <CouponCard
                key={row.id}
                coupon={row.raw}
                onEdit={onEditClick ? handleEdit : undefined}
                onToggleActive={onToggle ? handleToggle : undefined}
                onDelete={onDelete ? handleDelete : undefined}
                className={togglingId === row.id || deletingId === row.id ? "pointer-events-none opacity-60" : undefined}
              />
            ))}
          </Div>
        )}
      </div>

      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-rose-500 transition-colors">Clear all</button>
                )}
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <div className="space-y-2">
                <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Status</Text>
                <div className="flex flex-wrap gap-2">
                  {[{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPendingFilters((p) => ({ ...p, isActive: opt.value }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        (pendingFilters.isActive || "") === opt.value
                          ? "bg-[var(--appkit-color-primary)] text-white border-[var(--appkit-color-primary)]"
                          : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-[var(--appkit-color-primary)] py-2.5 text-sm font-semibold text-white transition-colors active:scale-[0.98]">
                Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
