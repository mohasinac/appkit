"use client";

import React from "react";
import type { PaginationConfig } from "@mohasinac/contracts";
import { DEFAULT_PAGINATION_CONFIG } from "@mohasinac/contracts";

/**
 * Pagination — smart ellipsis pagination with prev/next chevrons.
 *
 * Accepts either individual props OR a `paginationConfig` object
 * (merged with DEFAULT_PAGINATION_CONFIG). Individual props take precedence.
 */

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /**
   * Composable pagination config. Merged with DEFAULT_PAGINATION_CONFIG.
   * Individual flat props override this.
   */
  paginationConfig?: Partial<PaginationConfig>;
  /** Max visible page buttons before ellipsis kicks in. Default: 7 */
  maxVisible?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number,
): (number | "...")[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, currentPage + halfVisible);

  if (currentPage <= halfVisible) endPage = maxVisible;
  if (currentPage >= totalPages - halfVisible)
    startPage = totalPages - maxVisible + 1;

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push("...");
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-1 min-w-[28px]",
  md: "text-sm px-3 py-1.5 min-w-[36px]",
  lg: "text-base px-4 py-2 min-w-[44px]",
} as const;

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  paginationConfig,
  maxVisible: maxVisibleProp,
  showFirstLast: showFirstLastProp,
  showPrevNext: showPrevNextProp,
  disabled = false,
  size: sizeProp,
  className = "",
}: PaginationProps) {
  const resolved = { ...DEFAULT_PAGINATION_CONFIG, ...paginationConfig };
  const maxVisible = maxVisibleProp ?? resolved.maxVisible;
  const showFirstLast = showFirstLastProp ?? resolved.showFirstLast;
  const showPrevNext = showPrevNextProp ?? resolved.showPrevNext;
  const size = sizeProp ?? resolved.size;
  const handle = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage)
      return;
    onPageChange(page);
  };

  const btnClass = (active: boolean, off: boolean) => {
    const base = `${SIZE_CLASSES[size]} rounded border font-medium transition-colors`;
    if (off)
      return `${base} bg-zinc-100 dark:bg-slate-800 opacity-50 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-slate-700 cursor-not-allowed`;
    if (active)
      return `${base} bg-primary-600 text-white border-primary-600 cursor-default`;
    return `${base} bg-white dark:bg-slate-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-slate-700 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:border-zinc-300 dark:hover:border-slate-600 cursor-pointer`;
  };

  const pages = getPageNumbers(currentPage, totalPages, maxVisible);

  return (
    <nav
      className={`flex items-center gap-1 ${className}`}
      aria-label="Pagination"
    >
      {showFirstLast && (
        <button
          type="button"
          className={btnClass(false, disabled || currentPage === 1)}
          onClick={() => handle(1)}
          disabled={disabled || currentPage === 1}
          aria-label="First page"
        >
          «
        </button>
      )}
      {showPrevNext && (
        <button
          type="button"
          className={btnClass(false, disabled || currentPage === 1)}
          onClick={() => handle(currentPage - 1)}
          disabled={disabled || currentPage === 1}
          aria-label="Previous page"
        >
          ‹
        </button>
      )}

      {pages.map((page, i) =>
        page === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className={`${SIZE_CLASSES[size]} text-zinc-400 dark:text-zinc-500 text-center`}
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={btnClass(
              page === currentPage,
              disabled && page !== currentPage,
            )}
            onClick={() => handle(page)}
            disabled={disabled}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ),
      )}

      {showPrevNext && (
        <button
          type="button"
          className={btnClass(false, disabled || currentPage === totalPages)}
          onClick={() => handle(currentPage + 1)}
          disabled={disabled || currentPage === totalPages}
          aria-label="Next page"
        >
          ›
        </button>
      )}
      {showFirstLast && (
        <button
          type="button"
          className={btnClass(false, disabled || currentPage === totalPages)}
          onClick={() => handle(totalPages)}
          disabled={disabled || currentPage === totalPages}
          aria-label="Last page"
        >
          »
        </button>
      )}
    </nav>
  );
}
