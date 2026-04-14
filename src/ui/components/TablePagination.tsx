"use client";

import React from "react";
import { Div } from "./Div";
import { Pagination } from "./Pagination";
import { Select } from "./Select";
import { Span, Text } from "./Typography";

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
      <Div
        role="navigation"
        aria-label={l.paginationLabel}
        className={[
          "appkit-table-pagination appkit-table-pagination--compact",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isLoading}
          size="sm"
          maxVisible={5}
        />
      </Div>
    );
  }

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  return (
    <Div
      role="navigation"
      aria-label={l.paginationLabel}
      className={["appkit-table-pagination", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Text
        size="xs"
        variant="none"
        className="appkit-table-pagination__summary"
      >
        {l.showing}{" "}
        <Span className="appkit-table-pagination__summary-value">
          {from}–{to}
        </Span>{" "}
        {l.of}{" "}
        <Span className="appkit-table-pagination__summary-value">
          {new Intl.NumberFormat().format(total)}
        </Span>{" "}
        {l.results}
      </Text>

      <Div className="appkit-table-pagination__controls">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isLoading}
        />
      </Div>

      {onPageSizeChange && (
        <Div className="appkit-table-pagination__size">
          <label
            htmlFor="page-size-select"
            className="appkit-table-pagination__size-label"
          >
            {l.perPage}
          </label>
          <Select
            id="page-size-select"
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
            aria-label={l.perPage}
            className="appkit-table-pagination__size-select"
            options={pageSizeOptions.map((s) => ({
              value: String(s),
              label: String(s),
            }))}
          />
        </Div>
      )}
    </Div>
  );
}
