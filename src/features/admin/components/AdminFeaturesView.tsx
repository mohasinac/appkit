"use client";

import React, { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { BulkActionBar, Button,
  Div,
  ListingToolbar,
  ListingLayout,
  Pagination,
  Row,
  SideDrawer,
  Text, } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { AdminFeatureEditorView } from "./AdminFeatureEditorView";
import { PRODUCT_FEATURE_SCOPE_TABS } from "../../products/constants/product-features.constants";
import type { ProductFeatureScope } from "../../products/schemas/product-features";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 50;
const DEFAULT_SORT = "displayOrder";
const DEFAULT_SCOPE: ProductFeatureScope = "platform";

const SORT_OPTIONS = [
  { value: "displayOrder", label: "Display order" },
  { value: "label", label: "Label A–Z" },
  { value: "-label", label: "Label Z–A" },
  { value: "-createdAt", label: "Newest" },
];

const STICKY_TABS_CLASS =
  "sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-2";
const TAB_BASE_CLASS =
  "rounded-full px-3 py-1 text-xs font-medium border transition-colors";
const TAB_ACTIVE_CLASS = "bg-primary text-white border-primary";
const TAB_INACTIVE_CLASS =
  "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800";
const PAGINATION_BAR_CLASS =
  "flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5";
const ERROR_BANNER_CLASS =
  "mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60";

interface AdminFeaturesResponse {
  items?: unknown[];
  total?: number;
}

interface FeatureRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

function mapFeatureRow(
  item: Record<string, unknown>,
  index: number,
): FeatureRow {
  const productTypes = Array.isArray(item.productTypes)
    ? (item.productTypes as string[])
    : [];
  const isActive =
    typeof item.isActive === "boolean" ? item.isActive : true;
  return {
    id: toStringValue(item.id, `feature-${index}`),
    primary: toStringValue(item.label, "Untitled feature"),
    secondary: [
      toStringValue(item.category, ""),
      productTypes.join(" · "),
      item.scope === "store" && item.storeId
        ? `store: ${item.storeId as string}`
        : "",
    ]
      .filter(Boolean)
      .join(" — "),
    status: isActive ? "Active" : "Inactive",
    updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
  };
}

export interface AdminFeaturesViewProps extends ListingLayoutProps {}

export function AdminFeaturesView({
  children,
  ...props
}: AdminFeaturesViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  /* scope is a URL-level tab, read before the listing hook so it can drive queryKey + endpoint */
  const searchParams = useSearchParams();
  const scopeFilter = (searchParams.get("scope") as ProductFeatureScope | null) || DEFAULT_SCOPE;

  const {
    view, setView, table, panel, searchInput, setSearchInput, commitSearch,
    hasActiveState: hookHasActiveState, resetAll: hookResetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminFeaturesResponse, FeatureRow>({
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "features", "listing", scopeFilter],
    endpoint: `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=${scopeFilter}`,
    mapRows: (response) => toRecordArray(response.items).map(mapFeatureRow),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: () => undefined,
  });

  /* Extend hasActiveState to include scope deviation */
  const hasActiveState = hookHasActiveState || scopeFilter !== DEFAULT_SCOPE;

  /* Extend resetAll to also reset scope */
  const resetAll = useCallback(() => {
    hookResetAll();
    table.set("scope", DEFAULT_SCOPE);
  }, [hookResetAll, table]);

  if (hasChildren) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const tabClass = (value: ProductFeatureScope) =>
    `${TAB_BASE_CLASS} ${scopeFilter === value ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`;

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
          { id: "delete", label: ACTIONS.ADMIN["delete-feature"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
        ] satisfies BulkActionItem[]) } } : {});

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        searchValue={searchInput}
        searchPlaceholder="Search features by label"
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
            size="sm"
            onClick={panel.openCreatePanel}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Feature
          </Button>
        }
      />

      <Row className={STICKY_TABS_CLASS} gap="xs">
        {PRODUCT_FEATURE_SCOPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              table.set("scope", tab.value);
            }}
            className={tabClass(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </Row>

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={([
          { id: "delete", label: ACTIONS.ADMIN["delete-feature"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
        ] satisfies BulkActionItem[])}
      />

      {totalPages > 1 && (
        <Div className={PAGINATION_BAR_CLASS}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Div>
      )}

      <Div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Text as="div" className={ERROR_BANNER_CLASS}>
            {errorMessage}
          </Text>
        )}
        <DataTable
          rows={rows}
          isLoading={isLoading}
          emptyLabel="No features found"
          onRowClick={(row) => panel.openEditPanel(row.id)}
        />
      </Div>

      <SideDrawer
        isOpen={panel.isCreateOpen || panel.isEditOpen}
        onClose={panel.closePanel}
        title={panel.isCreateOpen ? "Add Feature" : "Edit Feature"}
        mode={panel.isCreateOpen ? "create" : "edit"}
      >
        {(panel.isCreateOpen || panel.isEditOpen) && (
          <AdminFeatureEditorView
            featureId={panel.editId ?? undefined}
            onSaved={panel.closePanel}
            onDeleted={panel.closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </Div>
  );
}
