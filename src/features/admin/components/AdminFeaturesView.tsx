"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import {
  Button,
  ListingToolbar,
  Pagination,
  ListingViewShell,
  SideDrawer,
} from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminFeatureEditorView } from "./AdminFeatureEditorView";

const PAGE_SIZE = 50;
const DEFAULT_SORT = "displayOrder";
const SORT_OPTIONS = [
  { value: "displayOrder", label: "Display order" },
  { value: "label", label: "Label A–Z" },
  { value: "-label", label: "Label Z–A" },
  { value: "-createdAt", label: "Newest" },
];

const SCOPE_TABS = [
  { value: "platform", label: "Platform" },
  { value: "store", label: "Store Custom" },
];

interface AdminFeaturesResponse {
  items?: unknown[];
  total?: number;
}

export interface AdminFeaturesViewProps extends ListingViewShellProps {}

export function AdminFeaturesView({
  children,
  ...props
}: AdminFeaturesViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const table = useUrlTable({
    defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT, scope: "platform" },
  });
  const {
    openCreatePanel,
    openEditPanel,
    closePanel,
    isCreateOpen,
    isEditOpen,
    editId,
  } = usePanelUrlSync();
  const [searchInput, setSearchInput] = React.useState(table.get("q") || "");

  const commitSearch = React.useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const resetAll = React.useCallback(() => {
    table.setMany({ q: "", sort: "", scope: "platform" });
    setSearchInput("");
  }, [table]);

  const scopeFilter = table.get("scope") || "platform";
  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== DEFAULT_SORT ||
    scopeFilter !== "platform";

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminFeaturesResponse,
    {
      id: string;
      primary: string;
      secondary: string;
      status: string;
      updatedAt: string;
    }
  >({
    queryKey: ["admin", "features", "listing", scopeFilter],
    endpoint: `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=${scopeFilter}`,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const productTypes = Array.isArray(item.productTypes)
          ? (item.productTypes as string[])
          : [];
        return {
          id: toStringValue(item.id, `feature-${index}`),
          primary: toStringValue(item.label, "Untitled feature"),
          secondary: [
            toStringValue(item.category, ""),
            productTypes.join(" · "),
            item.scope === "store" && item.storeId
              ? `store: ${item.storeId}`
              : "",
          ]
            .filter(Boolean)
            .join(" — "),
          status:
            typeof item.isActive === "boolean"
              ? item.isActive
                ? "Active"
                : "Inactive"
              : "Active",
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (hasChildren) {
    return (
      <ListingViewShell portal="admin" {...props}>
        {children}
      </ListingViewShell>
    );
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        searchValue={searchInput}
        searchPlaceholder="Search features by label"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => {
          table.set("sort", v);
          table.setPage(1);
        }}
        hideViewToggle
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button
            size="sm"
            onClick={openCreatePanel}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Feature
          </Button>
        }
      />

      <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-2">
        {SCOPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              table.set("scope", tab.value);
              table.setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              scopeFilter === tab.value
                ? "bg-primary text-white border-primary"
                : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
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
          emptyLabel="No features found"
          onRowClick={(row) => openEditPanel(row.id)}
        />
      </div>

      <SideDrawer
        isOpen={isCreateOpen || isEditOpen}
        onClose={closePanel}
        title={isCreateOpen ? "Add Feature" : "Edit Feature"}
        mode={isCreateOpen ? "create" : "edit"}
      >
        {(isCreateOpen || isEditOpen) && (
          <AdminFeatureEditorView
            featureId={editId ?? undefined}
            onSaved={closePanel}
            onDeleted={closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
