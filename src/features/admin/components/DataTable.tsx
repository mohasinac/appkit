"use client";

import React from "react";
import type { JsonValue } from "@mohasinac/appkit/client";
import type { AdminTableColumn } from "../types";
import { BaseListingCard, Button, Checkbox, Div, Row, Span, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "../../../ui";
import { renderStatusBadge, renderThumbnail } from "../../../ui/columns/cell-renderers";
import { resolveColumnPriority } from "../../../ui/columns/build-columns";
import { COLUMN_PRIORITY_CLASS, COLUMN_PRIORITY_CLASS_BLOCK } from "../../../contracts/extend";
import { MediaImage } from "../../media/MediaImage";
import { useLongPress } from "../../../react/hooks/useLongPress";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

function buildDefaultColumns(resourceIcon?: string): AdminTableColumn<Record<string, JsonValue>>[] {
  return [
    {
      key: "primary",
      header: "Name",
      render: (row) => (
        <Row gap="sm" align="center">
          {renderThumbnail(typeof row.image === "string" ? row.image : undefined, String(row.primary ?? ""), { rounded: "full", fallback: resourceIcon })}
          <Stack gap="none" className="min-w-0">
            <Text weight="medium" color="primary" className="truncate">{String(row.primary ?? "")}</Text>
            {row.secondary ? <Text size="xs" color="muted" className="truncate">{String(row.secondary)}</Text> : null}
          </Stack>
        </Row>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-32",
      render: (row) => renderStatusBadge(row.status == null ? null : String(row.status)),
    },
    {
      key: "updatedAt",
      header: "Updated",
      className: "w-32",
      render: (row) => <Span size="sm" color="muted">{String(row.updatedAt ?? "")}</Span>,
    },
  ];
}

interface DataTableProps<T extends { id: string }> {
  columns?: AdminTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  /**
   * Row link target. Prefer a plain string containing an `{id}` placeholder
   * (e.g. "/admin/products/{id}/edit") — it's the only form safe to construct
   * inside a Server Component page.tsx, since React Server Components cannot
   * pass function values to Client Components. A function is only safe when
   * both the caller and DataTable are already client-side (e.g. conditional
   * per-row routing inside an already-"use client" view).
   */
  rowHrefTemplate?: string | ((row: T) => string);
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
  /** Resource-type emoji fallback for the default "Name" column's avatar when a row has no `image` and no custom `columns` were supplied. */
  resourceIcon?: string;
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
      onTouchCancel={selectionEnabled && !isSelected ? longPress.onTouchCancel : undefined}
      className={`hover:bg-[var(--appkit-color-bg)] dark:hover:bg-[var(--appkit-color-bg)] ${isInteractive ? "cursor-pointer" : ""} ${isSelected ? "bg-primary/5 dark:bg-primary/10" : ""}`} border="default"
    >
      {selectionEnabled && (
        <Td padding="xs-3" className="relative w-10" onClick={(e) => e.stopPropagation()}>
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
          color="muted"
          className={`${COLUMN_PRIORITY_CLASS[resolveColumnPriority(col)]} ${col.className ?? ""}`}
          padding="md"
        >
          {col.render
            ? col.render(row)
            : String((row as Record<string, JsonValue>)[col.key] ?? "")}
        </Td>
      ))}
      {renderRowActions && (
        <Td padding="xs-3" onClick={(e) => e.stopPropagation()}>
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
  rowHrefTemplate,
  onRowClick,
  renderRowActions,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  resourceIcon,
}: DataTableProps<T>) {
  const columns = (columnsProp ?? buildDefaultColumns(resourceIcon)) as AdminTableColumn<T>[];
  const selectionEnabled = Boolean(onToggleSelect);
  const allRowsSelected =
    selectionEnabled && rows.length > 0 && rows.every((r) => selectedIds?.has(r.id));
  return (
    <Div surface="card" className={`${__O.hidden}`}>
      <Div className={`${__O.xAuto}`}>
        <Table data-testid="data-table" size="sm">
          <Thead>
            <Tr className="bg-[var(--appkit-color-bg)] dark:bg-[var(--appkit-color-surface-elevated)]" border="default">
              {selectionEnabled && (
                <Th padding="xs-3" scope="col" className="w-10">
                  {onToggleSelectAll && (
                    <Checkbox
                      bare
                      data-testid="select-all-checkbox"
                      aria-label={allRowsSelected ? "Deselect all" : "Select all"}
                      checked={allRowsSelected}
                      onChange={() => onToggleSelectAll(!allRowsSelected)}
                      className="h-4 w-4 rounded border-[var(--appkit-color-border)] accent-zinc-900 dark:accent-zinc-100"
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
                  className={`text-left text-[var(--appkit-color-text)] ${col.sortable && onSort ? "cursor-pointer select-none hover:text-primary" : ""} ${COLUMN_PRIORITY_CLASS[resolveColumnPriority(col)]} ${col.className ?? ""}`} padding="md" weight="semibold"
                >
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <Span className="ml-1">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </Span>
                  )}
                </Th>
              ))}
              {renderRowActions && <Th padding="xs-3" scope="col" className="w-12" />}
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Tr key={i} border="default">
                  {selectionEnabled && <Td padding="xs-3" className="w-10" />}
                  {columns.map((col) => (
                    <Td key={col.key} padding="md" className={COLUMN_PRIORITY_CLASS[resolveColumnPriority(col)]}>
                      <Div className="h-4 w-full animate-pulse bg-neutral-200" rounded="default" />
                    </Td>
                  ))}
                </Tr>
              ))
            ) : rows.length === 0 ? (
              <Tr>
                <Td
                  colSpan={columns.length + (selectionEnabled ? 1 : 0) + (renderRowActions ? 1 : 0)}
                  align="center" color="faint" paddingX="md" paddingY="md"
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
                  rowHref={
                    typeof rowHrefTemplate === "function"
                      ? rowHrefTemplate(row)
                      : rowHrefTemplate?.replace("{id}", encodeURIComponent(row.id))
                  }
                  selectionEnabled={selectionEnabled}
                />
              ))
            )}
          </Tbody>
        </Table>
      </Div>
      {totalPages > 1 && onPageChange && (
        <Row className="border-t border-neutral-200" padding="inline" align="center" justify="end" gap="sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              onClick={() => onPageChange(p)}
              variant={p === currentPage ? "primary" : "ghost"}
              size="sm"
              className={`h-8 w-8 rounded text-[length:var(--appkit-text-xs)] font-medium transition ${p === currentPage ? "bg-neutral-900 text-white" : "text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface)] hover:bg-[var(--appkit-color-surface-elevated)]"}`}
            >
              {p}
            </Button>
          ))}
        </Row>
      )}
    </Div>
  );
}
