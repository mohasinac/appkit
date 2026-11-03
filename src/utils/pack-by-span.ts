/*
 * WHY: `appkit/src/features/shell/build-sections.tsx`'s `packRows()` already
 *      solves "group same-span items into equal-width rows, full width on
 *      mobile" for form fields (`FieldRow`). Phase 3B's widget system
 *      (`CardElement`/`DashboardCard`, `_internal/shared/features/dashboard/
 *      recent-entry.ts`) needs the IDENTICAL algorithm for a different item
 *      type, at the same moment the form-field version is under active,
 *      heavy churn on a parallel branch (`feat/form-validation`) — see
 *      `build-sections.tsx`'s own packRows doc comment and the plan's "tree
 *      moved substantially underneath this plan" note.
 *
 *      Flagged rather than silently duplicated: this file is a DELIBERATE,
 *      temporary second copy of the packing algorithm (not of the forms
 *      feature's types), kept deliberately out of `features/shell/` so
 *      touching it never collides with that branch's edits. Once the branch
 *      settles, `packRows` in `build-sections.tsx` should be rewritten as a
 *      one-line delegate to `packBySpan` here — see the Duplication Decision
 *      Framework's criterion 3 ("lifetime is short") for why this is the
 *      correct call now rather than either leaving two independent
 *      algorithms forever or risking a merge conflict today.
 *
 * WHAT: `RowSpan` (how much of a row an item claims on desktop — full width
 *       on mobile regardless), `ROW_COLUMNS` (span → column count), and
 *       `packBySpan` (group same-span items into rows up to that count,
 *       breaking on `"full"` or a span change).
 *
 * EXPORTS: RowSpan, ROW_COLUMNS, packBySpan
 *
 * @tag domain:layout
 * @tag layer:utils
 * @tag pattern:none
 * @tag access:universal
 * @tag consumers:DashboardCardRenderer,AdminComposableRegion
 * @tag sideEffects:none
 */

/** How much of a row an item claims on desktop. Everything is 1-up on mobile. */
export type RowSpan = "full" | "pair" | "third" | "quarter";

/** Span → the `<FormGroup columns>` value it packs into. */
export const ROW_COLUMNS: Record<RowSpan, 1 | 2 | 3 | 4> = {
  full: 1,
  pair: 2,
  third: 3,
  quarter: 4,
};

/**
 * Groups items into rows by span: a `"full"` item always breaks the current
 * row (so a wide element is never squeezed alongside a narrow one); mixed
 * spans start a new row too (two `"pair"` items make a clean 2-up; a
 * `"pair"` next to a `"third"` makes neither); a row fills up to
 * `ROW_COLUMNS[span]` items before starting the next one.
 *
 * `getSpan` defaults missing/undefined spans to `"full"` — the correct
 * default for a widget card (every stored card before this mechanism
 * existed has no span data at all, and must keep rendering as one-per-row,
 * identical to today's single vertical stack). This differs from
 * `build-sections.tsx`'s `packRows`, which defaults to `"pair"` — a
 * reasonable default for a FORM field (most inputs are comfortably half-
 * width), but wrong for a widget element that might be a full-bleed image or
 * a long paragraph of rich text.
 */
export function packBySpan<T>(items: T[], getSpan: (item: T) => RowSpan | undefined): T[][] {
  const rows: T[][] = [];
  let current: T[] = [];
  let currentSpan: RowSpan | null = null;

  const flush = () => {
    if (current.length > 0) rows.push(current);
    current = [];
    currentSpan = null;
  };

  for (const item of items) {
    const span = getSpan(item) ?? "full";
    if (span === "full") {
      flush();
      rows.push([item]);
      continue;
    }
    if (currentSpan !== null && (span !== currentSpan || current.length >= ROW_COLUMNS[span])) {
      flush();
    }
    current.push(item);
    currentSpan = span;
  }
  flush();
  return rows;
}
