"use client"
import React, { useState } from "react";
import { z } from "zod";
import { Alert, Button, Div, Heading, Text } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { applyZodIssues } from "../../../ui/forms/FormShell";
import { registerSchema } from "../schemas";

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
  confirmPassword: z.string().min(6),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms to continue" }),
  }),
}).refine((v) => v.password === v.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

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

  return (
    <Div className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}>
      <Div className="max-w-md w-full space-y-6">
        <Div className="text-center">
          <Heading level={1} className="font-extrabold" size="3xl">
            {labels.title ?? "Create Account"}
          </Heading>
          {(labels.subtitle || renderLoginLink) && (
            <Text className="mt-2 text-neutral-600 dark:text-zinc-400" size="sm">
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

        <Form className="space-y-4" noValidate onSubmit={(e) => e.preventDefault()}>
          {({ setFieldError, clearErrors }) => (
            <>
              <FieldInput
                name="displayName"
                label={labels.displayNameLabel ?? "Full name"}
                type="text"
                autoComplete="name"
                required
                placeholder={labels.displayNamePlaceholder ?? "Your name"}
                value={values.displayName}
                onChange={(v) => setValues({ ...values, displayName: v })}
              />
              <FieldInput
                name="email"
                label={labels.emailLabel ?? "Email address"}
                type="email"
                autoComplete="username"
                required
                placeholder={labels.emailPlaceholder ?? "you@example.com"}
                value={values.email}
                onChange={(v) => setValues({ ...values, email: v })}
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
                  onChange={(v) => setValues({ ...values, password: v })}
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
                onChange={(v) => setValues({ ...values, confirmPassword: v })}
              />
              <FieldCheckbox
                name="acceptTerms"
                label={`${labels.acceptTermsLabel ?? "I accept the terms"}`}
                checked={values.acceptTerms}
                onChange={(c) => setValues({ ...values, acceptTerms: c })}
              />
              {renderTermsLink && (
                <Text size="xs" variant="secondary">
                  {renderTermsLink()}
                </Text>
              )}
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full"
                onClick={async () => {
                  // toast-handled-by-hook: onSubmit prop's mutation hook owns toast UX
                  clearErrors();
                  const parsed = registerClientSchema.safeParse(values);
                  if (!parsed.success) return applyZodIssues(parsed.error.issues, setFieldError);
                  await onSubmit(values);
                }}
              >
                {isLoading
                  ? (labels.submittingLabel ?? "Creating account…")
                  : (labels.submitLabel ?? "Create account")}
              </Button>
            </>
          )}
        </Form>

        {renderSocialButtons?.()}
      </Div>
    </Div>
  );
}
