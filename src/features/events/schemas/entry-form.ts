/**
 * THE EVENT'S ENTRY FORM — resolved from the event document, never from its TYPE.
 *
 * Owner, 2026-11-10: *"do not hardcode the forms for the contest or anything,
 * make them dynamic like how the user can set them up per event — different
 * forms — and keep the website capable to handle that as well."*
 *
 * ## 🛑 THE MECHANISM ALREADY EXISTED. IT WAS GATED ON `event.type`.
 *
 * Measured before writing a line of this file. An event document has carried a
 * full per-instance form definition since long before this lane:
 *
 *  - `SurveyFormField[]` — 12 field types, a label, a placeholder, `required`,
 *    `options[]`, and a `validation` bag (`minLength`/`maxLength`/`min`/`max`/
 *    `pattern`), plus `order`.
 *  - A real authoring UI: `FormFieldBuilder` inside `AdminEventEditorView`,
 *    with an "+ Add field" button and a type picker offering all twelve.
 *  - Generic rendering: `renderDynamicField` in the participate client.
 *  - Generic per-field client validation: `validateField`, same file.
 *  - Generic STORAGE: the entry document's `formResponses` bag, written by
 *    `enterEvent` and read by the admin entries view and the CSV export.
 *
 * So the machinery was all there. What made it look like a survey feature was
 * three `event.type ===` comparisons:
 *
 *     // EventParticipateClient, before
 *     const isSurvey = event.type === "survey";
 *     const isFeedback = event.type === "feedback";
 *     const formFields = isSurvey ? (event.surveyConfig?.formFields ?? [])
 *       : isFeedback ? (event.feedbackConfig?.formFields ?? []) : [];
 *
 *     // event-actions.ts, before
 *     if ((event.type === "survey" || event.type === "feedback") && …)
 *
 *     // AdminEventEditorView, before
 *     {values.type === "survey" && <FormFieldBuilder … />}
 *
 * That is exactly the shape CLAUDE.md's governing principle forbids — *a
 * mechanism never asks "what type is this?"* — and it is why a contest could
 * not have a form. This module is the replacement: ONE resolver, read by the
 * renderer, by the server write path and by the authoring UI, so none of the
 * three can disagree about what this event's form is.
 *
 * ## 🛑 WHERE THE DEFINITION LIVES, AND WHY THERE ARE THREE KEYS
 *
 * `entryForm.fields` is the type-neutral key, and the only one the authoring
 * UI writes. `surveyConfig.formFields` and `feedbackConfig.formFields` are
 * read as FALLBACKS so that every survey and feedback event already stored
 * keeps working with no migration — the owner's live events must not change
 * behaviour because the field moved.
 *
 * ⚠ It is a read-only fallback chain, NOT a dual write. A dual write is how
 * two copies of one list come to disagree; `entryForm.fields` wins when
 * present, and an edited legacy event simply gains the new key and stops
 * consulting the old one.
 *
 * ## 🛑 MEDIA IS DELIBERATELY *NOT* FOLDED IN HERE
 *
 * `FormFieldType` includes `"file"`, and that field type **does not upload
 * anything** — `renderDynamicField` stores `files?.[0]?.name`, a filename
 * string, and no byte reaches storage. It is not wired up and this module does
 * not pretend otherwise: see {@link isUnsupportedFieldType}.
 *
 * Real entry media is its own first-class mechanism — `event.entryMedia` caps,
 * `checkEntryMedia` enforcement, the `media[]` array on the entry, uploads
 * signed through the media subdomain. `mocks/40-forms-catalogue.qm` specifies
 * exactly that split for the contest entry form (*"Media rules come from
 * config, not this form"*), and `mocks/10-forms.qm` keeps media as its own
 * widget. Collapsing a working upload pipeline into a field type that stores
 * filenames would be a regression dressed as a generalisation.
 *
 * ⚠ FLAGGED, not fixed: a genuine `media` field type inside this definition
 * needs the field registry in `ui/components/form-field-registry.ts` (which
 * already has `"image"` and `"media"` renderer slots for precisely this) and a
 * decision about whether its value lands in `formResponses` or in `media[]`.
 * That is a design decision, not an edit.
 *
 * @tag domain:events
 * @tag layer:schema
 */

