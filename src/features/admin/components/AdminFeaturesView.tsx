"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { BulkActionBar, Button,
  Div,
  ListingToolbar,
  ListingViewShell,
  Pagination,
  Row,
  SideDrawer,
  Text, } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { AdminFeatureEditorView } from "./AdminFeatureEditorView";
import { PRODUCT_FEATURE_SCOPE_TABS } from "../../products/constants/product-features.constants";
import type { ProductFeatureScope } from "../../products/schemas/product-features";

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
  "mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";

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

export interface AdminFeaturesViewProps extends ListingViewShellProps {}

export function AdminFeaturesView({
  children,
  ...props
}: AdminFeaturesViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const table = useUrlTable({
    defaults: {
      pageSize: String(PAGE_SIZE),
      sort: DEFAULT_SORT,
      scope: DEFAULT_SCOPE,
    },
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
  }, [searchInput, table]);

  const resetAll = React.useCallback(() => {
    table.setMany({ q: "", sort: "", scope: DEFAULT_SCOPE });
    setSearchInput("");
  }, [table]);

  const scopeFilter =
    (table.get("scope") as ProductFeatureScope | "") || DEFAULT_SCOPE;
  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== DEFAULT_SORT ||
    scopeFilter !== DEFAULT_SCOPE;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminFeaturesResponse,
    FeatureRow
  >({
    queryKey: ["admin", "features", "listing", scopeFilter],
    endpoint: `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=${scopeFilter}`,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
    mapRows: (response) => toRecordArray(response.items).map(mapFeatureRow),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
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

  const tabClass = (value: ProductFeatureScope) =>
    `${TAB_BASE_CLASS} ${scopeFilter === value ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`;

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
            onClick={openCreatePanel}
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
          { id: "delete", label: "Delete Selected", variant: "secondary", onClick: () => { selection.clearSelection(); } },
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
          onRowClick={(row) => openEditPanel(row.id)}
        />
      </Div>

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
    </Div>
  );
}
