"use client"
import React, { useState } from "react";
import { Alert, Button, Div, Heading, Row, Stack, Text } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { applyZodIssues } from "../../../ui/forms/FormShell";
import { forgotPasswordSchema } from "../schemas";

export interface ForgotPasswordViewProps {
  onSubmit: (email: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  labels?: {
    title?: string;
    description?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    submitLabel?: string;
    submittingLabel?: string;
  };
  renderBackLink?: () => React.ReactNode;
  className?: string;
}

export function ForgotPasswordView({
  onSubmit,
  isLoading = false,
  error,
  success,
  labels = {},
  renderBackLink,
  className = "",
}: ForgotPasswordViewProps) {
  const [email, setEmail] = useState("");

  return (
    <Row className={`min-h-[60vh] ${className}`} align="center" justify="center" padding="x-md">
      <Stack className="max-w-md w-full" gap="lg">
        <Div className="text-center">
          <Heading level={1} className="font-extrabold" size="3xl">
            {labels.title ?? "Forgot Password"}
          </Heading>
          <Text className="mt-2 text-neutral-600 dark:text-neutral-400" size="sm">
            {labels.description ??
              "Enter your email and we'll send you a reset link."}
          </Text>
        </Div>

        {error && (
          <Alert variant="error" compact>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" compact>
            {success}
          </Alert>
        )}

        {!success && (
          <Form noValidate onSubmit={(e) => e.preventDefault()} spacing="md">
            {({ setFieldError, clearErrors }) => (
              <>
                <FieldInput
                  name="email"
                  label={labels.emailLabel ?? "Email address"}
                  type="email"
                  autoComplete="username"
                  required
                  placeholder={labels.emailPlaceholder ?? "you@example.com"}
                  value={email}
                  onChange={setEmail}
                />
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full"
                  onClick={async () => {
                    // toast-handled-by-hook: onSubmit prop's mutation hook owns toast UX
                    clearErrors();
                    const parsed = forgotPasswordSchema.safeParse({ email });
                    if (!parsed.success) return applyZodIssues(parsed.error.issues, setFieldError);
                    await onSubmit(parsed.data.email);
                  }}
                >
                  {isLoading
                    ? (labels.submittingLabel ?? "Sending…")
                    : (labels.submitLabel ?? "Send reset link")}
                </Button>
              </>
            )}
          </Form>
        )}

        {renderBackLink && (
          <Div textSize="sm" className="text-center">{renderBackLink()}</Div>
        )}
      </Stack>
    </Row>
  );
}
