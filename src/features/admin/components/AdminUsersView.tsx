"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { FilterChipGroup, ListingToolbar, Pagination, ListingViewShell, RowActionMenu } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_USER_STATUS_TABS, ADMIN_USER_ROLE_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminUserEditorView } from "./AdminUserEditorView";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "role"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "displayName", label: "Name A–Z" },
];
const STATUS_OPTIONS = ADMIN_USER_STATUS_TABS;
const ROLE_OPTIONS = ADMIN_USER_ROLE_TABS;

interface AdminUsersResponse {
  users?: unknown[];
  total?: number;
  meta?: { total?: number };
}

interface UserRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminUsersViewProps extends ListingViewShellProps {}

export function AdminUsersView({ children, ...props }: AdminUsersViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string, next: boolean) =>
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id); else s.delete(id);
      return s;
    });
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<UserRow | null>(null);

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

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const filterParts: string[] = [];
  const statusRaw = table.get("status");
  if (statusRaw && statusRaw !== "All") {
    filterParts.push(statusRaw === "Active" ? "disabled==false" : "disabled==true");
  }
  const roleRaw = table.get("role");
  if (roleRaw && roleRaw !== "All") filterParts.push(`role==${roleRaw}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminUsersResponse, UserRow>({
    queryKey: ["admin", "users", "listing"],
    endpoint: ADMIN_ENDPOINTS.USERS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.users).map((item, index) => {
        const isDisabled = Boolean(item.isDisabled ?? item.disabled);
        const isHardBanned = isDisabled && Boolean(item.hardBanReason);
        const softBanCount = Array.isArray(item.softBans) ? item.softBans.length : 0;
        let status = "Active";
        if (isHardBanned) status = "Hard banned";
        else if (isDisabled) status = "Disabled";
        else if (softBanCount > 0) status = `Soft bans (${softBanCount})`;
        return {
          id: toStringValue(item.id ?? item.uid, `user-${index}`),
          primary: toStringValue(item.displayName, "Unnamed user"),
          secondary: [
            toStringValue(item.email, "No email"),
            toStringValue(item.role, "Unknown role"),
          ].join(" · "),
          status,
          updatedAt: toRelativeDate(item.lastLoginAt ?? item.createdAt),
          _raw: item,
        };
      }),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.total === "number") return response.meta.total;
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search users, email, or seller handles"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || DEFAULT_SORT}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => { table.set("sort", v); }}
          hideViewToggle
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
          </div>
        )}

        <div className="py-4 px-3 sm:px-4">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {errorMessage}
            </div>
          )}
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No users found"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={(next) =>
              setSelectedIds(next ? new Set(rows.map((r) => r.id)) : new Set())
            }
            renderRowActions={(row) => (
              <RowActionMenu actions={[{
                label: "Manage",
                onClick: () => { setSelectedRow(row as UserRow); setDrawerOpen(true); },
              }]} />
            )}
          />
        </div>

        {filterOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">Clear all</button>
                  )}
                  <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                <FilterChipGroup
                  label="Status"
                  tabs={STATUS_OPTIONS}
                  value={pendingFilters.status ?? ""}
                  onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
                />
                <FilterChipGroup
                  label="Role"
                  tabs={ROLE_OPTIONS}
                  value={pendingFilters.role ?? ""}
                  onChange={(id) => setPendingFilters((p) => ({ ...p, role: id }))}
                />
              </div>
              <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
                <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
                  Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AdminUserEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userId={selectedRow?.id}
        displayName={selectedRow?.primary}
        currentRole={toStringValue(selectedRow?._raw?.role, "user")}
        currentEmailVerified={Boolean(selectedRow?._raw?.emailVerified)}
        ownedStoreId={toStringValue(selectedRow?._raw?.storeId, "") || undefined}
        ownedStoreName={toStringValue(selectedRow?._raw?.storeName, "") || undefined}
        currentIsHardBanned={Boolean(
          (selectedRow?._raw?.isDisabled ?? selectedRow?._raw?.disabled) &&
            selectedRow?._raw?.hardBanReason,
        )}
        currentHardBanReason={toStringValue(selectedRow?._raw?.hardBanReason, "") || undefined}
        currentSoftBans={
          Array.isArray(selectedRow?._raw?.softBans)
            ? (selectedRow!._raw!.softBans as Array<Record<string, unknown>>).map((b) => ({
                action: toStringValue(b.action, ""),
                reason: toStringValue(b.reason, ""),
                bannedAt: toStringValue(
                  b.bannedAt instanceof Date
                    ? b.bannedAt.toISOString()
                    : (b.bannedAt as string | undefined),
                  "",
                ),
                expiresAt: b.expiresAt
                  ? toStringValue(
                      b.expiresAt instanceof Date
                        ? b.expiresAt.toISOString()
                        : (b.expiresAt as string | undefined),
                      "",
                    ) || null
                  : null,
                bannedBy: toStringValue(b.bannedBy, ""),
              }))
            : undefined
        }
      />
    </>
  );
}
