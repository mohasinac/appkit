"use client"
import React, { FormEvent, useCallback, useState } from "react";
import { Alert, Div, Heading, Label, Text } from "../../../ui";

export interface ResetPasswordViewProps {
  /** OOB code from URL */
  oobCode: string;
  onSubmit: (oobCode: string, newPassword: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  labels?: {
    title?: string;
    description?: string;
    passwordLabel?: string;
    passwordPlaceholder?: string;
    confirmPasswordLabel?: string;
    confirmPasswordPlaceholder?: string;
    submitLabel?: string;
    submittingLabel?: string;
    passwordMismatch?: string;
  };
  renderLoginLink?: () => React.ReactNode;
  className?: string;
}

export function ResetPasswordView({
  oobCode,
  onSubmit,
  isLoading = false,
  error,
  success,
  labels = {},
  renderLoginLink,
  className = "",
}: ResetPasswordViewProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setValidationError(null);
      if (password !== confirm) {
        setValidationError(labels.passwordMismatch ?? "Passwords do not match");
        return;
      }
      await onSubmit(oobCode, password);
    },
    [oobCode, onSubmit, password, confirm, labels.passwordMismatch],
  );

  const displayError = error ?? validationError;

  return (
    <Div
      className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}
    >
      <Div className="max-w-md w-full space-y-6">
        <Div className="text-center">
          <Heading level={1} className="text-3xl font-extrabold">
            {labels.title ?? "Reset Password"}
          </Heading>
          {labels.description && (
            <Text className="mt-2 text-sm text-neutral-600 dark:text-zinc-400">
              {labels.description}
            </Text>
          )}
        </Div>

        {displayError && (
          <Alert variant="error" compact>
            {displayError}
          </Alert>
        )}

        {success ? (
          <Alert variant="success" compact>
            {success}
            {renderLoginLink && <Div className="mt-2">{renderLoginLink()}</Div>}
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Div>
              <Label
                htmlFor="rp-password"
                className="block text-sm font-medium mb-1"
              >
                {labels.passwordLabel ?? "New password"}
              </Label>
              <input
                id="rp-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder={labels.passwordPlaceholder ?? "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-zinc-900 dark:text-zinc-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Div>
            <Div>
              <Label
                htmlFor="rp-confirm"
                className="block text-sm font-medium mb-1"
              >
                {labels.confirmPasswordLabel ?? "Confirm new password"}
              </Label>
              <input
                id="rp-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder={labels.confirmPasswordPlaceholder ?? "••••••••"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-zinc-900 dark:text-zinc-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              {isLoading
                ? (labels.submittingLabel ?? "Resetting…")
                : (labels.submitLabel ?? "Reset password")}
            </button>
          </form>
        )}
      </Div>
    </Div>
  );
}
