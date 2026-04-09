/**
 * Style Helpers
 *
 * UI helpers for dynamic styling and CSS class management.
 */

export function classNames(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export function mergeTailwindClasses(
  ...classes: (string | undefined | null)[]
): string {
  const classArray = classes.filter(Boolean).join(" ").split(" ");
  return Array.from(new Set(classArray)).join(" ");
}
