"use client";

/*
 * WHY: Four surfaces asked a moderator to justify a decision, and not one of
 *      them checked that they had. `admin/moderation/page.tsx` and
 *      `ModerationDetailActions` each rendered their own reject-reason modal;
 *      `admin/reports/page.tsx` and `ReportDetailActions` each rendered their
 *      own resolution-note modal. All four submitted an empty string happily,
 *      so media could be blocked and a report closed with no record of why.
 *
 * WHAT: One modal for both decisions.
 *
 * ## Why one component and not two
 *
 * The two are the same observable thing — *a decision plus a note that is
 * required before it can be made* — differing only in vocabulary. Per the
 * Duplication Decision Framework this is a consolidate, on two counts: the
 * copies have the same prop surface, and a single validation fix would
 * otherwise have needed four commits. The differences are all DATA (labels,
 * which field carries the note, which schema validates it), not branching, so
 * there are no conditional props to trade away.
 *
 * ## The note field is named by the caller
 *
 * Moderation calls it `reason`, reports call it `resolution`. Naming it
 * generically here would mean translating on the way out, and a schema issue
 * on `resolution` would then have no field to land on — the error would fall
 * back to a banner, which is the thing this replaces.
 *
 * EXPORTS: ReviewDecisionModal, type ReviewDecisionModalProps
 *
 * @tag domain:store-extensions,moderation,reports
 * @tag layer:component
 * @tag pattern:form
 * @tag access:client
 * @tag consumers:admin/moderation,admin/reports
 * @tag sideEffects:none
 */

import { useState } from "react";
import type { ZodType } from "zod";
import { Modal } from "../../../ui/components/Modal";
import { Button } from "../../../ui/components/Button";
import { Row } from "../../../ui/components/Layout";
import { Stack } from "../../../ui/components/Layout";
import { Form } from "../../../ui/components/Form";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { useToast } from "../../../ui/components/Toast";
import { normalizeError } from "../../../errors/normalize";

/**
 * Generic over the schema's OUTPUT type, so a caller's `onConfirm` receives
 * `ModerationReviewFormValues` / `ReportReviewFormValues` rather than an
 * untyped bag. A `Record<string, unknown>` here would put the very seam this
 * component exists to close straight back into the callback signature.
 */
export interface ReviewDecisionModalProps<TValues> {
  isOpen: boolean;
  onClose: () => void;
  /** Modal heading, e.g. "Reject media". */
  title: string;
  /** The schema BOTH this modal and its route validate against. */
  schema: ZodType<TValues>;
  /** The status this decision sets — parsed as part of the payload. */
  status: string;
  /** Which key carries the note: `reason` for moderation, `resolution` for reports. */
  noteField: string;
  noteLabel: string;
  noteHelp?: string;
  notePlaceholder?: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  /** Called only once the payload has parsed cleanly, with the PARSED value. */
  onConfirm: (values: TValues) => Promise<void>;
}

export function ReviewDecisionModal<TValues>({
  isOpen,
  onClose,
  title,
  schema,
  status,
  noteField,
  noteLabel,
  noteHelp,
  notePlaceholder,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
}: ReviewDecisionModalProps<TValues>) {
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setNote("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} size="sm">
      <Form schema={schema} onSubmit={(e) => e.preventDefault()}>
        {({ setFieldError, clearErrors }) => (
          <Stack gap="md">
            <FormErrorSummary />
            <FieldTextarea
              name={noteField}
              label={noteLabel}
              hint={noteHelp}
              rows={4}
              required
              value={note}
              onChange={setNote}
              placeholder={notePlaceholder}
            />
            {/* The submit button lives INSIDE the Form, not in Modal's
                `actions` slot — the render-prop helpers that put an error on
                the field are only in scope here. */}
            <Row justify="end" gap="sm">
              <Button variant="ghost" type="button" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant={confirmVariant}
                type="submit"
                disabled={submitting}
                isLoading={submitting}
                onClick={async () => {
                  clearErrors();
                  const payload = { status, [noteField]: note };
                  const parsed = schema.safeParse(payload);
                  if (!parsed.success) {
                    applyZodIssues(parsed.error.issues, setFieldError);
                    return;
                  }
                  setSubmitting(true);
                  try {
                    await onConfirm(parsed.data);
                    close();
                  } catch (err) {
                    // Deliberately stays OPEN on failure. Closing would discard
                    // the note the reviewer just typed, and a decision that did
                    // not save must not look like one that did.
                    void normalizeError(err);
                    showToast("Couldn't save that decision. Try again.", "error");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {confirmLabel}
              </Button>
            </Row>
          </Stack>
        )}
      </Form>
    </Modal>
  );
}
