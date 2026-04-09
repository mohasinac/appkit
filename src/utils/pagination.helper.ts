/**
 * Pagination Helper
 *
 * Generic helpers for pagination metadata calculations.
 */

export interface PaginationOptions {
  page: number;
  perPage: number;
  total: number;
}

export interface PaginationResult {
  currentPage: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
  startIndex: number;
  endIndex: number;
}

export function calculatePagination(
  options: PaginationOptions,
): PaginationResult {
  const { page, perPage, total } = options;
  const totalPages = Math.ceil(total / perPage);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, total);
  return {
    currentPage,
    perPage,
    total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    startIndex,
    endIndex,
  };
}
