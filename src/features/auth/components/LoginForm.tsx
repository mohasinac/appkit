"use client"
import React, { useState } from "react";
import { Alert, Button, Div, Heading, Row, Text } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { applyZodIssues } from "../../../ui/forms/FormShell";
import { loginSchema } from "../schemas";
import { SocialAuthButtons } from "./SocialAuthButtons";

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
  renderSocialButtons?: () => React.ReactNode;
  renderCreateAccountLink?: () => React.ReactNode;
  renderForgotPasswordLink?: () => React.ReactNode;
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
  className = "",
}: LoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
    rememberMe: false,
  });

  return (
    <Div className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}>
      <Div className="max-w-md w-full space-y-6">
        <Div className="text-center">
          <Heading level={1} className="font-extrabold" size="3xl">
            {labels.title ?? "Sign In"}
          </Heading>
          {(labels.subtitle || renderCreateAccountLink) && (
            <Text className="mt-2" color="muted" size="sm">
              {labels.subtitle ?? "Or"} {renderCreateAccountLink?.()}
            </Text>
          )}
        </Div>

        {error && (
          <Alert variant="error" compact>
            {error}
          </Alert>
        )}

        <Form
          className="space-y-4"
          noValidate
          onSubmit={(e) => e.preventDefault()}
        >
          {({ setFieldError, clearErrors }) => (
            <>
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
              <FieldInput
                name="password"
                label={labels.passwordLabel ?? "Password"}
                type="password"
                autoComplete="current-password"
                required
                placeholder={labels.passwordPlaceholder ?? "••••••••"}
                value={values.password}
                onChange={(v) => setValues({ ...values, password: v })}
              />
              <Row justify="between">
                <FieldCheckbox
                  name="rememberMe"
                  label={labels.rememberMe ?? "Remember me"}
                  checked={values.rememberMe ?? false}
                  onChange={(c) => setValues({ ...values, rememberMe: c })}
                />
                {renderForgotPasswordLink?.()}
              </Row>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full"
                onClick={async () => {
                  // toast-handled-by-hook: onSubmit prop's mutation hook owns toast UX
                  clearErrors();
                  const parsed = loginSchema.safeParse(values);
                  if (!parsed.success) return applyZodIssues(parsed.error.issues, setFieldError);
                  await onSubmit(values);
                }}
              >
                {isLoading
                  ? (labels.submittingLabel ?? "Signing in…")
                  : (labels.submitLabel ?? "Sign in")}
              </Button>
            </>
          )}
        </Form>

        {onGoogleLogin && !renderSocialButtons ? (
          <SocialAuthButtons
            onGoogle={onGoogleLogin}
            disabled={isLoading}
            dividerLabel={labels.orSeparator ?? "Or continue with"}
            googleLabel="Sign in with Google"
          />
        ) : (
          renderSocialButtons?.()
        )}
      </Div>
    </Div>
  );
}
