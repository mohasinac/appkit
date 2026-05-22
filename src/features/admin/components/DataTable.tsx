"use client";

import React from "react";
import type { AdminTableColumn } from "../types";
import { BaseListingCard, Button, Div, Span, Text } from "../../../ui";
import { useLongPress } from "../../../react/hooks/useLongPress";

const DEFAULT_COLUMNS: AdminTableColumn<Record<string, unknown>>[] = [
  {
    key: "primary",
    header: "Name",
    render: (row) => (
      <div className="space-y-0.5">
        <Text className="font-medium text-zinc-900 dark:text-zinc-100">{String(row.primary ?? "")}</Text>
        {row.secondary ? <Text className="text-xs text-zinc-500 dark:text-zinc-400">{String(row.secondary)}</Text> : null}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-32",
    render: (row) => (
      <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300">
        {String(row.status ?? "—")}
      </span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-32",
    render: (row) => <span className="text-sm text-zinc-500 dark:text-zinc-400">{String(row.updatedAt ?? "")}</span>,
  },
];

interface DataTableProps<T extends { id: string }> {
  columns?: AdminTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  getRowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  emptyLabel?: string;
  /** When provided, renders a leading checkbox column + long-press to toggle. */
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, selected: boolean) => void;
  onToggleSelectAll?: (nextAllSelected: boolean) => void;
}

function SelectableRow<T extends { id: string }>({
  row,
  columns,
  isSelected,
  onToggle,
  renderRowActions,
  onRowClick,
  rowHref,
  selectionEnabled,
}: {
  row: T;
  columns: AdminTableColumn<T>[];
  isSelected: boolean;
  onToggle?: (id: string, selected: boolean) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  rowHref?: string;
  selectionEnabled: boolean;
}) {
  const longPress = useLongPress(() => onToggle?.(row.id, !isSelected));
  const handleClick = onRowClick
    ? () => onRowClick(row)
    : rowHref
      ? () => { window.location.href = rowHref; }
      : undefined;
  const handleKeyDown = handleClick
    ? (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") handleClick();
      }
    : undefined;
  const isInteractive = Boolean(onRowClick ?? rowHref);
  return (
    <tr
      data-testid="data-table-row"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "link" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onMouseDown={selectionEnabled && !isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={selectionEnabled && !isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={selectionEnabled && !isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={selectionEnabled && !isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={selectionEnabled && !isSelected ? longPress.onTouchEnd : undefined}
      className={`border-b border-neutral-100 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 ${isInteractive ? "cursor-pointer" : ""} ${isSelected ? "bg-primary/5 dark:bg-primary/10" : ""}`}
    >
      {selectionEnabled && (
        <td className="relative w-10 px-2 py-3" onClick={(e) => e.stopPropagation()}>
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(e) => { e.preventDefault(); onToggle?.(row.id, !isSelected); }}
            label={isSelected ? "Deselect row" : "Select row"}
            position="top-1/2 left-2 -translate-y-1/2"
            data-testid="row-checkbox"
          />
        </td>
      )}
      {columns.map((col) => (
        <td
          key={col.key}
          className={`px-4 py-3 text-neutral-700 dark:text-zinc-300 ${col.className ?? ""}`}
        >
          {col.render
            ? col.render(row)
            : String((row as Record<string, unknown>)[col.key] ?? "")}
        </td>
      ))}
      {renderRowActions && (
        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
          {renderRowActions(row)}
        </td>
      )}
    </tr>
  );
}

export function DataTable<T extends { id: string }>({
  columns: columnsProp,
  rows,
  isLoading,
  sortKey,
  sortDir,
  onSort,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  emptyLabel = "No records found",
  getRowHref,
  onRowClick,
  renderRowActions,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: DataTableProps<T>) {
  const columns = (columnsProp ?? DEFAULT_COLUMNS) as AdminTableColumn<T>[];
  const selectionEnabled = Boolean(onToggleSelect);
  const allRowsSelected =
    selectionEnabled && rows.length > 0 && rows.every((r) => selectedIds?.has(r.id));
  return (
    <Div surface="card" className="overflow-hidden">
      <Div className="overflow-x-auto">
        <table data-testid="data-table" className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800">
              {selectionEnabled && (
                <th scope="col" className="w-10 px-2 py-3">
                  {onToggleSelectAll && (
                    <input
                      type="checkbox"
                      data-testid="select-all-checkbox"
                      aria-label={allRowsSelected ? "Deselect all" : "Select all"}
                      checked={allRowsSelected}
                      onChange={() => onToggleSelectAll(!allRowsSelected)}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-slate-600 accent-zinc-900 dark:accent-zinc-100"
                    />
                  )}
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={
                    col.sortable && onSort ? () => onSort(col.key) : undefined
                  }
                  className={`px-4 py-3 text-left font-semibold text-neutral-900 dark:text-zinc-100 ${col.sortable && onSort ? "cursor-pointer select-none hover:text-primary" : ""} ${col.className ?? ""}`}
                >
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <Span className="ml-1">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </Span>
                  )}
                </th>
              ))}
              {renderRowActions && <th scope="col" className="w-12 px-2 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-slate-700">
                  {selectionEnabled && <td className="w-10 px-2 py-3" />}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectionEnabled ? 1 : 0) + (renderRowActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-neutral-500 dark:text-zinc-400"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <SelectableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  isSelected={selectedIds?.has(row.id) ?? false}
                  onToggle={onToggleSelect}
                  renderRowActions={renderRowActions}
                  onRowClick={onRowClick}
                  rowHref={getRowHref?.(row)}
                  selectionEnabled={selectionEnabled}
                />
              ))
            )}
          </tbody>
        </table>
      </Div>
      {totalPages > 1 && onPageChange && (
        <Div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-slate-700 px-4 py-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              onClick={() => onPageChange(p)}
              variant={p === currentPage ? "primary" : "ghost"}
              size="sm"
              className={`h-8 w-8 rounded text-xs font-medium transition ${p === currentPage ? "bg-neutral-900 text-white" : "text-neutral-600 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-slate-800"}`}
            >
              {p}
            </Button>
          ))}
        </Div>
      )}
    </Div>
  );
}
