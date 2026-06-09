"use client";

import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback, useMemo } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import {
  BulkActionBar,
  Button,
  ConfirmDeleteModal,
  DataTable,
  Div,
  FilterDrawer,
  Input,
  Label,
  ListingToolbar,
  Pagination,
  RowActionMenu,
  Select,
  SideDrawer,
  Span,
  Stack,
  Text,
  useToast,
} from "../../../ui";
import type { BulkActionItem, DataTableColumn } from "../../../ui";
import { useBottomActions } from "../../layout";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import {
  toRecordArray,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { TABLE_KEYS } from "../../../constants/table-keys";

const __P = {
  p4: "p-4",
} as const;

const PAGE_SIZE = 25;
const DEFAULT_SORT = "name";

const SORT_OPTIONS = [
  { value: sortBy("name", "ASC"), label: "Name A–Z" },
  { value: sortBy("name", "DESC"), label: "Name Z–A" },
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
];

const CONDITION_OPTIONS = [
  { value: "", label: "Any condition" },
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "used", label: "Used" },
];

interface TemplateRow {
  id: string;
  raw: Record<string, unknown>;
  name: string;
  category: string;
  brand: string;
  condition: string;
}

interface DraftTemplate {
  name: string;
  description: string;
  category: string;
  brand: string;
  condition: string;
}

const EMPTY_DRAFT: DraftTemplate = {
  name: "",
  description: "",
  category: "",
  brand: "",
  condition: "",
};

interface TemplatesResponse {
  templates?: unknown[];
  total?: number;
}

const COLUMNS: DataTableColumn<TemplateRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => <Text className="text-sm font-medium">{row.name}</Text>,
  },
  {
    key: "category",
    header: "Category",
    render: (row) => (
      <Text className="text-sm text-[var(--appkit-color-text-muted)]">
        {row.category || "—"}
      </Text>
    ),
  },
  {
    key: "brand",
    header: "Brand",
    render: (row) => (
      <Text className="text-sm text-[var(--appkit-color-text-muted)]">
        {row.brand || "—"}
      </Text>
    ),
  },
  {
    key: "condition",
    header: "Condition",
    render: (row) =>
      row.condition ? (
        <Span size="xs" weight="medium" className="inline-flex items-center rounded-full px-2 py-0.5 bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400 capitalize">
          {row.condition.replace(/_/g, " ")}
        </Span>
      ) : (
        <Text className="text-sm text-[var(--appkit-color-text-muted)]">—</Text>
      ),
  },
];

export interface SellerTemplatesViewProps {
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onDuplicate?: (row: { id: string; name: string; raw: Record<string, unknown> }) => Promise<void>;
}

