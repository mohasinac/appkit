"use client";

import React, { FormEvent, useCallback, useState } from "react";
import { Div, Heading, Text, Label, Span } from "@mohasinac/ui";

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  labels?: {
    title?: string;
    subtitle?: string;
    signInLink?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    passwordLabel?: string;
    passwordPlaceholder?: string;
    rememberMe?: string;
    forgotPasswordLabel?: string;
    submitLabel?: string;
    submittingLabel?: string;
    orSeparator?: string;
  };
  /** Render social login buttons (e.g. Google) */
  renderSocialButtons?: () => React.ReactNode;
  /** Render a "create account" link */
  renderCreateAccountLink?: () => React.ReactNode;
  /** Render forgot password link */
  renderForgotPasswordLink?: () => React.ReactNode;
  /** Render submit button */
  renderSubmitButton?: (
    loading: boolean,
    labels: LoginFormProps["labels"],
  ) => React.ReactNode;
  className?: string;
}

export function LoginForm({
  onSubmit,
  onGoogleLogin,
  isLoading = false,
  error,
  labels = {},
  renderSocialButtons,
  renderCreateAccountLink,
  renderForgotPasswordLink,
  renderSubmitButton,
  className = "",
}: LoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      await onSubmit(values);
    },
    [onSubmit, values],
  );

  return (
    <Div
      className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}
    >
      <Div className="max-w-md w-full space-y-6">
        {/* Header */}
        <Div className="text-center">
          <Heading level={1} className="text-3xl font-extrabold">
            {labels.title ?? "Sign In"}
          </Heading>
          {(labels.subtitle || renderCreateAccountLink) && (
            <Text className="mt-2 text-sm text-neutral-600">
              {labels.subtitle ?? "Or"} {renderCreateAccountLink?.()}
            </Text>
          )}
        </Div>

        {/* Error */}
        {error && (
          <Div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </Div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Div>
            <Label
              htmlFor="login-email"
              className="block text-sm font-medium mb-1"
            >
              {labels.emailLabel ?? "Email address"}
            </Label>
            <input
              id="login-email"
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
              htmlFor="login-password"
              className="block text-sm font-medium mb-1"
            >
              {labels.passwordLabel ?? "Password"}
            </Label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder={labels.passwordPlaceholder ?? "••••••••"}
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </Div>

          <Div className="flex items-center justify-between">
            <Div className="flex items-center gap-2">
              <input
                id="login-remember"
                type="checkbox"
                checked={values.rememberMe ?? false}
                onChange={(e) =>
                  setValues({ ...values, rememberMe: e.target.checked })
                }
                className="h-4 w-4 rounded border-neutral-300 accent-primary"
              />
              <Label htmlFor="login-remember" className="text-sm">
                {labels.rememberMe ?? "Remember me"}
              </Label>
            </Div>
            {renderForgotPasswordLink?.()}
          </Div>

          {renderSubmitButton ? (
            renderSubmitButton(isLoading, labels)
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {isLoading
                ? (labels.submittingLabel ?? "Signing in…")
                : (labels.submitLabel ?? "Sign in")}
            </button>
          )}
        </form>

        {/* Social buttons */}
        {renderSocialButtons?.()}
      </Div>
    </Div>
  );
}
