"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, Button, FilterChipGroup, Form, FormActions, Input, ListingToolbar, Modal, Pagination, ListingViewShell, RowActionMenu, Text as AppText, useToast } from "../../../ui";
import type { ListingViewShellProps, BulkActionItem } from "../../../ui";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_USER_STATUS_TABS, ADMIN_USER_ROLE_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { apiClient } from "../../../http";
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

interface UsersFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function UsersFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: UsersFilterDrawerProps) {
  if (!filterOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
      <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">Clear all</button>
            )}
            <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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
  );
}

export function AdminUsersView({ children, ...props }: AdminUsersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const toast = useToast();
  const queryClient = useQueryClient();

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<UserRow | null>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");

  const banUser = useMutation({
    mutationFn: () => {
      if (!banTargetId) throw new Error("No user selected");
      return apiClient.post(ADMIN_ENDPOINTS.USER_HARD_BAN(banTargetId), { reason: banReason.trim() });
    },
    onSuccess: () => {
      toast.showToast("User has been banned.", "success");
      setBanModalOpen(false);
      setBanTargetId(null);
      setBanReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users", "listing"] });
    },
    onError: () => { toast.showToast("Failed to ban user.", "error"); },
  });

  const unbanUser = useMutation({
    mutationFn: (uid: string) => apiClient.post(ADMIN_ENDPOINTS.USER_UNBAN(uid), {}),
    onSuccess: () => {
      toast.showToast("Ban lifted.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users", "listing"] });
    },
    onError: () => { toast.showToast("Failed to lift ban.", "error"); },
  });

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

  const selection = useBulkSelection({ items: rows, keyExtractor: (r) => r.id });

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
          showTableView
          view={view}
          onViewChange={(v) => setView(v)}
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        <BulkActionBar
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          actions={([
            { id: "manage", label: ACTIONS.ADMIN["manage-user"].label, variant: "primary", onClick: () => { setSelectedRow(rows.find(r => r.id === selection.selectedIds[0]) as UserRow ?? null); setDrawerOpen(true); selection.clearSelection(); } },
          ] satisfies BulkActionItem[])}
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
          {view === "table" ? (
            <DataTable
              rows={rows}
              isLoading={isLoading}
              emptyLabel="No users found"
              selectedIds={selection.selectedIdSet}
              onToggleSelect={selection.toggle}
              onToggleSelectAll={(next) => next ? selection.setSelectedIds(rows.map(r => r.id)) : selection.clearSelection()}
              renderRowActions={(row) => {
                const ur = row as UserRow;
                const isBanned = ur.status === "Hard banned";
                return (
                  <RowActionMenu actions={[
                    {
                      label: ACTIONS.ADMIN["manage-user"].label,
                      onClick: () => { setSelectedRow(ur); setDrawerOpen(true); },
                    },
                    {
                      label: ACTIONS.ADMIN["ban-user"].label,
                      onClick: () => { setBanTargetId(ur.id); setBanReason(""); setBanModalOpen(true); },
                      disabled: isBanned,
                    },
                    {
                      label: ACTIONS.ADMIN["unban-user"].label,
                      onClick: () => unbanUser.mutate(ur.id),
                      disabled: !isBanned || unbanUser.isPending,
                    },
                  ]} />
                );
              }}
            />
          ) : (
            <AdminViewCards
              rows={rows}
              view={view}
              isLoading={isLoading}
              emptyLabel="No users found"
              onRowClick={(row) => { setSelectedRow(row as UserRow); setDrawerOpen(true); }}
              selectedIdSet={selection.selectedIdSet}
              onToggleSelect={selection.toggle}
            />
          )}
        </div>

        <UsersFilterDrawer
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
          pendingFilters={pendingFilters}
          setPendingFilters={setPendingFilters}
          applyFilters={applyFilters}
        />
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

      <Modal
        isOpen={banModalOpen}
        onClose={() => { setBanModalOpen(false); setBanTargetId(null); setBanReason(""); }}
        title={ACTIONS.ADMIN["ban-user"].confirmation!.title}
      >
        <AppText size="sm" color="muted" className="mb-4">
          {ACTIONS.ADMIN["ban-user"].confirmation!.body}
        </AppText>
        <Form onSubmit={(e) => { e.preventDefault(); banUser.mutate(); }}>
          <Input
            label="Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="e.g. Repeated fraud, scam activity…"
            required
          />
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => { setBanModalOpen(false); setBanTargetId(null); setBanReason(""); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={banUser.isPending}
              disabled={!banReason.trim() || banUser.isPending}
            >
              {ACTIONS.ADMIN["ban-user"].confirmation!.confirmLabel}
            </Button>
          </FormActions>
        </Form>
      </Modal>
    </>
  );
}
