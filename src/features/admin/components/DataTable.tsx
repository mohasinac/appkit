"use client";

import React from "react";
import type { AdminTableColumn } from "../types";
import { BaseListingCard, Button, Div, Row, Span, Table, Tbody, Td, Text, Th, Thead, Tr } from "../../../ui";
import { useLongPress } from "../../../react/hooks/useLongPress";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

const DEFAULT_COLUMNS: AdminTableColumn<Record<string, unknown>>[] = [
  {
    key: "primary",
    header: "Name",
    render: (row) => (
      <Div className="space-y-0.5">
        <Text weight="medium" color="primary">{String(row.primary ?? "")}</Text>
        {row.secondary ? <Text size="xs" color="muted">{String(row.secondary)}</Text> : null}
      </Div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-32",
    render: (row) => (
      <Span size="xs" weight="medium" className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300">
        {String(row.status ?? "—")}
      </Span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-32",
    render: (row) => <Span size="sm" color="muted">{String(row.updatedAt ?? "")}</Span>,
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
    <Tr
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
        <Td className="relative w-10 px-2 py-3" onClick={(e) => e.stopPropagation()}>
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(e) => { e.preventDefault(); onToggle?.(row.id, !isSelected); }}
            label={isSelected ? "Deselect row" : "Select row"}
            position="top-1/2 left-2 -translate-y-1/2"
            data-testid="row-checkbox"
          />
        </Td>
      )}
      {columns.map((col) => (
        <Td
          key={col.key}
          className={`px-4 py-3 text-neutral-700 dark:text-zinc-300 ${col.className ?? ""}`}
        >
          {col.render
            ? col.render(row)
            : String((row as Record<string, unknown>)[col.key] ?? "")}
        </Td>
      ))}
      {renderRowActions && (
        <Td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
          {renderRowActions(row)}
        </Td>
      )}
    </Tr>
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
    <Div surface="card" className={`${__O.hidden}`}>
      <Div className={`${__O.xAuto}`}>
        <Table data-testid="data-table" className="w-full text-sm">
          <Thead>
            <Tr className="border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800">
              {selectionEnabled && (
                <Th scope="col" className="w-10 px-2 py-3">
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
                </Th>
              )}
              {columns.map((col) => (
                <Th
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
                </Th>
              ))}
              {renderRowActions && <Th scope="col" className="w-12 px-2 py-3" />}
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Tr key={i} className="border-b border-neutral-100 dark:border-slate-700">
                  {selectionEnabled && <Td className="w-10 px-2 py-3" />}
                  {columns.map((col) => (
                    <Td key={col.key} className="px-4 py-3">
                      <Div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-slate-700" />
                    </Td>
                  ))}
                </Tr>
              ))
            ) : rows.length === 0 ? (
              <Tr>
                <Td
                  colSpan={columns.length + (selectionEnabled ? 1 : 0) + (renderRowActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-neutral-500 dark:text-zinc-400"
                >
                  {emptyLabel}
                </Td>
              </Tr>
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
          </Tbody>
        </Table>
      </Div>
      {totalPages > 1 && onPageChange && (
        <Row className="border-t border-neutral-200 dark:border-slate-700 px-4 py-3" align="center" justify="end" gap="sm">
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
        </Row>
      )}
    </Div>
  );
}
