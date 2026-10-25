"use client";

/**
 * A minimal add/remove repeater for a list of editable rows.
 *
 * ── Why this moved here ─────────────────────────────────────────────────────
 *
 * It lived inside `AdminCategoryEditorView` with a note on it:
 *
 *     Deliberately NOT a new appkit primitive: three local shapes with three
 *     different row renderers is not yet the Rule of Three on a *component* —
 *     it is one container used three times with a render prop. Promote it
 *     when a fourth caller appears outside this file.
 *
 * That was right, and the brand editor is the fourth caller. Promoted on the
 * condition its own author set, rather than copied — a second repeater would
 * be the shape the Duplication Framework exists to stop, and the three
 * existing call sites keep working unchanged because the API did not move.
 *
 * ── The row identity question ───────────────────────────────────────────────
 *
 * 🛑 `key={i}` IS THE INDEX, AND THAT IS A REAL LIMITATION, not an oversight.
 * These rows have no stable id — they are literal form values a human is
 * typing, created blank and filled in — so there is nothing else to key on.
 * The consequence is that REMOVING a row remounts every row below it, which
 * loses focus and any uncommitted IME composition in those inputs.
 *
 * It is tolerable here because the lists are short (`max` is 8 or fewer at
 * every call site) and removal is rare compared to typing. It would not be
 * tolerable on a long or reorderable list; if one appears, give the rows an
 * id at creation and key on that instead of reaching for this.
 */

import React from "react";
import { Button } from "./Button";
import { Div } from "./Div";
import { Stack } from "./Layout";
import { Text } from "./Typography";

export interface RepeaterProps<T> {
  rows: T[];
  onChange: (next: T[]) => void;
  /** Builds an empty row. Called on every "add". */
  blank: () => T;
  addLabel: string;
  /**
   * Renders one row's fields. `set` patches THAT row only — callers never
   * splice the array themselves, which is what keeps the immutable update in
   * one place instead of at every call site.
   */
  renderRow: (row: T, set: (patch: Partial<T>) => void) => React.ReactNode;
  /**
   * Hard cap. Required rather than optional: every one of these lists renders
   * somewhere with a layout budget — category highlights sit above the FAQs
   * on a public page — and "unbounded by default" is how a form becomes a way
   * to break the page it feeds.
   */
  max: number;
}

export function Repeater<T>({
  rows,
  onChange,
  blank,
  addLabel,
  renderRow,
  max,
}: RepeaterProps<T>) {
  return (
    <Stack gap="sm">
      {rows.map((row, i) => (
        <Div key={i} rounded="lg" border="default" padding="sm">
          <Stack gap="xs">
            {renderRow(row, (patch) =>
              onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))),
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </Stack>
        </Div>
      ))}
      {rows.length < max ? (
        <Button variant="secondary" size="sm" onClick={() => onChange([...rows, blank()])}>
          {addLabel}
        </Button>
      ) : (
        <Text size="xs" color="muted">
          Maximum of {max} reached.
        </Text>
      )}
    </Stack>
  );
}

export default Repeater;
