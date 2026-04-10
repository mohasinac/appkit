"use client";

import React, { FormEvent, useCallback, useState } from "react";
import { Div, Heading, Label, Text } from "@mohasinac/ui";

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
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setValidationError(null);
      if (values.password !== values.confirmPassword) {
        setValidationError(labels.passwordMismatch ?? "Passwords do not match");
        return;
      }
      await onSubmit(values);
    },
    [onSubmit, values, labels.passwordMismatch],
  );

  const displayError = error ?? validationError;

  return (
    <Div
      className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}
    >
      <Div className="max-w-md w-full space-y-6">
        <Div className="text-center">
          <Heading level={1} className="text-3xl font-extrabold">
            {labels.title ?? "Create Account"}
          </Heading>
          {(labels.subtitle || renderLoginLink) && (
            <Text className="mt-2 text-sm text-neutral-600">
              {labels.subtitle ?? "Already have an account?"}{" "}
              {renderLoginLink?.()}
            </Text>
          )}
        </Div>

        {success && (
          <Div
            role="status"
            className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </Div>
        )}

        {displayError && (
          <Div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {displayError}
          </Div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Div>
            <Label
              htmlFor="reg-name"
              className="block text-sm font-medium mb-1"
            >
              {labels.displayNameLabel ?? "Full name"}
            </Label>
            <input
              id="reg-name"
              name="displayName"
              type="text"
              autoComplete="name"
              required
              placeholder={labels.displayNamePlaceholder ?? "Your name"}
              value={values.displayName}
              onChange={(e) =>
                setValues({ ...values, displayName: e.target.value })
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </Div>

          <Div>
            <Label
              htmlFor="reg-email"
              className="block text-sm font-medium mb-1"
            >
              {labels.emailLabel ?? "Email address"}
            </Label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder={labels.emailPlaceholder ?? "you@example.com"}
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </Div>

          <Div>
            <Label
              htmlFor="reg-password"
              className="block text-sm font-medium mb-1"
            >
              {labels.passwordLabel ?? "Password"}
            </Label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder={labels.passwordPlaceholder ?? "••••••••"}
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {renderPasswordStrength?.(values.password)}
          </Div>

          <Div>
            <Label
              htmlFor="reg-confirm"
              className="block text-sm font-medium mb-1"
            >
              {labels.confirmPasswordLabel ?? "Confirm password"}
            </Label>
            <input
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder={labels.confirmPasswordPlaceholder ?? "••••••••"}
              value={values.confirmPassword}
              onChange={(e) =>
                setValues({ ...values, confirmPassword: e.target.value })
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </Div>

          <Div className="flex items-start gap-2">
            <input
              id="reg-terms"
              type="checkbox"
              required
              checked={values.acceptTerms}
              onChange={(e) =>
                setValues({ ...values, acceptTerms: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-primary"
            />
            <Label htmlFor="reg-terms" className="text-sm leading-snug">
              {labels.acceptTermsLabel ?? "I accept the"} {renderTermsLink?.()}
            </Label>
          </Div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-primary/90 transition-colors"
          >
            {isLoading
              ? (labels.submittingLabel ?? "Creating account…")
              : (labels.submitLabel ?? "Create account")}
          </button>
        </form>

        {renderSocialButtons?.()}
      </Div>
    </Div>
  );
}
