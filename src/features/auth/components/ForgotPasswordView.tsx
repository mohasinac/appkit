import React, { FormEvent, useCallback, useState } from "react";
import { Alert, Div, Heading, Label, Text } from "../../../ui";

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

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      await onSubmit(email);
    },
    [onSubmit, email],
  );

  return (
    <Div
      className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}
    >
      <Div className="max-w-md w-full space-y-6">
        <Div className="text-center">
          <Heading level={1} className="text-3xl font-extrabold">
            {labels.title ?? "Forgot Password"}
          </Heading>
          <Text className="mt-2 text-sm text-neutral-600">
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
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Div>
              <Label
                htmlFor="fp-email"
                className="block text-sm font-medium mb-1"
              >
                {labels.emailLabel ?? "Email address"}
              </Label>
              <input
                id="fp-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder={labels.emailPlaceholder ?? "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {isLoading
                ? (labels.submittingLabel ?? "Sending…")
                : (labels.submitLabel ?? "Send reset link")}
            </button>
          </form>
        )}

        {renderBackLink && (
          <Div className="text-center text-sm">{renderBackLink()}</Div>
        )}
      </Div>
    </Div>
  );
}
