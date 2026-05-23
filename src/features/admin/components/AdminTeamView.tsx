"use client";

import React, { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { BulkActionBar, Button,
  FilterChipGroup,
  ListingToolbar,
  Pagination,
  ListingLayout,
  RowActionMenu, ListingFilterDrawer} from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ALL_TAB } from "../constants/filter-tabs";
import type { AdminFilterTab } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { AdminEmployeeEditorView } from "./AdminEmployeeEditorView";

const FILTER_KEYS = ["group"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "displayName", label: "Name A–Z" },
];

const GROUP_TABS: readonly AdminFilterTab[] = [
  ALL_TAB,
  { id: "content_moderator", label: "Content Mod" },
  { id: "review_manager", label: "Reviews" },
  { id: "blog_poster", label: "Blog" },
  { id: "community_manager", label: "Community" },
  { id: "event_handler", label: "Events" },
  { id: "newsletter_manager", label: "Newsletter" },
  { id: "seo_manager", label: "SEO" },
  { id: "ad_manager", label: "Ads" },
  { id: "site_manager", label: "Site" },
  { id: "catalog_manager", label: "Catalog" },
  { id: "finance_manager", label: "Finance" },
  { id: "data_analyst", label: "Analytics" },
  { id: "customer_support", label: "Support" },
  { id: "support_agent", label: "Agent" },
  { id: "store_onboarding", label: "Onboarding" },
  { id: "trust_and_safety", label: "T&S" },
  { id: "auction_monitor", label: "Auctions" },
  { id: "scam_moderator", label: "Scams" },
  { id: "custom", label: "Custom" },
];

function formatGroup(group: string): string {
  return group.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AdminTeamResponse {
  users?: unknown[];
  total?: number;
  meta?: { total?: number };
}

interface EmployeeRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminTeamViewProps extends ListingLayoutProps {
  onBulkRemove?: (ids: string[]) => Promise<void>;
}

export function AdminTeamView({ children, onBulkRemove, ...props }: AdminTeamViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EmployeeRow | null>(null);
  const [inviteMode, setInviteMode] = useState(false);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminTeamResponse, EmployeeRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "team", "listing"],
    endpoint: ADMIN_ENDPOINTS.TEAM,
    buildFilters: (state) => {
      const groupRaw = state.group;
      return groupRaw && groupRaw !== "All" ? `permissionGroup==${groupRaw}` : undefined;
    },
    mapRows: (response) =>
      toRecordArray(response.users).map((item, index) => ({
        id: toStringValue(item.id ?? item.uid, `employee-${index}`),
        primary: toStringValue(item.displayName, "Unnamed employee"),
        secondary: [
          toStringValue(item.email, "No email"),
          item.permissionGroup
            ? formatGroup(toStringValue(item.permissionGroup, ""))
            : "Custom",
        ].join(" · "),
        status: typeof item.disabled === "boolean"
          ? item.disabled ? "Disabled" : "Active"
          : "Active",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.total === "number") return response.meta.total;
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
  });

  const openInvite = useCallback(() => {
    setSelectedRow(null);
    setInviteMode(true);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((row: EmployeeRow) => {
    setSelectedRow(row);
    setInviteMode(false);
    setDrawerOpen(true);
  }, []);

  const bulkActions: BulkActionItem[] = [
    ...(onBulkRemove ? [buildBulkAction(ACTIONS.ADMIN["remove-team-member"], async () => { await onBulkRemove(selection.selectedIds); selection.clearSelection(); })] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  if (hasChildren) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search by name or email"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || DEFAULT_SORT}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => {
            table.set("sort", v);
          }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
          extra={
            <Button
              type="button"
              variant="primary"
              onClick={openInvite}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              Invite Employee
            </Button>
          }
        />

        {selection.selectedCount > 0 && bulkActions.length > 0 && (
          <BulkActionBar
            selectedCount={selection.selectedCount}
            actions={bulkActions}
            onClearSelection={selection.clearSelection}
          />
        )}

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </div>
        )}

        <div className="py-4 px-3 sm:px-4">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
              {errorMessage}
            </div>
          )}
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No employees found"
            renderRowActions={(row) => (
              <RowActionMenu
                actions={[
                  {
                    label: ACTIONS.ADMIN["edit-team-member"].label,
                    onClick: () => openEdit(row as EmployeeRow),
                  },
                ]}
              />
            )}
          />
        </div>

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
            label="Permission Group"
            tabs={GROUP_TABS}
            value={pendingFilters.group ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, group: id }))}
          />
      </ListingFilterDrawer>
      </div>

      <AdminEmployeeEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={inviteMode ? "invite" : "edit"}
        userId={selectedRow?.id}
        displayName={selectedRow?.primary}
        currentPermissionGroup={toStringValue(
          selectedRow?._raw?.permissionGroup,
          "custom",
        )}
        currentPermissions={
          Array.isArray(selectedRow?._raw?.permissions)
            ? (selectedRow!._raw!.permissions as string[])
            : []
        }
      />
    </>
  );
}
