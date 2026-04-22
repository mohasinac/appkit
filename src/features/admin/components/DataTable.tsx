import type { AdminTableColumn } from "../types";
import { Button, Div, Span } from "../../../ui";

interface DataTableProps<T extends { id: string }> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  emptyLabel?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  isLoading,
  sortKey,
  sortDir,
  onSort,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  emptyLabel = "No records found",
}: DataTableProps<T>) {
  return (
    <Div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <Div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800">
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
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-slate-700">
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
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-neutral-500 dark:text-zinc-400"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-neutral-700 dark:text-zinc-300 ${col.className ?? ""}`}
                    >
                      {col.render
                        ? col.render(row)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? "",
                          )}
                    </td>
                  ))}
                </tr>
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
