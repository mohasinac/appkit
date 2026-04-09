/**
 * Sorting Helper
 *
 * Generic helpers for sorting operations.
 */

export type SortOrder = "asc" | "desc";

export function sort<T>(
  array: T[],
  key: keyof T,
  order: SortOrder = "asc",
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });
}
