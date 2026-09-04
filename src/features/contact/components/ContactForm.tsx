"use client"
import { normalizeError } from "../../../errors/normalize";
import React, { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { Button, Div, Heading, Stack, Text } from "../../../ui";
import {
  useFormShellState,
  FormShellContext,
  FormErrorSummary,
  FieldInput,
  FieldTextarea,
} from "../../../ui/forms";
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const CLS_ERROR_BANNER = "rounded-lg bg-error-surface dark:bg-error-surface border border-error dark:border-error px-[var(--appkit-space-4)] py-[var(--appkit-space-3)] text-[length:var(--appkit-text-sm)] text-error dark:text-error";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  labels?: {
    title?: string;
    nameLabel?: string;
    namePlaceholder?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    subjectLabel?: string;
    subjectPlaceholder?: string;
    messageLabel?: string;
    messagePlaceholder?: string;
    submitButton?: string;
    submittingButton?: string;
    successTitle?: string;
    successDescription?: string;
    sendAnotherButton?: string;
    errorGeneric?: string;
    validationRequired?: string;
    validationEmail?: string;
    validationMessageTooShort?: string;
  };
  className?: string;
}

const INITIAL_FORM: ContactFormData = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm({
  onSubmit,
  labels = {},
  className = "",
}: ContactFormProps) {
  const [form, setForm] = useState<ContactFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = useCallback(
    (partial: Partial<ContactFormData>) => setForm((f) => ({ ...f, ...partial })),
    [],
  );

  /*
   * One section, `required` — so after the 2026-09-04 collapse fix it renders
   * as a plain heading with no chevron and cannot be hidden. A contact form
   * has nothing optional to fold away; the section exists to give the fields
   * an owner for error attribution, not to be collapsible.
   */
  const sections: SectionDef<ContactFormData>[] = useMemo(
    () => [
      {
        id: "message",
        label: labels.title ?? "Send us a message",
        required: true,
        fields: ["name", "email", "subject", "message"],
        render: ({ values, onChange }) => (
          <Stack gap="md">
            <FieldInput
              name="name"
              label={labels.nameLabel ?? "Your Name"}
              required
              value={values.name}
              onChange={(v) => onChange({ name: v })}
              placeholder={labels.namePlaceholder ?? "Enter your name"}
            />
            <FieldInput
              name="email"
              type="email"
              label={labels.emailLabel ?? "Email"}
              required
              value={values.email}
              onChange={(v) => onChange({ email: v })}
              placeholder={labels.emailPlaceholder ?? "your@email.com"}
            />
            <FieldInput
              name="subject"
              label={labels.subjectLabel ?? "Subject"}
              required
              value={values.subject}
              onChange={(v) => onChange({ subject: v })}
              placeholder={labels.subjectPlaceholder ?? "How can we help?"}
            />
            <FieldTextarea
              name="message"
              label={labels.messageLabel ?? "Message"}
              required
              rows={5}
              value={values.message}
              onChange={(v) => onChange({ message: v })}
              placeholder={labels.messagePlaceholder ?? "Tell us more…"}
            />
          </Stack>
        ),
      },
    ],
    [labels],
  );

  const nav = useSectionFormNav(sections, form);
  const { shellCtx, validate: validateSchema } = useFormShellState(contactFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const handleSubmit = useCallback(
    async () => {
      /*
       * The hand-rolled `validate()` this replaces re-stated every rule the
       * schema already had — required-ness, the email regex, the 10-character
       * minimum — in a second place that could drift from it, and wrote the
       * results into a `useState` errors map instead of the form context
       * (Rule #9.2 and #9.4). `validateSchema` parses and pipes the issues to
       * the fields, which is the same check the submit gate now uses.
       */
      if (!validateSchema(form)) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await onSubmit(form);
        setSubmitted(true);
        setForm(INITIAL_FORM);
      } catch (_err) {
        void normalizeError(_err);
        setSubmitError(
          labels.errorGeneric ?? "Something went wrong. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, onSubmit, labels, validateSchema],
  );

  if (submitted) {
    return (
      <Div className={`text-center ${className}`} padding="y-3xl">
        <Div textSize="5xl" className="mb-4">✅</Div>
        <Heading level={2} className="mb-2">
          {labels.successTitle ?? "Message Sent!"}
        </Heading>
        <Text variant="secondary" className="mb-6">
          {labels.successDescription ?? "We'll get back to you shortly."}
        </Text>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSubmitted(false)}
        >
          {labels.sendAnotherButton ?? "Send another message"}
        </Button>
      </Div>
    );
  }

  return (
    <FormShellContext.Provider value={shellCtx}>
      <Stack gap="md" className={className}>
        {submitError && <Div className={CLS_ERROR_BANNER}>{submitError}</Div>}
        <FormErrorSummary />
        <SectionForm<ContactFormData>
          sections={sections}
          values={form}
          onChange={update}
          onSubmit={handleSubmit}
          schema={contactFormSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={isSubmitting}
          submitLabel={
            isSubmitting
              ? (labels.submittingButton ?? "Sending…")
              : (labels.submitButton ?? "Send Message")
          }
          /*
           * No pinned mobile bar. This form is embedded in a marketing page
           * beside other content rather than owning the screen, so a Save bar
           * fixed to the bottom of the viewport would follow the visitor
           * around the rest of the page.
           */
          bottomBar={false}
        />
      </Stack>
    </FormShellContext.Provider>
  );
}