import type { FormFieldType, SurveyFormField } from "../types";

/**
 * The type-neutral per-event form definition.
 *
 * 🛑 `fields` only, for now, and that is deliberate restraint: a `title`, a
 * `submitLabel` or a step list would each be a config key with no reader, and
 * "declared but unwired" is the defect class CLAUDE.md names as recurring.
 */
export interface EventEntryFormDefinition {
  fields: SurveyFormField[];
}

/** The minimum of an event document this module reads. */
export interface EntryFormCarrier {
  entryForm?: { fields?: unknown } | null | undefined;
  surveyConfig?: { formFields?: unknown } | null | undefined;
  feedbackConfig?: { formFields?: unknown } | null | undefined;
}

/**
 * The field types this build can RENDER as something a user can fill in.
 *
 * 🛑 NOT a validation allow-list, and the distinction matters. A stored `type`
 * this build does not know must still render — CLAUDE.md: *"Unknown values
 * degrade, never throw. Newer config against an older deploy must not take a
 * public page down."* This set exists so an unsupported type can be reported
 * on an admin screen instead of silently rendering as a text box forever.
 */
const RENDERABLE_FIELD_TYPES = new Set<string>([
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "date",
  "rating",
]);

/**
 * Is this field type one this build cannot honour?
 *
 * Two distinct cases, both answered `true`:
 *
 *  - A type from a NEWER config than this deploy understands. It degrades to a
 *    text input, which is the recoverable direction.
 *  - 🛑 `"file"`, which is in `FormFieldType` and in the admin type picker and
 *    **does not work**. `renderDynamicField` stores the chosen file's NAME and
 *    uploads nothing, so an organiser who builds a form with a file field gets
 *    a string where they expected an image. Reporting it is the honest
 *    behaviour; silently accepting it is how `entryMedia` came to be enforced
 *    by a validator with no UI.
 */
export function isUnsupportedFieldType(type: string): boolean {
  return !RENDERABLE_FIELD_TYPES.has(type);
}

/** One stored row → a `SurveyFormField`, or `null` if it is not a field at all. */
function toField(raw: unknown, index: number): SurveyFormField | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r["id"] === "string" ? r["id"] : "";
  if (!id) return null;
  const validation = r["validation"];
  return {
    id,
    /*
     * 🛑 Cast, NOT validated against a closed set. CLAUDE.md: *a closed
     * `z.enum` is a defect, not a safeguard — the types we ship are default
     * templates, not the permitted set.* An unrecognised value survives the
     * read and is reported by `isUnsupportedFieldType`; the renderer's final
     * `else` branch gives it a text input rather than dropping the field.
     */
    type: (typeof r["type"] === "string" ? r["type"] : "text") as FormFieldType,
    label: typeof r["label"] === "string" ? r["label"] : id,
    ...(typeof r["placeholder"] === "string" ? { placeholder: r["placeholder"] } : {}),
    required: r["required"] === true,
    ...(Array.isArray(r["options"])
      ? { options: r["options"].filter((o): o is string => typeof o === "string") }
      : {}),
    ...(validation && typeof validation === "object"
      ? { validation: validation as SurveyFormField["validation"] }
      : {}),
    /*
     * `order` falls back to the array INDEX rather than to 0. With every row
     * at 0 a stable sort is a no-op, so the stored order is preserved — which
     * is what an author who never set `order` meant. Defaulting to 0 and then
     * sorting would also work today and would silently reorder the moment one
     * field got an explicit order.
     */
    order: typeof r["order"] === "number" && Number.isFinite(r["order"]) ? r["order"] : index,
  };
}

