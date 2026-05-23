"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, Button, FilterChipGroup, Form, FormActions, Input, ListingToolbar, Modal, Pagination, ListingLayout, RowActionMenu, Text as AppText, useToast, ListingFilterDrawer} from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_USER_STATUS_TABS, ADMIN_USER_ROLE_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { apiClient } from "../../../http";
import { DataTable } from "./DataTable";
import { AdminUserEditorView } from "./AdminUserEditorView";
import { useBottomActions } from "../../layout";

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

export interface AdminUsersViewProps extends ListingLayoutProps {}

export function AdminUsersView({ children, ...props }: AdminUsersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const toast = useToast();
  const queryClient = useQueryClient();

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

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection, defaultSort,
  } = useAdminListing<AdminUsersResponse, UserRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "users", "listing"],
    endpoint: ADMIN_ENDPOINTS.USERS,
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
    buildFilters: (f) => {
      const parts: string[] = [];
      if (f.status && f.status !== "All") {
        parts.push(f.status === "Active" ? "disabled==false" : "disabled==true");
      }
      if (f.role && f.role !== "All") parts.push(`role==${f.role}`);
      return parts.join(",") || undefined;
    },
  });

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
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
          sortValue={table.get("sort") || defaultSort}
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
            <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
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
                useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: "manage", label: ACTIONS.ADMIN["manage-user"].label, variant: "primary", onClick: () => { setSelectedRow(rows.find(r => r.id === selection.selectedIds[0]) as UserRow ?? null); setDrawerOpen(true); selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

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

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
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
      </ListingFilterDrawer>
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
