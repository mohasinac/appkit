export const SORT_DIR = { ASC: "" as const, DESC: "-" as const } as const;
export type SortDirection = keyof typeof SORT_DIR;

/** Build a Sieve sort token: sortBy("createdAt") → "-createdAt", sortBy("name","ASC") → "name" */
export function sortBy(field: string, dir: SortDirection = "DESC"): string {
  return `${SORT_DIR[dir]}${field}`;
}
