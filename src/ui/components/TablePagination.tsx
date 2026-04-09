"use client";

import React from "react";
import { Pagination } from "./Pagination";
import { Select } from "./Select";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface TablePaginationLabels {
  paginationLabel?: string;
  showing?: string;
  of?: string;
  results?: string;
  perPage?: string;
}

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
  labels?: TablePaginationLabels;
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  isLoading = false,
  className = "",
  compact = false,
  labels,
}: TablePaginationProps) {
  const l = {
    paginationLabel: labels?.paginationLabel ?? "Pagination",
    showing: labels?.showing ?? "Showing",
    of: labels?.of ?? "of",
    results: labels?.results ?? "results",
    perPage: labels?.perPage ?? "Per page",
  };

  if (compact) {
    return (
      <div
        role="navigation"
        aria-label={l.paginationLabel}
        className={`flex items-center gap-0.5 ${className}`}
      >
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isLoading}
          size="sm"
          maxVisible={5}
        />
      </div>
    );
  }

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  return (
    <div
      role="navigation"
      aria-label={l.paginationLabel}
      className={[
        "flex flex-col sm:flex-row items-center gap-3 px-4 py-3",
        "border-t border-zinc-100 dark:border-slate-800/80",
        className,
      ].join(" ")}
    >
      <p className="text-xs text-zinc-400 dark:text-slate-500 tabular-nums sm:mr-auto">
        {l.showing}{" "}
        <span className="font-semibold text-zinc-600 dark:text-slate-300">
          {from}–{to}
        </span>{" "}
        {l.of}{" "}
        <span className="font-semibold text-zinc-600 dark:text-slate-300">
          {new Intl.NumberFormat().format(total)}
        </span>{" "}
        {l.results}
      </p>

      <div className="rounded-xl p-0.5 bg-zinc-100 dark:bg-slate-800 inline-flex">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isLoading}
        />
      </div>

      {onPageSizeChange && (
        <div className="flex items-center gap-1.5 sm:ml-1">
          <label
            htmlFor="page-size-select"
            className="text-xs text-zinc-400 dark:text-slate-500 whitespace-nowrap"
          >
            {l.perPage}
          </label>
          <Select
            id="page-size-select"
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
            aria-label={l.perPage}
            className="text-xs h-7 py-0 px-2 rounded-lg"
            options={pageSizeOptions.map((s) => ({
              value: String(s),
              label: String(s),
            }))}
          />
        </div>
      )}
    </div>
  );
}