export function SellerTemplatesView({
  onDelete,
  onBulkDelete,
  onDuplicate,
}: SellerTemplatesViewProps) {
  const table = useUrlTable({ defaults: { sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingCondition, setPendingCondition] = useState(table.get(TABLE_KEYS.CONDITION) || "");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftTemplate>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);

  // Delete state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: SELLER_ENDPOINTS.TEMPLATE_BY_ID,
    deleteFn: onDelete,
    successMessage: "Template deleted.",
    onSuccess: () => { refetch?.(); },
    fetchOptions: { credentials: "include" },
  });
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const openFilters = useCallback(() => {
    setPendingCondition(table.get(TABLE_KEYS.CONDITION) || "");
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    table.setMany({ [TABLE_KEYS.CONDITION]: pendingCondition });
    setFilterOpen(false);
  }, [pendingCondition, table]);

  const resetAll = useCallback(() => {
    table.setMany({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.CONDITION]: "" });
    setSearchInput("");
  }, [table]);

  const q = table.get(TABLE_KEYS.QUERY) || "";
  const conditionFilter = table.get(TABLE_KEYS.CONDITION) || "";
  const sort = table.get(TABLE_KEYS.SORT) || DEFAULT_SORT;
  const currentPage = table.getNumber(TABLE_KEYS.PAGE, 1);

  const hasActiveState = !!q || sort !== DEFAULT_SORT || !!conditionFilter;
  const filterActiveCount = conditionFilter ? 1 : 0;

  // Fetch all templates (server doesn't paginate this endpoint)
  const { rows: allRows, isLoading, errorMessage, refetch } = useSellerListingData<
    TemplatesResponse,
    TemplateRow
  >({
    queryKey: ["seller", "templates"],
    endpoint: SELLER_ENDPOINTS.TEMPLATES,
    page: 1,
    pageSize: 1000,
    mapRows: (response) =>
      toRecordArray(response.templates).map((item, index) => ({
        id: toStringValue(item.id, `tpl-${index}`),
        raw: item,
        name: String(item.name ?? ""),
        category: String(item.category ?? ""),
        brand: String(item.brand ?? ""),
        condition: String(item.condition ?? ""),
      })),
  });

  // Client-side filter + sort
  const filteredRows = useMemo(() => {
    let result = allRows;
    if (q) result = result.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
    if (conditionFilter) result = result.filter((r) => r.condition === conditionFilter);
    return [...result].sort((a, b) =>
      sort === "-name" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name),
    );
  }, [allRows, q, conditionFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selection = useBulkSelection({ items: filteredRows, keyExtractor: (r) => r.id });

  // Drawer helpers
  const openCreate = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setDrawerMode("create");
    setSavingError(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((row: TemplateRow) => {
    setDraft({
      name: row.name,
      description: String(row.raw.description ?? ""),
      category: row.category,
      brand: row.brand,
      condition: row.condition,
    });
    setEditingId(row.id);
    setDrawerMode("edit");
    setSavingError(null);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    setSavingError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft.name.trim()) {
      setSavingError("Template name is required.");
      return;
    }
    setSaving(true);
    setSavingError(null);
    try {
      const body = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        category: draft.category.trim() || undefined,
        brand: draft.brand.trim() || undefined,
        condition: draft.condition || undefined,
      };
      const url =
        drawerMode === "edit" && editingId
          ? SELLER_ENDPOINTS.TEMPLATE_BY_ID(editingId)
          : SELLER_ENDPOINTS.TEMPLATES;
      const method = drawerMode === "edit" ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      closeDrawer();
      refetch?.();
      showToast("Template saved.", "success");
    } catch (err) {
      setSavingError("Failed to save template. Please try again.");
      showToast(err instanceof Error ? err.message : "Failed to save template.", "error");
    } finally {
      setSaving(false);
    }
  }, [draft, drawerMode, editingId, closeDrawer, refetch, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    await performDelete(id);
    setDeleteTargetId(null);
  }, [performDelete]);

  const handleDuplicate = useCallback(async (row: TemplateRow) => {
    setDuplicatingId(row.id);
    try {
      if (onDuplicate) {
        await onDuplicate(row);
      } else {
        await fetch(SELLER_ENDPOINTS.TEMPLATES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: `Copy of ${row.name}`,
            description: String(row.raw.description ?? "") || undefined,
            category: row.category || undefined,
            brand: row.brand || undefined,
            condition: row.condition || undefined,
          }),
        });
      }
      refetch?.();
      showToast("Template duplicated.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to duplicate template.", "error");
    } finally {
      setDuplicatingId(null);
    }
  }, [onDuplicate, refetch, showToast]);

  const bulkActions: BulkActionItem[] = [
    buildBulkAction(ACTIONS.STORE["delete-template"], async () => {
      if (onBulkDelete) {
        await onBulkDelete(selection.selectedIds);
      } else {
        await Promise.all(
          selection.selectedIds.map((id) =>
            fetch(SELLER_ENDPOINTS.TEMPLATE_BY_ID(id), {
              method: "DELETE",
              credentials: "include",
            }),
          ),
        );
      }
      selection.clearSelection();
      refetch?.();
    }),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search templates by name..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        showTableView
        view="table"
        onViewChange={() => {}}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button size="sm" onClick={openCreate} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </Button>
        }
      />

      {totalPages > 1 && (
        <Div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Div>
      )}

      {selection.selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      <Div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
            {errorMessage}
          </Div>
        )}
        {isLoading ? (
          <Div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Div
                key={i}
                className="h-14 animate-pulse rounded-xl border border-zinc-100 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800"
              />
            ))}
          </Div>
        ) : pageRows.length === 0 ? (
          <Div className="py-16 text-center">
            <Text className="text-zinc-400 dark:text-zinc-400">
              {q || conditionFilter
                ? "No templates match your search or filters"
                : "No templates yet — add your first product template"}
            </Text>
          </Div>
        ) : (
          <DataTable
            columns={COLUMNS}
            data={pageRows}
            keyExtractor={(r) => r.id}
            selectable={bulkActions.length > 0}
            selectedIds={selection.selectedIds}
            onSelectionChange={(ids) => selection.setSelectedIds(ids)}
            actions={(row) => (
              <RowActionMenu
                actions={[
                  {
                    label: ACTIONS.STORE["edit-template"].label,
                    onClick: () => openEdit(row),
                  },
                  {
                    label: "Clone",
                    disabled: duplicatingId === row.id,
                    onClick: () => handleDuplicate(row),
                  },
                  {
                    label: ACTIONS.STORE["delete-template"].label,
                    destructive: true,
                    onClick: () => setDeleteTargetId(row.id),
                    disabled: deletingId === row.id,
                  },
                ]}
              />
            )}
          />
        )}
      </Div>

      <FilterDrawer
        open={filterOpen}
        onOpen={openFilters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onReset={() => setPendingCondition("")}
        activeCount={filterActiveCount}
        hideTrigger
      >
        <Div className={`space-y-4 ${__P.p4}`}>
          <Div>
            <Label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Condition
            </Label>
            <Select
              value={pendingCondition}
              onValueChange={setPendingCondition}
              options={CONDITION_OPTIONS}
            />
          </Div>
        </Div>
      </FilterDrawer>

      <SideDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={drawerMode === "create" ? "New Template" : "Edit Template"}
        mode={drawerMode}
        isDirty={draft.name !== "" || draft.category !== "" || draft.brand !== ""}
        footer={
          <Div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={closeDrawer} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" isLoading={saving} onClick={handleSave}>
              {drawerMode === "create" ? "Create Template" : "Save Changes"}
            </Button>
          </Div>
        }
      >
        <Stack gap="md">
          {savingError && (
            <Div className="rounded-lg border border-error/20 bg-error-surface px-3 py-2 text-sm text-error">
              {savingError}
            </Div>
          )}
          <Input
            id="tpl-name"
            label="Template Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. Pokémon Card Standard"
            required
            autoComplete="off"
          />
          <Input
            id="tpl-description"
            label="Description (optional)"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Short note about when to use this template"
            autoComplete="off"
          />
          <Input
            id="tpl-category"
            label="Category (optional)"
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            placeholder="e.g. trading-cards"
            autoComplete="off"
          />
          <Input
            id="tpl-brand"
            label="Brand (optional)"
            value={draft.brand}
            onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
            placeholder="e.g. Pokémon Company"
            autoComplete="off"
          />
          <Select
            label="Condition (optional)"
            name="tpl-condition"
            value={draft.condition}
            onValueChange={(v) => setDraft((d) => ({ ...d, condition: v }))}
            options={CONDITION_OPTIONS}
          />
        </Stack>
      </SideDrawer>

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Template"
          message="Are you sure you want to delete this template? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </Div>
  );
}
