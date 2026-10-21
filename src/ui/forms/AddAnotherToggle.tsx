"use client";

/**
 * "Create & add another" — the toggle, and the submit label that follows it.
 *
 * Entering a batch of similar records is the one thing every create form in
 * this app is bad at: save, land on a detail page, navigate back, re-pick the
 * store, re-pick the category, re-pick the listing type. Four of those five
 * steps are the same every time.
 *
 * 🛑 THE TOGGLE RENDERS NOTHING UNLESS THE FORM OPTED IN, and that is the
 * point rather than a nicety. `FormShell` does not own the draft, so it cannot
 * know what a fresh one looks like or which fields are sticky — only the
 * caller's submit handler can keep this promise. A checkbox on all ~59 editors
 * when one honours it is a control that does nothing on 58 of them, which is
 * the defect shape this codebase keeps paying for: a declaration with no
 * reader.
 *
 * So: `useFormShellState(schema, nav, { allowAddAnother: true })` offers it,
 * the handler reads `addAnother`, and `audit-add-another-honoured` checks that
 * whoever offers it also reads it.
 */

import { useContext } from "react";
import { FormShellContext } from "./FormShell";
import { FieldCheckbox } from "./FieldCheckbox";

export interface AddAnotherToggleProps {
  /** What is being created, for the label: "listing" → "Create & add another listing". */
  noun?: string;
  /** Hidden while editing an existing record — see the note below. */
  isCreate?: boolean;
}

export function AddAnotherToggle({
  noun,
  isCreate = true,
}: AddAnotherToggleProps) {
  const ctx = useContext(FormShellContext);

  /*
   * 🛑 `useContext` DIRECTLY, not `useFormShell()`, which throws without a
   * provider. A toggle that crashes the form it is decorating is worse than
   * one that renders nothing, and this is library code adjusting to its
   * surroundings (Root Cause #20 — no provider must fail CLOSED, not loudly).
   */
  if (!ctx?.addAnotherEnabled) return null;

  /*
   * 🛑 Hidden on EDIT. "Add another" after changing an existing record would
   * have to mean "save this, then start a new one", which is a different and
   * surprising action — and the sticky-field reasoning does not apply, because
   * nobody edits a batch of records by starting from the last one they fixed.
   */
  if (!isCreate) return null;

  return (
    <FieldCheckbox
      name="addAnother"
      label={noun ? `Create & add another ${noun}` : "Create & add another"}
      hint="Stay on this form after saving, keeping the store, category and type."
      checked={ctx.addAnother}
      onChange={(next) => ctx.setAddAnother(next)}
    />
  );
}

/**
 * The submit button's label, given the toggle.
 *
 * 🛑 A SEPARATE HELPER BECAUSE THE LABEL MUST CHANGE. A button that says
 * "Create listing" and then does not navigate has lied about what it did, and
 * the user's next move is to press it again — which creates a duplicate. The
 * label is the only thing telling them the destination changed.
 */
export function addAnotherSubmitLabel(
  base: string,
  addAnother: boolean,
): string {
  return addAnother ? `${base} & add another` : base;
}
