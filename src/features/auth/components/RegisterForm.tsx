"use client"
import { normalizeError } from "../../../errors/normalize";
import React, { useState } from "react";
import { z } from "zod";
import { Alert, Div, Heading, Row, SiteMark, Stack, Text } from "../../../ui";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { registerSchema, registerPasswordSchema } from "../schemas";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import type { SectionDef } from "../../shell/SectionForm";

export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
}

export interface RegisterFormProps {
  onSubmit: (values: RegisterFormValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  labels?: {
    title?: string;
    subtitle?: string;
    displayNameLabel?: string;
    displayNamePlaceholder?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    passwordLabel?: string;
    passwordPlaceholder?: string;
    confirmPasswordLabel?: string;
    confirmPasswordPlaceholder?: string;
    acceptTermsLabel?: string;
    submitLabel?: string;
    submittingLabel?: string;
    passwordMismatch?: string;
  };
  renderSocialButtons?: () => React.ReactNode;
  renderLoginLink?: () => React.ReactNode;
  renderTermsLink?: () => React.ReactNode;
  renderPasswordStrength?: (password: string) => React.ReactNode;
  className?: string;
}

const registerClientSchema = registerSchema.extend({
  displayName: z.string().min(1, "Enter your name"),
  confirmPassword: registerPasswordSchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms to continue" }),
  }),
}).refine((v) => v.password === v.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

/*
 * Hand-authored rather than derived from the schema, which is the exception
 * here and not the rule.
 *
 * Two reasons the generator is the wrong tool for this one form. `labels` is a
 * PUBLIC prop of a published component — every string below is consumer
 * overridable, and moving them into schema annotations would silently drop that
 * override for anyone outside this repo. And `renderPasswordStrength` /
 * `renderTermsLink` are POSITIONAL slots: a meter that must sit under the
 * password box, a terms line that must sit under the checkbox. The generator
 * places fields, not arbitrary nodes between them.
 *
 * One section, `required: true` — so it renders open, without a collapse
 * control, i.e. exactly the flat list it has always been. A five-field signup
 * form has nothing to group; what it gains here is the error→section
 * attribution that makes `<FormErrorSummary>` able to jump to a field.
 */
function buildSections(
  labels: NonNullable<RegisterFormProps["labels"]>,
  renderPasswordStrength: RegisterFormProps["renderPasswordStrength"],
  renderTermsLink: RegisterFormProps["renderTermsLink"],
): SectionDef<RegisterFormValues>[] {
  return [
    {
      id: "account",
      label: labels.title ?? "Create Account",
      required: true,
      fields: ["displayName", "email", "password", "confirmPassword", "acceptTerms"],
      render: ({ values, onChange }) => (
        <>
          <FieldInput
            name="displayName"
            label={labels.displayNameLabel ?? "Full name"}
            type="text"
            autoComplete="name"
            required
            placeholder={labels.displayNamePlaceholder ?? "Your name"}
            value={values.displayName}
            onChange={(v) => onChange({ displayName: v })}
          />
          <FieldInput
            name="email"
            label={labels.emailLabel ?? "Email address"}
            type="email"
            autoComplete="username"
            required
            placeholder={labels.emailPlaceholder ?? "you@example.com"}
            value={values.email}
            onChange={(v) => onChange({ email: v })}
          />
          <Div>
            <FieldInput
              name="password"
              label={labels.passwordLabel ?? "Password"}
              type="password"
              autoComplete="new-password"
              required
              placeholder={labels.passwordPlaceholder ?? "••••••••"}
              value={values.password}
              onChange={(v) => onChange({ password: v })}
            />
            {renderPasswordStrength?.(values.password)}
          </Div>
          <FieldInput
            name="confirmPassword"
            label={labels.confirmPasswordLabel ?? "Confirm password"}
            type="password"
            autoComplete="new-password"
            required
            placeholder={labels.confirmPasswordPlaceholder ?? "••••••••"}
            value={values.confirmPassword}
            onChange={(v) => onChange({ confirmPassword: v })}
          />
          <FieldCheckbox
            name="acceptTerms"
            label={`${labels.acceptTermsLabel ?? "I accept the terms"}`}
            checked={values.acceptTerms}
            onChange={(c) => onChange({ acceptTerms: c })}
          />
          {renderTermsLink && (
            <Text size="xs" variant="secondary">
              {renderTermsLink()}
            </Text>
          )}
        </>
      ),
    },
  ];
}

export function RegisterForm({
  onSubmit,
  isLoading = false,
  error,
  success,
  labels = {},
  renderSocialButtons,
  renderLoginLink,
  renderTermsLink,
  renderPasswordStrength,
  className = "",
}: RegisterFormProps) {
  const [values, setValues] = useState<RegisterFormValues>({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    acceptTerms: false,
  });

  const sections = React.useMemo(
    () => buildSections(labels, renderPasswordStrength, renderTermsLink),
    [labels, renderPasswordStrength, renderTermsLink],
  );
  const nav = useSectionFormNav(sections, values, { scope: "auth:register" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(registerClientSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const handleSubmit = async () => {
    clearErrors();
    const parsed = registerClientSchema.safeParse(values);
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    try {
      await onSubmit(values);
    } catch (err) {
      /*
       * On a field, not a toast. "Registration failed" told the user nothing
       * and discarded whatever the caller actually objected to — a taken
       * email, a rejected password — which is the one thing they can act on.
       */
      const normalized = normalizeError(err);
      setFieldError("email", normalized.message || "Registration failed");
    }
  };

  return (
    <Row className={`min-h-[60vh] ${className}`} align="center" justify="center" padding="x-md">
      <Stack className="max-w-md w-full" gap="lg">
        <Div className="text-center">
          <Row justify="center" className="mb-3">
            <SiteMark size="lg" />
          </Row>
          <Heading level={1} className="font-extrabold" size="3xl">
            {labels.title ?? "Create Account"}
          </Heading>
          {(labels.subtitle || renderLoginLink) && (
            <Text className="mt-2 text-[var(--appkit-color-text-muted)]" size="sm">
              {labels.subtitle ?? "Already have an account?"}{" "}
              {renderLoginLink?.()}
            </Text>
          )}
        </Div>

        {success && (
          <Alert variant="success" compact>
            {success}
          </Alert>
        )}

        {error && (
          <Alert variant="error" compact>
            {error}
          </Alert>
        )}

        <FormShellContext.Provider value={shellCtx}>
          <FormErrorSummary />
          <SectionForm<RegisterFormValues>
            sections={sections}
            values={values}
            onChange={(partial) => setValues((prev) => Object.assign({}, prev, partial))}
            onSubmit={handleSubmit}
            schema={registerClientSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            isLoading={isLoading}
            submitLabel={
              isLoading
                ? (labels.submittingLabel ?? "Creating account…")
                : (labels.submitLabel ?? "Create account")
            }
          />
        </FormShellContext.Provider>

        {renderSocialButtons?.()}
      </Stack>
    </Row>
  );
}
