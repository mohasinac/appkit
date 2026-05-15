"use client";

import React, { useState, useCallback } from "react";
import { X, UserPlus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, Button,
  FilterChipGroup,
  ListingToolbar,
  Pagination,
  ListingViewShell,
  RowActionMenu, } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ALL_TAB } from "../constants/filter-tabs";
import type { AdminFilterTab } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { AdminEmployeeEditorView } from "./AdminEmployeeEditorView";

const PAGE_SIZE = 25;
const FILTER_KEY = "group";
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

export interface AdminTeamViewProps extends ListingViewShellProps {}

export function AdminTeamView({ children, ...props }: AdminTeamViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");

  const table = useUrlTable({
    defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT },
  });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingGroup, setPendingGroup] = useState(table.get(FILTER_KEY) ?? "");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EmployeeRow | null>(null);
  const [inviteMode, setInviteMode] = useState(false);

  const openFilters = useCallback(() => {
    setPendingGroup(table.get(FILTER_KEY) ?? "");
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    table.setMany({ page: "1", [FILTER_KEY]: pendingGroup });
    setFilterOpen(false);
  }, [pendingGroup, table]);

  const clearFilters = useCallback(() => {
    setPendingGroup("");
  }, []);

  const resetAll = useCallback(() => {
    table.setMany({ q: "", sort: "", [FILTER_KEY]: "" });
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

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

  const activeFilterCount = table.get(FILTER_KEY) ? 1 : 0;
  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== DEFAULT_SORT ||
    activeFilterCount > 0;

  const groupRaw = table.get(FILTER_KEY);
  const filters =
    groupRaw && groupRaw !== "All"
      ? `permissionGroup==${groupRaw}`
      : undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminTeamResponse,
    EmployeeRow
  >({
    queryKey: ["admin", "team", "listing"],
    endpoint: ADMIN_ENDPOINTS.TEAM,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  if (hasChildren) {
    return (
      <ListingViewShell portal="admin" {...props}>
        {children}
      </ListingViewShell>
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
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
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
                    label: "Edit Permissions",
                    onClick: () => openEdit(row as EmployeeRow),
                  },
                ]}
              />
            )}
          />
        </div>

        {filterOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              aria-hidden="true"
              onClick={() => setFilterOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Filters
                </span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <FilterChipGroup
                  label="Permission Group"
                  tabs={GROUP_TABS}
                  value={pendingGroup}
                  onChange={(id) => setPendingGroup(id)}
                />
              </div>
              <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]"
                >
                  Apply Filters
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              </div>
            </div>
          </>
        )}
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
