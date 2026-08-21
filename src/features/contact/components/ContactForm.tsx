"use client"
import { normalizeError } from "../../../errors/normalize";
import React, { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { Button, Div, Form, Heading, Input, Span, Stack, Text, Textarea } from "../../../ui";
import { useFormShellState, FormShellContext, FormErrorSummary } from "../../../ui/forms";

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const CLS_FIELD_ERROR = "text-error";
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
  const [errors, setErrors] = useState<
    Partial<Record<keyof ContactFormData, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { shellCtx, validate: validateSchema } = useFormShellState(contactFormSchema);

  useEffect(() => {
    validateSchema(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, validateSchema]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ContactFormData, string>> = {};
    if (!form.name.trim())
      newErrors.name = labels.validationRequired ?? "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = labels.validationEmail ?? "Valid email required";
    if (!form.subject.trim())
      newErrors.subject = labels.validationRequired ?? "Required";
    if (!form.message.trim() || form.message.length < 10)
      newErrors.message =
        labels.validationMessageTooShort ?? "Message too short";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
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
    [form, onSubmit, labels],
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

  const field = (
    id: keyof ContactFormData,
    label: string,
    placeholder: string,
    multiline?: boolean,
  ) => (
    <Stack gap="xs">
      <label
        htmlFor={id}
        className="text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text-muted)]"
      >
        {label}
      </label>
      {multiline ? (
        <Textarea
          id={id}
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          placeholder={placeholder}
          rows={5}
          className="w-full rounded-lg border border-neutral-200 border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] outline-none focus:ring-2 ring-primary/20 transition"
        />
      ) : (
        <Input
          id={id}
          type={id === "email" ? "email" : "text"}
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          placeholder={placeholder}
          className="h-10"
        />
      )}
      {errors[id] && <Span size="xs" className={CLS_FIELD_ERROR}>{errors[id]}</Span>}
    </Stack>
  );

  return (
    <FormShellContext.Provider value={shellCtx}>
    <Form
      onSubmit={handleSubmit}
      noValidate
      className={className}
      spacing="md"
    >
      <Heading level={2} className="mb-6">
        {labels.title ?? "Send us a message"}
      </Heading>

      {submitError && (
        <Div className={CLS_ERROR_BANNER}>
          {submitError}
        </Div>
      )}

      {field(
        "name",
        labels.nameLabel ?? "Your Name",
        labels.namePlaceholder ?? "Enter your name",
      )}
      {field(
        "email",
        labels.emailLabel ?? "Email",
        labels.emailPlaceholder ?? "your@email.com",
      )}
      {field(
        "subject",
        labels.subjectLabel ?? "Subject",
        labels.subjectPlaceholder ?? "How can we help?",
      )}
      {field(
        "message",
        labels.messageLabel ?? "Message",
        labels.messagePlaceholder ?? "Tell us more…",
        true,
      )}

      <FormErrorSummary />
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting
          ? (labels.submittingButton ?? "Sending…")
          : (labels.submitButton ?? "Send Message")}
      </Button>
    </Form>
    </FormShellContext.Provider>
  );
}
