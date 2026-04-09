/**
 * Utility helpers for filter option arrays.
 */

export type FilterOption = { value: string; label: string };

export function getFilterLabel(
  options: ReadonlyArray<FilterOption>,
  value: string,
): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

export function getFilterValue(
  options: ReadonlyArray<FilterOption>,
  label: string,
): string | undefined {
  return options.find((o) => o.label === label)?.value;
}

/** Simple class-name concatenation. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
