"use client";

import React, { useState, useCallback } from "react";
import { Button, Div, Heading, Span, Text, Textarea } from "@mohasinac/ui";

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
      } catch {
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
      <Div className={`text-center py-12 ${className}`}>
        <Div className="text-5xl mb-4">✅</Div>
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
    <Div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
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
          className="w-full rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/20 transition"
        />
      ) : (
        <input
          id={id}
          type={id === "email" ? "email" : "text"}
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:ring-2 ring-primary/20 transition"
        />
      )}
      {errors[id] && <Span className="text-xs text-red-500">{errors[id]}</Span>}
    </Div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`space-y-4 ${className}`}
    >
      <Heading level={2} className="mb-6">
        {labels.title ?? "Send us a message"}
      </Heading>

      {submitError && (
        <Div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
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
    </form>
  );
}
