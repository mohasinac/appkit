"use client";

/**
 * The one owner of a form field's label.
 *
 * ── THE FOUR OWNERS THIS REPLACES ───────────────────────────────────────────
 *
 * `FieldInput`, `FieldSelect` and `FieldTextarea` each carried a BYTE-IDENTICAL
 * copy of the same five lines, and `FormField` carried a fourth that had
 * already drifted: its required marker is `>*<` where the other three are
 * `> *<`, so the asterisk sits flush against the label text on ~40 screens and
 * spaced on the rest. Nobody chose that. It is what four copies of five lines
 * always become, and it is the smallest possible demonstration of why this
 * file exists.
 *
 * A fifth family — `Input`, `Select`, `Textarea`, `Toggle`, `Radio`, `Slider`,
 * `TagInput`, `DateInput`, `OtpInput` — each accept their own `label` prop and
 * render it differently again. Those are NOT migrated here and should not be:
 * see the note at the bottom on why a primitive keeps its own label.
 *
 * ── LABEL PLACEMENT ─────────────────────────────────────────────────────────
 *
 * 🛑 PLACEMENT IS A SECTION-LEVEL DECISION, NOT A PER-FIELD ONE. A form where
 * one field labels above and its neighbour labels inline reads as broken
 * rather than as varied, and the choice is about the density of a whole
 * section — a 12-field address block wants inline, a 3-field settings panel
 * wants above. So it comes from context, set once by `SectionDef`, and a field
 * only overrides it when it genuinely differs from its neighbours.
 *
 * `"hidden"` is NOT "no label". It renders the label to assistive technology
 * and hides it visually, which is the correct treatment for a field whose
 * purpose is obvious from context (a search box with a magnifier, a quantity
 * stepper in a table row). Passing no `label` at all is what produces an
 * unlabelled field, and there are 392 of those — `"hidden"` is the fix for the
 * subset that genuinely should not show one, not a way to silence the count.
 */

import { createContext, useContext } from "react";
import { Label, Span } from "../components/Typography";

export type LabelPlacement = "above" | "inline" | "hidden";

/**
 * Set by a section, read by every field inside it.
 *
 * Defaults to `"above"` — the current behaviour of all four owners — so
 * introducing this changes no existing markup. The concept is new; the output
 * is not.
 */
export const LabelPlacementContext = createContext<LabelPlacement>("above");

export function useLabelPlacement(override?: LabelPlacement): LabelPlacement {
  const fromSection = useContext(LabelPlacementContext);
  return override ?? fromSection;
}

export interface FieldLabelProps {
  /**
   * The `id` of the control this labels. The normal case.
   *
   * 🛑 OPTIONAL ONLY FOR THE `aria-labelledby` DIRECTION, and omitting it on a
   * real input is how an unlabelled field is made. `htmlFor` associates with a
   * LABELABLE element — `input`, `select`, `textarea`, `button`, `output`,
   * `meter`, `progress` — and nothing else. A `contenteditable` div (the rich
   * text editor) is not one, so there `htmlFor` points at nothing: the label
   * looks correct to a human and the control has no accessible name.
   *
   * For those, give the LABEL an `id` and have the control carry
   * `aria-labelledby` pointing back at it. Exactly one of `htmlFor` or `id`
   * should be set.
   */
  htmlFor?: string;
  /** This label's own id, for a control that points back via `aria-labelledby`. */
  id?: string;
  children: React.ReactNode;
  required?: boolean;
  /** Overrides the section's placement. Use only when this field differs. */
  placement?: LabelPlacement;
  className?: string;
}

/**
 * 🛑 `sr-only`, not `display: none`, for the hidden placement.
 *
 * A `display: none` label is removed from the accessibility tree, so hiding a
 * label that way produces exactly the unlabelled field it was meant to avoid —
 * the screen reader announces "edit text" and the visual user sees a box with
 * a placeholder. `sr-only` keeps it announced and off-screen, which is the
 * whole distinction between "visually hidden" and "absent".
 */
const PLACEMENT_CLASS: Record<LabelPlacement, string> = {
  above: "appkit-form-field__label",
  inline: "appkit-form-field__label appkit-form-field__label--inline",
  hidden: "sr-only",
};

export function FieldLabel({
  htmlFor,
  id,
  children,
  required,
  placement,
  className = "",
}: FieldLabelProps) {
  const resolved = useLabelPlacement(placement);

  return (
    <Label
      htmlFor={htmlFor}
      id={id}
      className={[PLACEMENT_CLASS[resolved], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      {/*
        The space before the asterisk is deliberate and is the drift this file
        removes: three owners had `> *<` and the fourth had `>*<`. A required
        marker touching the last letter reads as part of the word.
      */}
      {required && <Span className="appkit-form-field__required"> *</Span>}
    </Label>
  );
}

/*
 * ── WHY `Input`/`Select`/`Textarea` KEEP THEIR OWN `label` PROP ─────────────
 *
 * It looks like more duplication and it is not. Those are the BARE primitives:
 * they are used outside a FormShell entirely — in a toolbar, a filter row, a
 * modal footer, a table cell — where there is no field wrapper, no error slot
 * and no placement context, and where a label is sometimes the only chrome.
 * Collapsing them into this would mean every such call site has to mount a
 * wrapper to get a label, which is a worse trade than one duplicated `<Label>`.
 *
 * The real rule is which one a CALLER reaches for: inside a form, the `Field*`
 * wrapper (Rule #9), which now has exactly one label implementation. The bare
 * primitives' own labels are for everywhere else, and
 * `audit-field-label-owner` keeps the wrappers from growing a fifth copy.
 */
