/**
 * `applyZodIssues` — pipe every issue from a validation failure into a form's
 * error map, so they render inline on `<FieldInput>` etc. rather than as a
 * toast.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * It used to live in `FormShell.tsx`, which is a `"use client"` React module.
 * `client/api/surface-error.ts` needs this function to route server-side
 * validation failures to inline field errors, and that file is deliberately
 * hook-free and React-free (see its header) so it can be called from outside a
 * hook boundary — e.g. inside Button's non-hook click wrapper. Importing
 * FormShell there would have dragged React and the whole form runtime into it.
 *
 * This is a MOVE, not a barrel re-export: `FormShell.tsx` imports it from here.
 *
 * Keys are the full dotted/indexed path (`"video.duration"`, `"images.2"`),
 * not just the top-level segment — a plain `issue.path[0]` key would collapse
 * every nested issue under one object onto the same map entry, silently
 * dropping all but the last. Top-level-only fields (the common case) are
 * unaffected: a single-segment path joins to the same string as before.
 *
 * Root-level `.refine()` issues (empty `path: []`, no owning field) are still
 * skipped — there is no field to attach them to, so the caller must surface
 * those some other way (they fall through to a toast in `surfaceError`).
 */
export function applyZodIssues(
  issues: ReadonlyArray<{ path?: ReadonlyArray<PropertyKey>; message: string }>,
  setFieldError: (name: string, error: string | null) => void,
): void {
  for (const issue of issues) {
    if (!issue.path || issue.path.length === 0) continue;
    const key = issue.path.map(String).join(".");
    setFieldError(key, issue.message);
  }
}

/** True when at least one issue carries a field path we can attach it to. */
export function hasAttachableIssue(
  issues: ReadonlyArray<{ path?: ReadonlyArray<PropertyKey> }> | undefined,
): boolean {
  return Boolean(issues?.some((i) => i.path && i.path.length > 0));
}
