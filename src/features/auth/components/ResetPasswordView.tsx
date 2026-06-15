"use client"
import React, { useState } from "react";
import { z } from "zod";
import { Alert, Button, Div, Heading, Stack, Text } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { applyZodIssues } from "../../../ui/forms/FormShell";

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

const resetClientSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6),
}).refine((v) => v.password === v.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

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
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <Div className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}>
      <Stack className="max-w-md w-full" gap="lg">
        <Div className="text-center">
          <Heading level={1} className="font-extrabold" size="3xl">
            {labels.title ?? "Reset Password"}
          </Heading>
          {labels.description && (
            <Text className="mt-2 text-neutral-600 dark:text-zinc-400" size="sm">
              {labels.description}
            </Text>
          )}
        </Div>

        {error && (
          <Alert variant="error" compact>
            {error}
          </Alert>
        )}

        {success ? (
          <Alert variant="success" compact>
            {success}
            {renderLoginLink && <Div className="mt-2">{renderLoginLink()}</Div>}
          </Alert>
        ) : (
          <Form className="space-y-4" noValidate onSubmit={(e) => e.preventDefault()}>
            {({ setFieldError, clearErrors }) => (
              <>
                <FieldInput
                  name="password"
                  label={labels.passwordLabel ?? "New password"}
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder={labels.passwordPlaceholder ?? "••••••••"}
                  value={password}
                  onChange={setPassword}
                />
                <FieldInput
                  name="confirmPassword"
                  label={labels.confirmPasswordLabel ?? "Confirm new password"}
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder={labels.confirmPasswordPlaceholder ?? "••••••••"}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full"
                  onClick={async () => {
                    // toast-handled-by-hook: onSubmit prop's mutation hook owns toast UX
                    clearErrors();
                    const parsed = resetClientSchema.safeParse({ password, confirmPassword });
                    if (!parsed.success) return applyZodIssues(parsed.error.issues, setFieldError);
                    await onSubmit(oobCode, parsed.data.password);
                  }}
                >
                  {isLoading
                    ? (labels.submittingLabel ?? "Resetting…")
                    : (labels.submitLabel ?? "Reset password")}
                </Button>
              </>
            )}
          </Form>
        )}
      </Stack>
    </Div>
  );
}