/**
 * THIS EVENT's entry form, in display order.
 *
 * Precedence: `entryForm.fields`, then `surveyConfig.formFields`, then
 * `feedbackConfig.formFields`. Never `event.type`.
 *
 * Returns an EMPTY array when the event declares no form — which is the
 * majority of events and is not an error. The caller renders whatever else the
 * event collects (media, a poll) and the generic "no details needed" copy only
 * when there is genuinely nothing.
 */
export function resolveEntryFormFields(
  event: EntryFormCarrier | null | undefined,
): SurveyFormField[] {
  const source =
    (Array.isArray(event?.entryForm?.fields) && event.entryForm.fields.length > 0
      ? event.entryForm.fields
      : undefined) ??
    (Array.isArray(event?.surveyConfig?.formFields) &&
    event.surveyConfig.formFields.length > 0
      ? event.surveyConfig.formFields
      : undefined) ??
    (Array.isArray(event?.feedbackConfig?.formFields)
      ? event.feedbackConfig.formFields
      : []);

  return (source as unknown[])
    .map((raw, index) => toField(raw, index))
    .filter((f): f is SurveyFormField => f !== null)
    .sort((a, b) => a.order - b.order);
}

/**
 * Check ONE answer against ONE field's declared rules.
 *
 * 🛑 THE SERVER CALLS THIS TOO, and until 2026-11-10 it did not exist as a
 * shared function. `event-actions.ts` re-checked only `required` and ignored
 * every other rule, while the client checked all of them — so `maxLength: 50`
 * was enforced by a form and by nothing else, and a direct POST wrote whatever
 * it liked. One function, both callers.
 *
 * Returns the reason, or `null` to pass. A string rather than a boolean
 * because the participant sees it — the same contract `checkEntryMedia` uses.
 *
 * ⚠ An UNSUPPORTED field type is never *refused* here. Refusing it would take
 * a public entry form down on an event authored against a newer deploy; the
 * declared rules that still make sense (`required`, the string and number
 * bounds) are applied to whatever value arrived.
 */
export function checkEntryFormField(
  field: SurveyFormField,
  value: unknown,
): string | null {
  const v = field.validation;
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (field.required && empty) {
    return `${field.label || "This field"} is required.`;
  }
  /*
   * Bounds are checked only on a value that EXISTS. An optional field left
   * blank must not fail `minLength`, which is the obvious way to make an
   * optional field unsubmittable.
   */
  if (empty) return null;

  if (typeof value === "string") {
    if (v?.minLength !== undefined && value.length < v.minLength) {
      return `${field.label}: minimum ${v.minLength} characters required.`;
    }
    if (v?.maxLength !== undefined && value.length > v.maxLength) {
      return `${field.label}: maximum ${v.maxLength} characters allowed.`;
    }
    if (v?.pattern) {
      try {
        if (!new RegExp(v.pattern).test(value)) {
          return `${field.label}: value does not match the required format.`;
        }
      } catch {
        /*
         * An invalid stored pattern is SKIPPED, not failed. It is an authoring
         * mistake on the event, and the person it would block is a participant
         * who cannot fix it. Degrade; an admin screen is where a bad pattern
         * belongs.
         */
      }
    }
  }

  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && field.type === "number"
        ? Number(value)
        : NaN;
  if (Number.isFinite(numeric)) {
    if (v?.min !== undefined && numeric < v.min) {
      return `${field.label}: minimum value is ${v.min}.`;
    }
    if (v?.max !== undefined && numeric > v.max) {
      return `${field.label}: maximum value is ${v.max}.`;
    }
  }

  return null;
}

/**
 * Check a whole `formResponses` bag against this event's form definition.
 *
 * Returns the FIRST reason, or `null` to pass. First rather than all, because
 * the server surfaces one `ValidationError` message; the CLIENT collects every
 * failure per field, which is what `mocks/29-forms-inputs.qm` specifies (one
 * banner at the top listing every failure as a link to its field).
 */
export function checkEntryFormResponses(
  fields: readonly SurveyFormField[],
  responses: Record<string, unknown> | undefined,
): string | null {
  for (const field of fields) {
    const problem = checkEntryFormField(field, responses?.[field.id]);
    if (problem) return problem;
  }
  return null;
}
